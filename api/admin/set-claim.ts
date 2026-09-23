import type { Request, Response } from "express";
import {
  setAdminCustomClaim,
  setAdminCustomClaimByEmail,
  getAdminAuth
} from "../../server/firebaseAdmin";

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const setupSecret = process.env.ADMIN_SETUP_SECRET || "campusfind_super_secret_setup_key_2026";
  const providedSecret = req.headers["x-admin-setup-secret"] || req.query?.secret;
  const authHeader = req.headers["authorization"];

  let isAuthorized = false;

  // Option 1: Protected by Master Setup Secret
  if (providedSecret && providedSecret === setupSecret) {
    isAuthorized = true;
  }

  // Option 2: Protected by Bearer ID token of an existing Admin (Custom Claim admin === true)
  if (!isAuthorized && authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const auth = getAdminAuth();
      const decoded = await auth.verifyIdToken(idToken);
      if (decoded.admin === true) {
        isAuthorized = true;
      }
    } catch (err) {
      console.warn("Token verification failed in admin claim endpoint:", err);
    }
  }

  if (!isAuthorized) {
    return res.status(403).json({
      error: "Forbidden. Invalid or missing admin setup secret or admin authorization token.",
      hint: "Provide header 'x-admin-setup-secret: <ADMIN_SETUP_SECRET>' or authenticate with a Bearer ID token possessing the admin custom claim."
    });
  }

  const { uid, email, admin: makeAdmin = true, serviceAccount, serviceAccountKey } = req.body || {};
  const customCredentials = serviceAccount || serviceAccountKey;

  if (!uid && !email) {
    return res.status(400).json({
      error: "Missing parameters. Please provide 'uid' (recommended) or 'email' of the target user.",
      example: { uid: "FIREBASE_USER_UID", admin: true }
    });
  }

  try {
    let result;
    if (uid) {
      result = await setAdminCustomClaim(uid, Boolean(makeAdmin), customCredentials);
    } else {
      result = await setAdminCustomClaimByEmail(email, Boolean(makeAdmin), customCredentials);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Error setting custom claim:", err);
    return res.status(500).json({
      error: err.message || "Failed to set custom claim on user.",
      code: err.code || "unknown_error"
    });
  }
}
