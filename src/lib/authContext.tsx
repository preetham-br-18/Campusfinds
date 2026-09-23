import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, isOfflineError, OperationType } from './firebase';
import { UserProfile, UserRole } from '../types';

export interface RegistrationInput {
  email: string;
  pass: string;
  name: string;
  department: string;
  year: string;
  studentId: string;
  college?: string;
}

export interface AuthSuccessResult {
  user: User;
  role: UserRole;
  isAdmin: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEmailVerified: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<AuthSuccessResult>;
  registerWithEmail: (data: RegistrationInput) => Promise<AuthSuccessResult>;
  loginWithGoogle: () => Promise<AuthSuccessResult>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCustomClaims: () => Promise<boolean>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Translates Firebase Auth error codes into helpful messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/domain-restricted' || message.includes('restricted to verified Sai Vidya')) {
    return RESTRICTION_ERROR_MESSAGE;
  }
  if (code === 'auth/unauthorized-domain') {
    const currentDomain = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'current domain';
    return `Firebase Authentication is restricted on this domain (${currentDomain}). Please ensure "${currentDomain}" is added to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).`;
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This college email is already registered. Please sign in or reset your password.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please provide a valid @saividya.ac.in email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed sign-in attempts. Please wait a few moments and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This user account has been suspended by campus administration.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'The sign-in popup was closed before completion.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
  }
  return message || 'Authentication failed. Please check your network and try again.';
}

export const ALLOWED_CAMPUS_DOMAIN = 'saividya.ac.in';
export const RESTRICTION_ERROR_MESSAGE =
  'CampusFind is restricted to verified Sai Vidya Institute of Technology students and staff with a @saividya.ac.in account.';

/**
 * Case-insensitive domain verification for Sai Vidya institutional emails.
 */
export function isValidSaiVidyaEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith('@saividya.ac.in');
}

const CACHED_PROFILE_KEY = 'campusfind_current_profile';
const CACHED_CLAIMS_KEY = 'campusfind_current_claims';

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function getCachedAdminClaim(): boolean {
  try {
    return localStorage.getItem(CACHED_CLAIMS_KEY) === 'true';
  } catch {}
  return false;
}

