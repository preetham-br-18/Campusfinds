/**
 * CampusFind - Server-side Admin Custom Claim Assignment Script
 *
 * Requirements:
 * - Assigns { admin: true } custom claim to target Firebase UID: fhad6FYtPtUZSLplyEvn2242G7i2
 * - Preserves any existing claims by fetching first and merging: { ...existingClaims, admin: true }
 * - Uses service-account: campusfind-215cb-firebase-adminsdk-fbsvc-6131a063fb.json (or process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
 * - Prints exact success message: "SUCCESS: CampusFind admin claim assigned."
 *
 * Usage:
 *   node scripts/make-admin.js
 *   node scripts/make-admin.js [TARGET_UID] [PATH_TO_SERVICE_ACCOUNT]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default target UID requested
const DEFAULT_TARGET_UID = 'fhad6FYtPtUZSLplyEvn2242G7i2';
const targetUid = process.argv[2] || DEFAULT_TARGET_UID;

// Priority candidate paths for the service account file
const SPECIFIC_KEY_NAME = 'campusfind-215cb-firebase-adminsdk-fbsvc-6131a063fb.json';
const candidatePaths = [
  process.argv[3],
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.join(rootDir, SPECIFIC_KEY_NAME),
  path.join(__dirname, SPECIFIC_KEY_NAME),
  path.join(rootDir, 'serviceAccountKey.json'),
  path.join(__dirname, 'serviceAccountKey.json'),
].filter(Boolean);

function findFallbackKey(dir) {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const match = files.find(f => f.includes('firebase-adminsdk') && f.endsWith('.json'));
    return match ? path.join(dir, match) : null;
  } catch {
    return null;
  }
}

async function locateServiceAccount() {
  // 1. Check explicit file candidates
  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.private_key && parsed.client_email) {
          return { credentials: parsed, path: p };
        }
      } catch (err) {
        console.warn(`Could not parse JSON at ${p}:`, err.message);
      }
    }
  }

  // 2. Check wildcard fallback file in root
  const fallbackRoot = findFallbackKey(rootDir);
  if (fallbackRoot) {
    try {
      const parsed = JSON.parse(fs.readFileSync(fallbackRoot, 'utf-8'));
      if (parsed.private_key && parsed.client_email) {
        return { credentials: parsed, path: fallbackRoot };
      }
    } catch {}
  }

  // 3. Check environment variable containing JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      const parsed = JSON.parse(rawEnv);
      if (parsed.private_key && parsed.client_email) {
        return { credentials: parsed, path: 'process.env.FIREBASE_SERVICE_ACCOUNT_KEY' };
      }
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', e.message);
    }
  }

  return null;
}

async function run() {
  console.log('========================================================');
  console.log(' CampusFind - Firebase Admin Custom Claim Assignment');
  console.log('========================================================');
  console.log(`Target UID: ${targetUid}`);

  const serviceAccountInfo = await locateServiceAccount();

  if (!serviceAccountInfo) {
    console.error('\n[ERROR] Service account JSON file not found.');
    console.error(`Please place the file:\n  "${SPECIFIC_KEY_NAME}"\nin the project root folder: ${rootDir}\n`);
    console.error('Alternative: provide the path as an argument:');
    console.error(`  node scripts/make-admin.js ${targetUid} /path/to/${SPECIFIC_KEY_NAME}`);
    process.exit(1);
  }

  console.log(`Using service account: ${serviceAccountInfo.path}`);

  // Initialize Firebase Admin SDK
  let app;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    app = initializeApp({
      credential: cert(serviceAccountInfo.credentials),
      projectId: serviceAccountInfo.credentials.project_id || 'campusfind-215cb'
    });
  }

  // Compatibility helper matching requirement syntax: admin.auth().setCustomUserClaims(...)
  const admin = {
    auth: () => getAuth(app),
    firestore: () => getFirestore(app)
  };

  // 1. Fetch user to verify existence and retrieve existing custom claims
  let userRecord;
  try {
    userRecord = await admin.auth().getUser(targetUid);
    console.log(`Found user: ${userRecord.email || '(No email)'} (UID: ${userRecord.uid})`);
  } catch (userErr) {
    if (userErr.code === 'auth/user-not-found') {
      console.error(`\n[ERROR] User with UID "${targetUid}" was not found in Firebase Authentication.`);
      console.error('Please verify the UID in Firebase Console -> Authentication -> Users.');
      process.exit(1);
    }
    console.error('[ERROR] Failed to retrieve user:', userErr.message);
    process.exit(1);
  }

  // 2. Fetch existing claims first and merge (Requirement 9)
  const existingClaims = userRecord.customClaims || {};
  console.log('Existing custom claims:', JSON.stringify(existingClaims));

  const mergedClaims = {
    ...existingClaims,
    admin: true
  };

  // 3. Assign merged claims (Requirement 8)
  try {
    await admin.auth().setCustomUserClaims(targetUid, mergedClaims);
  } catch (claimErr) {
    console.error('[ERROR] Failed to assign custom claims:', claimErr.message);
    process.exit(1);
  }

  // 4. Update Firestore user document users/{uid} for consistent role sync
  try {
    const userDocRef = admin.firestore().collection('users').doc(targetUid);
    await userDocRef.set(
      {
        role: 'admin',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    console.log(`Synced Firestore doc users/${targetUid} -> role: "admin"`);
  } catch (fsErr) {
    console.warn('Note: Firestore doc update skipped:', fsErr.message);
  }

  // 5. Verify the updated claims
  const verifiedUser = await admin.auth().getUser(targetUid);

  console.log('\n--------------------------------------------------------');
  // Requirement 10: Print clear success message
  console.log('SUCCESS: CampusFind admin claim assigned.');
  console.log('--------------------------------------------------------');
  console.log('Assigned claims:', JSON.stringify(verifiedUser.customClaims, null, 2));
  console.log(`User Email:      ${verifiedUser.email}`);
  console.log(`User UID:        ${verifiedUser.uid}`);
  console.log('\nNEXT STEPS:');
  console.log('1. On CampusFind, sign in with this account.');
  console.log('2. The application forces an ID token refresh on sign-in:');
  console.log('   await user.getIdToken(true);');
  console.log('3. The claims.admin flag is verified, and the user is redirected directly to /admin.');
  console.log('========================================================\n');
}

run().catch((err) => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
