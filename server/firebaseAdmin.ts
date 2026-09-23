import { initializeApp, getApps, cert, App, deleteApp } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

let adminAppInstance: App | null = null;
let hasConfiguredCredentials = false;

const SPECIFIC_KEY_FILE = "campusfind-215cb-firebase-adminsdk-fbsvc-6131a063fb.json";

export function isServiceAccountConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return true;
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) return true;
  if (fs.existsSync(path.join(process.cwd(), SPECIFIC_KEY_FILE))) return true;
  const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
  return fs.existsSync(keyPath);
}

export function getFirebaseAdmin(customCredentials?: any): App {
  // If custom credentials supplied and current app didn't have credentials, reset app
  if (customCredentials) {
    let parsedCreds: any = customCredentials;
    if (typeof customCredentials === "string") {
      try {
        if (fs.existsSync(customCredentials)) {
          parsedCreds = JSON.parse(fs.readFileSync(customCredentials, "utf-8"));
        } else {
          parsedCreds = JSON.parse(customCredentials);
        }
      } catch (err) {
        console.warn("Failed to parse provided custom credentials:", err);
      }
    }

    if (parsedCreds && parsedCreds.private_key) {
      const existing = getApps();
      if (existing.length > 0) {
        try {
          deleteApp(existing[0]);
        } catch {
          // ignore
        }
      }
      adminAppInstance = initializeApp({
        credential: cert(parsedCreds),
        projectId: parsedCreds.project_id || "campusfind-215cb"
      });
      hasConfiguredCredentials = true;
      return adminAppInstance;
    }
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && hasConfiguredCredentials) {
    adminAppInstance = existingApps[0];
    return adminAppInstance;
  }

  // Check candidate service account files in cwd
  const candidateKeyFiles = [
    path.join(process.cwd(), SPECIFIC_KEY_FILE),
    path.join(process.cwd(), "scripts", SPECIFIC_KEY_FILE),
    path.join(process.cwd(), "serviceAccountKey.json"),
    path.join(process.cwd(), "scripts", "serviceAccountKey.json")
  ];

  for (const keyPath of candidateKeyFiles) {
    if (fs.existsSync(keyPath)) {
      try {
        const raw = fs.readFileSync(keyPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.private_key && parsed.client_email) {
          if (existingApps.length > 0) {
            try { deleteApp(existingApps[0]); } catch {}
          }
          adminAppInstance = initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || "campusfind-215cb"
          });
          hasConfiguredCredentials = true;
          return adminAppInstance;
        }
      } catch (e) {
        console.warn(`Failed to load ${keyPath} from disk:`, e);
      }
    }
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "campusfind-215cb";

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (existingApps.length > 0) {
        try { deleteApp(existingApps[0]); } catch {}
      }
      adminAppInstance = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId
      });
      hasConfiguredCredentials = true;
      return adminAppInstance;
    } catch (e) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e);
    }
  }

  if (clientEmail && privateKey) {
    // Handle escaped newlines in environment variable
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    try {
      if (existingApps.length > 0) {
        try { deleteApp(existingApps[0]); } catch {}
      }
      adminAppInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
        projectId
      });
      hasConfiguredCredentials = true;
      return adminAppInstance;
    } catch (e) {
      console.warn("Failed to initialize Firebase Admin with individual credentials:", e);
    }
  }

  if (existingApps.length > 0) {
    adminAppInstance = existingApps[0];
    return adminAppInstance;
  }

  // Fallback to project ID default initialization
  try {
    adminAppInstance = initializeApp({
      projectId
    });
    hasConfiguredCredentials = false;
    return adminAppInstance;
  } catch (e) {
    console.warn("Firebase Admin initialized without service account:", e);
    const apps = getApps();
    if (apps.length > 0) {
      adminAppInstance = apps[0];
      return adminAppInstance;
    }
    throw e;
  }
}

export function getAdminAuth(customCredentials?: any): Auth {
  const app = getFirebaseAdmin(customCredentials);
  return getAuth(app);
}

export function getAdminFirestore(customCredentials?: any): Firestore {
  const app = getFirebaseAdmin(customCredentials);
  return getFirestore(app);
}

export interface SetAdminClaimResult {
  success: boolean;
  uid: string;
  email?: string;
  admin: boolean;
  claims: {
    admin: boolean;
  };
  message: string;
}

/**
 * Assigns or revokes { admin: true } custom claims on Firebase Auth
 * and updates Firestore document users/{uid} accordingly.
 */
export async function setAdminCustomClaim(
  targetUid: string,
  isAdmin: boolean = true,
  customCredentials?: any
): Promise<SetAdminClaimResult> {
  const cleanUid = targetUid.trim();
  if (!cleanUid) {
    throw new Error("Target UID cannot be empty.");
  }

  const auth = getAdminAuth(customCredentials);
  const db = getAdminFirestore(customCredentials);

  let userEmail: string | undefined;
  let existingClaims: Record<string, any> = {};
  try {
    const user = await auth.getUser(cleanUid);
    userEmail = user.email;
    existingClaims = user.customClaims || {};
  } catch (err: any) {
    console.warn(`Note: Could not look up user email for UID ${cleanUid} before setting claims:`, err.message);
  }

  try {
    // Set Firebase Custom Claims: { ...existingClaims, admin: isAdmin }
    await auth.setCustomUserClaims(cleanUid, {
      ...existingClaims,
      admin: isAdmin
    });
  } catch (err: any) {
    if (
      err.message?.includes("identitytoolkit.googleapis.com") ||
      err.code === "auth/internal-error" ||
      err.code === "auth/invalid-credential"
    ) {
      throw new Error(
        `Firebase Admin requires the Service Account key for project "campusfind-215cb" to set Custom Claims. ` +
        `Please ensure campusfind-215cb-firebase-adminsdk-fbsvc-6131a063fb.json or serviceAccountKey.json is placed in the project root, ` +
        `or set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable, or pass {"serviceAccount": {...}} in the request body.`
      );
    }
    throw err;
  }

  // Update corresponding Firestore users/{uid} document
  try {
    const userRef = db.collection("users").doc(cleanUid);
    await userRef.set(
      {
        role: isAdmin ? "admin" : "student",
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (firestoreErr) {
    console.warn("Could not update Firestore user document (custom claims were still assigned):", firestoreErr);
  }

  return {
    success: true,
    uid: cleanUid,
    email: userEmail,
    admin: isAdmin,
    claims: {
      admin: isAdmin
    },
    message: `Firebase custom claim { admin: ${isAdmin} } successfully assigned to UID: ${cleanUid}${userEmail ? ` (${userEmail})` : ""}.`
  };
}

/**
 * Assigns admin privileges to a user by email address.
 */
export async function setAdminCustomClaimByEmail(
  email: string,
  isAdmin: boolean = true,
  customCredentials?: any
): Promise<SetAdminClaimResult> {
  const auth = getAdminAuth(customCredentials);
  const cleanEmail = email.trim().toLowerCase();
  const user = await auth.getUserByEmail(cleanEmail);
  return setAdminCustomClaim(user.uid, isAdmin, customCredentials);
}