function setCachedProfile(prof: UserProfile | null, isAdminClaim: boolean) {
  try {
    if (prof) {
      localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(prof));
      localStorage.setItem(CACHED_CLAIMS_KEY, isAdminClaim ? 'true' : 'false');
    } else {
      localStorage.removeItem(CACHED_PROFILE_KEY);
      localStorage.removeItem(CACHED_CLAIMS_KEY);
    }
  } catch {}
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cachedProf = getCachedProfile();
  const cachedAdmin = getCachedAdminClaim();

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProf);
  // If we already have a cached profile or auth.currentUser, don't show blocking loading screen
  const [loading, setLoading] = useState<boolean>(!cachedProf && !auth.currentUser);
  const [hasAdminClaim, setHasAdminClaim] = useState<boolean>(cachedAdmin);

  // Strictly inspect Firebase Auth Custom Claims from refreshed ID token
  const inspectCustomClaims = async (user: User, forceRefresh: boolean = false): Promise<boolean> => {
    try {
      if (forceRefresh) {
        await user.getIdToken(true);
      }
      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      const isAdminByClaim = idTokenResult.claims.admin === true;
      setHasAdminClaim(isAdminByClaim);
      return isAdminByClaim;
    } catch (e) {
      console.warn('Could not read custom claims from Firebase ID token:', e);
      return false;
    }
  };

  const fetchProfile = async (user: User, forceAdmin?: boolean): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const isAdminUser = forceAdmin ?? false;

    try {
      const snapshot = await withTimeout(getDoc(userRef), 1500, null as any);
      if (snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) {
        const data = snapshot.data() as UserProfile;

        // If user possesses verified admin custom claim, keep Firestore document role in sync
        if (isAdminUser && data.role !== 'admin') {
          data.role = 'admin';
          try {
            await updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() });
          } catch {
            // ignore
          }
        }
        return data;
      } else if (snapshot && typeof snapshot.exists === 'function' && !snapshot.exists()) {
        // Create initial profile if missing
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Campus User',
          email: user.email || '',
          college: 'Sai Vidya Institute of Technology',
          role: isAdminUser ? 'admin' : 'student',
          isActive: true,
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(userRef, newProfile);
        } catch {
          // ignore
        }
        return newProfile;
      }
    } catch (error) {
      if (!isOfflineError(error)) {
        console.warn('Could not fetch user document from Firestore:', error);
      }
    }

    // Check localStorage cached users before defaulting
    try {
      const rawUsers = localStorage.getItem('campusfind_users');
      if (rawUsers) {
        const parsed: UserProfile[] = JSON.parse(rawUsers);
        const match = parsed.find(u => u.uid === user.uid);
        if (match) return match;
      }
    } catch {}

    // Offline / fallback profile
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Campus User',
      email: user.email || '',
      college: 'Sai Vidya Institute of Technology',
      role: isAdminUser ? 'admin' : 'student',
      isActive: true,
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  useEffect(() => {
    // Fast safety fallback: If auth state check hasn't completed within 350ms,
    // unblock loading so the user is never stuck on "Checking campus session..."
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 350);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(safetyTimer);
      if (user) {
        // 1. Instant local token inspect (cached, in-memory, 0ms)
        let isAdminByClaim = false;
        try {
          const cachedTokenResult = await user.getIdTokenResult(false);
          isAdminByClaim = cachedTokenResult.claims.admin === true;
        } catch {
          // quiet fallback
        }

        // Domain restriction enforcement: Non-admins MUST have a verified @saividya.ac.in email
        const isAuthorizedEmail = isValidSaiVidyaEmail(user.email);

        if (!isAdminByClaim && !isAuthorizedEmail) {
          console.warn('Unauthorized domain detected in session. Signing out:', user.email);
          await fbSignOut(auth);
          setCurrentUser(null);
          setProfile(null);
          setHasAdminClaim(false);
          setCachedProfile(null, false);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        setHasAdminClaim(isAdminByClaim);

        // If we have cached profile matching this user, unblock loading immediately!
        const currentCached = getCachedProfile();
        if (currentCached && currentCached.uid === user.uid) {
          setProfile(currentCached);
          setLoading(false);
        }

        // 2. Fetch fresh profile and verify claims with a fast 1500ms timeout
        try {
          const userProf = await withTimeout(fetchProfile(user, isAdminByClaim), 1500, null);
          if (userProf) {
            setProfile(userProf);
            setCachedProfile(userProf, isAdminByClaim || userProf.role === 'admin' || userProf.role === 'superadmin');
          }
        } catch (err) {
          console.warn('Notice loading user profile on auth change:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
        setHasAdminClaim(false);
        setCachedProfile(null, false);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<AuthSuccessResult> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Firebase Authentication verifies the user normally
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const user = userCredential.user;

    // 2. Requirement 4 & 11: Force refresh the Firebase ID token using: await user.getIdToken(true)
    await user.getIdToken(true);

    // 3. Read the ID token result / custom claims
    const idTokenResult = await user.getIdTokenResult(true);

    // 4. Check admin custom claim strictly: if claims.admin === true
    const isAdminByClaim = idTokenResult.claims.admin === true;

    // 5. Strict Sai Vidya domain restriction for non-admins
    if (!isAdminByClaim && !isValidSaiVidyaEmail(user.email)) {
      await fbSignOut(auth);
      setCurrentUser(null);
      setProfile(null);
      setHasAdminClaim(false);
      setCachedProfile(null, false);
      const err: any = new Error(RESTRICTION_ERROR_MESSAGE);
      err.code = 'auth/domain-restricted';
      throw err;
    }

    setHasAdminClaim(isAdminByClaim);
    setCurrentUser(user);

    const userProfile = await fetchProfile(user, isAdminByClaim);
    setProfile(userProfile);
    setCachedProfile(userProfile, isAdminByClaim);

    return {
      user,
      role: isAdminByClaim ? 'admin' : (userProfile?.role || 'student'),
      isAdmin: isAdminByClaim
    };
  };

  /**
   * Registers a new student account:
   * - Enforces @saividya.ac.in domain restriction strictly
   * - Sets displayName
   * - Enforces role: "student" strictly (user cannot choose role)
   * - Creates Firestore document users/{uid}
   * - Sends email verification
   */
  const registerWithEmail = async (data: RegistrationInput): Promise<AuthSuccessResult> => {
    const cleanEmail = data.email.trim().toLowerCase();

    // Domain Restriction: Only @saividya.ac.in emails allowed
    if (!isValidSaiVidyaEmail(cleanEmail)) {
      const err: any = new Error(RESTRICTION_ERROR_MESSAGE);
      err.code = 'auth/domain-restricted';
      throw err;
    }

    // 1. Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.pass);
    const user = userCredential.user;

    // 2. Set Firebase Auth display name
    await fbUpdateProfile(user, { displayName: data.name.trim() });

    // 3. Send email verification
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send initial verification email:', e);
    }

    // 4. Create Firestore user document users/{uid}
    // Strict requirement: role must be 'student'
    const newProfile: UserProfile = {
      uid: user.uid,
      name: data.name.trim(),
      email: cleanEmail,
      department: data.department.trim(),
      year: data.year.trim(),
      studentId: data.studentId.trim(),
      college: 'Sai Vidya Institute of Technology',
      role: 'student', // Strict enforcement: normal registrations are always student
      isActive: true,
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, newProfile);

    setCurrentUser(user);
    setProfile(newProfile);
    setHasAdminClaim(false);
    setCachedProfile(newProfile, false);

    return {
      user,
      role: 'student',
      isAdmin: false
    };
  };

  const loginWithGoogle = async (): Promise<AuthSuccessResult> => {
    // 1. Perform Google sign-in using modular Firebase Web SDK
    const res = await signInWithPopup(auth, googleProvider);
    const user = res.user;

    // 2. Force refresh Firebase ID token to inspect custom claims
    await user.getIdToken(true);
    const idTokenResult = await user.getIdTokenResult(true);

    const isAdminByClaim = idTokenResult.claims.admin === true;
    const isAllowedDomain = isValidSaiVidyaEmail(user.email);

    // 3. Sai Vidya Domain Restriction:
    // If a Google account has an email outside @saividya.ac.in:
    // - Do not allow access to the application.
    // - Show a clear message: "CampusFind is restricted to verified Sai Vidya Institute of Technology students and staff with a @saividya.ac.in account."
    // - Sign the unauthorized Firebase user out.
    // - Do not create a student profile for the unauthorized account.
    if (!isAdminByClaim && !isAllowedDomain) {
      console.warn('Google account rejected due to domain restriction:', user.email);
      await fbSignOut(auth);
      setCurrentUser(null);
      setProfile(null);
      setHasAdminClaim(false);
      setCachedProfile(null, false);

      const err: any = new Error(RESTRICTION_ERROR_MESSAGE);
      err.code = 'auth/domain-restricted';
      throw err;
    }

    setHasAdminClaim(isAdminByClaim);
    setCurrentUser(user);

    // 4. Only create/fetch student profile for the authorized account
    const p = await fetchProfile(user, isAdminByClaim);
    setProfile(p);
    setCachedProfile(p, isAdminByClaim);

    return {
      user,
      role: isAdminByClaim ? 'admin' : (p?.role || 'student'),
      isAdmin: isAdminByClaim
    };
  };

  const logout = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
    setProfile(null);
    setHasAdminClaim(false);
    setCachedProfile(null, false);
  };

  /**
   * Refreshes the active user's ID token and re-evaluates custom claims.
   * Ensures newly assigned claims take effect without waiting for token expiration.
   */
  const refreshCustomClaims = async (): Promise<boolean> => {
    const user = auth.currentUser || currentUser;
    if (!user) {
      setHasAdminClaim(false);
      return false;
    }
    try {
      await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult(true);
      const isAdminByClaim = idTokenResult.claims.admin === true;
      setHasAdminClaim(isAdminByClaim);
      if (profile) {
        setProfile({
          ...profile,
          role: isAdminByClaim ? 'admin' : profile.role
        });
      }
      return isAdminByClaim;
    } catch (e) {
      console.warn('Failed to refresh custom claims from ID token:', e);
      return false;
    }
  };

  /**
   * Updates student profile fields (name, department, year, phone, etc.).
   * Strict requirement: role, uid, email, and isActive are sanitized away
   * so client updates cannot elevate roles.
   */
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    // Sanitize updates to prevent client role elevation
    const safeUpdates: Record<string, any> = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.uid;
    delete safeUpdates.email;
    delete safeUpdates.isActive;
    safeUpdates.updatedAt = new Date().toISOString();

    const userRef = doc(db, 'users', currentUser.uid);

    setProfile(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...safeUpdates };
      setCachedProfile(updated, hasAdminClaim);
      return updated;
    });

    try {
      await updateDoc(userRef, safeUpdates);
    } catch (err) {
      if (!isOfflineError(err)) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const isAdminUser = await inspectCustomClaims(currentUser, true);
      const p = await fetchProfile(currentUser, isAdminUser);
      setProfile(p);
    }
  };

  const sendVerificationEmail = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    } else {
      throw new Error('No user is currently signed in.');
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser(auth.currentUser);
      await refreshCustomClaims();
      await refreshProfile();
    }
  };

  const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
    const user = auth.currentUser || currentUser;
    if (!user) return null;
    if (typeof user.getIdToken === 'function') {
      return await user.getIdToken(forceRefresh);
    }
    if (auth.currentUser && typeof auth.currentUser.getIdToken === 'function') {
      return await auth.currentUser.getIdToken(forceRefresh);
    }
    return null;
  };

  const isEmailVerified = Boolean(currentUser?.emailVerified);
  // Authorization is strictly derived from the verified Firebase custom claim in the token
  const isAdmin = hasAdminClaim;
  const isSuperAdmin = hasAdminClaim && profile?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAdmin,
        isSuperAdmin,
        isEmailVerified,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateUserProfile,
        refreshProfile,
        refreshCustomClaims,
        sendVerificationEmail,
        sendPasswordReset,
        reloadUser,
        getIdToken
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
