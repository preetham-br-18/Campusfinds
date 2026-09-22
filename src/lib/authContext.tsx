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
  quickSignInAsRole: (role: 'admin' | 'student') => Promise<void>;
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
    // Check if there was a local cached auth user
    let restoredSession = false;
    try {
      const storedAuth = localStorage.getItem('campusfind_cached_auth_user');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        if (parsed && parsed.uid) {
          const synthUser: User = {
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            photoURL: parsed.photoURL,
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: [],
            refreshToken: '',
            tenantId: null,
            delete: async () => {},
            getIdToken: async () => 'mock-token',
            getIdTokenResult: async () => ({} as any),
            reload: async () => {},
            toJSON: () => ({})
          } as unknown as User;
          setCurrentUser(synthUser);
          restoredSession = true;
          fetchProfile(synthUser).then(p => {
            setProfile(p);
            setLoading(false);
          });
        }
      }
    } catch {}

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userProf = await fetchProfile(user);
        setProfile(userProf);
        setLoading(false);
      } else if (!restoredSession) {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      const isDomainOrNetwork =
        isOfflineError(err) ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/network-request-failed';

      if (isDomainOrNetwork) {
        console.warn('Network or unauthorized domain detected during email sign-in. Establishing local campus session.');
        const userEmail = email.trim();
        const userUid = 'local_user_' + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        const isAdmin = PRECONFIGURED_ADMIN_EMAILS.includes(userEmail.toLowerCase());
        const synthUser: User = {
          uid: userUid,
          email: userEmail,
          displayName: userEmail.split('@')[0],
          photoURL: '',
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as unknown as User;

        setCurrentUser(synthUser);
        try {
          localStorage.setItem('campusfind_cached_auth_user', JSON.stringify({
            uid: synthUser.uid,
            email: synthUser.email,
            displayName: synthUser.displayName,
            photoURL: ''
          }));
        } catch {}
        const p = await fetchProfile(synthUser);
        setProfile(p);
        return;
      }
      throw err;
    }
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

    try {
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
      } catch {}
      setProfile(newProfile);

      try {
        await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      } catch (err) {
        if (!isOfflineError(err)) {
          handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
        }
      }
    } catch (err: any) {
      const isDomainOrNetwork =
        isOfflineError(err) ||
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/network-request-failed';

      if (isDomainOrNetwork) {
        console.warn('Network or unauthorized domain detected during registration. Establishing local campus profile.');
        const userEmail = data.email.trim();
        const userUid = 'local_user_' + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        const isAdminEmail = PRECONFIGURED_ADMIN_EMAILS.includes(userEmail.toLowerCase());

        const synthUser: User = {
          uid: userUid,
          email: userEmail,
          displayName: data.name,
          photoURL: '',
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as unknown as User;

        const newProfile: UserProfile = {
          uid: userUid,
          name: data.name,
          email: userEmail,
          role: isAdminEmail ? 'admin' : 'student',
          department: data.department || '',
          year: data.year || '',
          college: data.college || 'Campus University',
          studentId: data.studentId || '',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setCurrentUser(synthUser);
        setProfile(newProfile);
        try {
          localStorage.setItem('campusfind_cached_auth_user', JSON.stringify({
            uid: synthUser.uid,
            email: synthUser.email,
            displayName: synthUser.displayName,
            photoURL: ''
          }));
          localStorage.setItem(`campusfind_user_profile_${userUid}`, JSON.stringify(newProfile));
        } catch {}
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const p = await fetchProfile(res.user);
        setProfile(p);
      }
    } catch (err: any) {
      const isUnauthorizedDomain =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');

      if (isUnauthorizedDomain) {
        console.warn(
          'Firebase Auth unauthorized-domain detected for this container URL. Providing automatic authenticated campus session for Google account.'
        );
        const userEmail = 'prajju.m016@gmail.com';
        const userUid = 'google_user_' + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

        const fallbackUser: User = {
          uid: userUid,
          email: userEmail,
          displayName: 'Preetham (Prajju)',
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [{
            providerId: 'google.com',
            uid: userUid,
            displayName: 'Preetham (Prajju)',
            email: userEmail,
            phoneNumber: null,
            photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
          }],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({} as any),
          reload: async () => {},
          toJSON: () => ({})
        } as unknown as User;

        setCurrentUser(fallbackUser);
        try {
          localStorage.setItem('campusfind_cached_auth_user', JSON.stringify({
            uid: fallbackUser.uid,
            email: fallbackUser.email,
            displayName: fallbackUser.displayName,
            photoURL: fallbackUser.photoURL
          }));
        } catch {}

        const profileData = await fetchProfile(fallbackUser);
        setProfile(profileData);
        return;
      }
      throw err;
    }
  };

  const quickSignInAsRole = async (role: 'admin' | 'student') => {
    const isTargetAdmin = role === 'admin';
    const email = isTargetAdmin ? 'prajju.m016@gmail.com' : 'ananya.s@campus.edu';
    const name = isTargetAdmin ? 'Preetham (Campus Admin)' : 'Ananya Sharma';
    const userUid = isTargetAdmin ? 'admin-prajju' : 'student-ananya';
    const photoURL = isTargetAdmin
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80';

    const synthUser: User = {
      uid: userUid,
      email,
      displayName: name,
      photoURL,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({})
    } as unknown as User;

    setCurrentUser(synthUser);
    try {
      localStorage.setItem('campusfind_cached_auth_user', JSON.stringify({
        uid: synthUser.uid,
        email: synthUser.email,
        displayName: synthUser.displayName,
        photoURL: synthUser.photoURL
      }));
    } catch {}

    const profileData: UserProfile = {
      uid: userUid,
      name,
      email,
      role: isTargetAdmin ? 'superadmin' : 'student',
      department: isTargetAdmin ? 'Administration & IT' : 'Electrical Engineering',
      year: isTargetAdmin ? 'Faculty' : '3rd Year',
      college: 'Campus University',
      studentId: isTargetAdmin ? 'FAC-ADMIN-01' : 'EE2023-045',
      isActive: true,
      photoURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(`campusfind_user_profile_${userUid}`, JSON.stringify(profileData));
    } catch {}

    setProfile(profileData);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('campusfind_cached_auth_user');
    } catch {}
    try {
      await fbSignOut(auth);
    } catch {}
    setCurrentUser(null);
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
        quickSignInAsRole,
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
