import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, isOfflineError, OperationType } from './firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (data: {
    email: string;
    pass: string;
    name: string;
    department?: string;
    year?: string;
    college?: string;
    studentId?: string;
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin emails (including system user)
const PRECONFIGURED_ADMIN_EMAILS = [
  'prajju.m016@gmail.com',
  'admin@campusfind.edu',
  'admin@college.edu'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (user: User): Promise<UserProfile | null> => {
    const cacheKey = `campusfind_user_profile_${user.uid}`;
    let cachedProfile: UserProfile | null = null;
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedProfile = JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        // Check if user's email is in preconfigured admins to elevate
        const isAdminEmail = user.email && PRECONFIGURED_ADMIN_EMAILS.includes(user.email.toLowerCase());
        if (isAdminEmail && data.role === 'student') {
          data.role = 'admin';
          try {
            await updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() });
          } catch {
            // offline ignore
          }
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // ignore
        }
        return data;
      } else {
        // First-time profile creation (e.g. from Google login)
        const isAdminEmail = user.email && PRECONFIGURED_ADMIN_EMAILS.includes(user.email.toLowerCase());
        const newProfile: UserProfile = cachedProfile || {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Campus User',
          email: user.email || '',
          role: isAdminEmail ? 'admin' : 'student',
          isActive: true,
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(userRef, newProfile);
        } catch {
          // offline ignore
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(newProfile));
        } catch {
          // ignore
        }
        return newProfile;
      }
    } catch (error) {
      const isOffline = isOfflineError(error);
      if (isOffline) {
        console.warn('Firestore is currently offline. Operating in reliable local-storage mode for user profile.');
      } else {
        console.warn('Notice when fetching user profile, using local fallback:', error);
      }

      if (cachedProfile) {
        return cachedProfile;
      }

      // Fallback profile
      const isAdminEmail = user.email && PRECONFIGURED_ADMIN_EMAILS.includes(user.email.toLowerCase());
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Campus User',
        email: user.email || '',
        role: isAdminEmail ? 'admin' : 'student',
        isActive: true,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallbackProfile));
      } catch {
        // ignore
      }
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userProf = await fetchProfile(user);
        setProfile(userProf);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const registerWithEmail = async (data: {
    email: string;
    pass: string;
    name: string;
    department?: string;
    year?: string;
    college?: string;
    studentId?: string;
  }) => {
    // Check college domain restrictions if set in settings
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        if (settings.allowedDomain && settings.allowedDomain.trim() !== '') {
          const requiredDomain = settings.allowedDomain.trim().toLowerCase().replace(/^@/, '');
          const userDomain = data.email.split('@')[1]?.toLowerCase();
          if (userDomain !== requiredDomain) {
            throw new Error(`Only email addresses ending with @${requiredDomain} are allowed to register for this campus.`);
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('allowed to register')) {
        throw e;
      }
      // Continue if settings not found or offline
    }

    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.pass);
    await fbUpdateProfile(cred.user, { displayName: data.name });

    const isAdminEmail = PRECONFIGURED_ADMIN_EMAILS.includes(data.email.toLowerCase());
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      name: data.name,
      email: data.email.trim(),
      role: isAdminEmail ? 'admin' : 'student',
      department: data.department || '',
      year: data.year || '',
      college: data.college || 'Campus University',
      studentId: data.studentId || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cacheKey = `campusfind_user_profile_${cred.user.uid}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newProfile));
    } catch {
      // ignore
    }
    setProfile(newProfile);

    try {
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    } catch (err) {
      if (!isOfflineError(err)) {
        handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
      }
    }
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      const p = await fetchProfile(res.user);
      setProfile(p);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setProfile(null);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const cacheKey = `campusfind_user_profile_${currentUser.uid}`;
    const userRef = doc(db, 'users', currentUser.uid);
    const updated = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    setProfile(prev => {
      const next = prev ? { ...prev, ...updated } : ({ uid: currentUser.uid, ...updated } as UserProfile);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    try {
      await updateDoc(userRef, updated);
    } catch (err) {
      if (!isOfflineError(err)) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const p = await fetchProfile(currentUser);
      setProfile(p);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isSuperAdmin = profile?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAdmin,
        isSuperAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateUserProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
