import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  setAdminCustomClaim,
  setAdminCustomClaimByEmail,
  getAdminAuth,
  getAdminFirestore,
  isServiceAccountConfigured
} from "./server/firebaseAdmin.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy GenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

/* ==================================================
   ANTI-SPAM & REPORT VERIFICATION CONSTANTS & HELPERS
   ================================================== */

const RATE_LIMIT_CONFIG = {
  maxReportsPer24Hours: 5,
  maxAttemptsPerHour: 10,
  maxIdenticalContentPer24Hours: 3
};

// In-memory tracker for rate-limit attempts per hour per user
const userAttemptsPerHour: Record<string, number[]> = {};

function trackUserAttempt(uid: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const attempts = (userAttemptsPerHour[uid] || []).filter(t => t > oneHourAgo);
  attempts.push(now);
  userAttemptsPerHour[uid] = attempts;
  return attempts.length <= RATE_LIMIT_CONFIG.maxAttemptsPerHour;
}

function sanitizeInput(str: any): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/javascript:/gi, '')
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Extracts and verifies Firebase Auth ID token from Bearer header
 */
function isSaiVidyaDomain(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase().endsWith("@saividya.ac.in");
}

async function authenticateRequest(req: express.Request): Promise<{ uid: string; email?: string; emailVerified: boolean; name?: string; admin: boolean } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      name: (decoded as any).name || (decoded as any).display_name,
      admin: decoded.admin === true
    };
  } catch (err) {
    console.warn("Auth token verification error in server API:", err);
    return null;
  }
}

/* ==================================================
   1. STUDENT REPORT SUBMISSION API (RATE-LIMITED & FORCES PENDING)
   ================================================== */
app.post("/api/reports/submit", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({
      error: "Please sign in to submit a report."
    });
  }

  // Enforce Sai Vidya domain & email verification for non-admin accounts
  if (!user.admin && !isSaiVidyaDomain(user.email)) {
    return res.status(403).json({
      error: "CampusFind is restricted to verified Sai Vidya Institute of Technology students and staff with a @saividya.ac.in account."
    });
  }

  if (!user.admin && !user.emailVerified) {
    return res.status(403).json({
      error: "Email verification required. Please verify your @saividya.ac.in email address before submitting reports."
    });
  }

  // 1. Rate Limit Check: Attempts per hour
  if (!trackUserAttempt(user.uid)) {
    return res.status(429).json({
      error: "You have reached the report submission limit. Please try again later."
    });
  }

  const {
    type,
    title,
    description,
    category,
    locationName,
    locationId,
    location,
    dateOfIncident,
    date,
    imageUrls = [],
    secretIdentifyingDetails,
    currentPossession,
    contactPreference
  } = req.body || {};

  // 2. Validate Type & Required Fields
  const cleanType = type === 'found' ? 'found' : type === 'lost' ? 'lost' : null;
  if (!cleanType) {
    return res.status(400).json({ error: "Report type must be 'lost' or 'found'." });
  }

  const cleanTitle = sanitizeInput(title);
  const cleanDescription = sanitizeInput(description);
  const cleanLocationName = sanitizeInput(locationName || location || 'Campus Area');
  const cleanCategory = sanitizeInput(category || 'Other');
  const cleanDate = dateOfIncident || date || new Date().toISOString().split('T')[0];

  // 3. Length Validations
  if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 100) {
    return res.status(400).json({ error: "Title must be between 3 and 100 characters." });
  }
  if (!cleanDescription || cleanDescription.length < 10 || cleanDescription.length > 1500) {
    return res.status(400).json({ error: "Description must be between 10 and 1500 characters." });
  }
  if (!cleanLocationName || cleanLocationName.length < 2 || cleanLocationName.length > 100) {
    return res.status(400).json({ error: "Location must be between 2 and 100 characters." });
  }

  // 4. Validate Images
  if (!Array.isArray(imageUrls) || imageUrls.length > 3) {
    return res.status(400).json({ error: "You may attach at most 3 images." });
  }
  for (const img of imageUrls) {
    if (typeof img !== 'string' || (img.length > 5000000 && !img.startsWith('http'))) {
      return res.status(400).json({ error: "Please upload a supported image (JPG, PNG, WebP under 10MB)." });
    }
  }

  try {
    const db = getAdminFirestore();

    // 5. Check if user has active temporary reporting restriction
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    if (userData.reportingRestricted === true) {
      const restrictionUntil = userData.restrictionUntil ? new Date(userData.restrictionUntil) : null;
      if (!restrictionUntil || restrictionUntil.getTime() > Date.now()) {
        return res.status(403).json({
          error: "Your report submission access is temporarily restricted. Please contact the CampusFind administrator."
        });
      }
    }

    // 6. Server-side Rate Limiting: 24-hour limit & identical content check
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentReportsSnapshot = await db
      .collection("items")
      .where("reportedBy", "==", user.uid)
      .where("createdAt", ">=", oneDayAgo)
      .get();

    if (recentReportsSnapshot.size >= RATE_LIMIT_CONFIG.maxReportsPer24Hours) {
      return res.status(429).json({
        error: "You have reached the report submission limit. Please try again later."
      });
    }

    // Check for identical submissions within 24 hours
    let identicalCount = 0;
    const normalizedNew = `${cleanTitle.toLowerCase()} ${cleanDescription.toLowerCase()}`;
    recentReportsSnapshot.forEach((docSnap: any) => {
      const d = docSnap.data();
      const normExisting = `${(d.title || '').toLowerCase()} ${(d.description || '').toLowerCase()}`;
      if (normExisting === normalizedNew) {
        identicalCount++;
      }
    });

    if (identicalCount >= RATE_LIMIT_CONFIG.maxIdenticalContentPer24Hours) {
      return res.status(429).json({
        error: "You have reached the report submission limit. Please try again later."
      });
    }

    // 7. Duplicate Report Detection against existing items
    let isDuplicate = false;
    let duplicateWarning: string | null = null;
    let similarToItemId: string | null = null;
    let highestScore = 0;

    const candidateSnapshot = await db
      .collection("items")
      .where("type", "==", cleanType)
      .where("status", "in", ["approved", "pending", "open"])
      .limit(30)
      .get();

    const incomingTokens = tokenize(`${cleanTitle} ${cleanDescription} ${cleanLocationName}`);

    candidateSnapshot.forEach((docSnap: any) => {
      const cand = docSnap.data();
      if (cand.reportedBy === user.uid) return; // ignore own items
      const candTokens = tokenize(`${cand.title || ''} ${cand.description || ''} ${cand.locationName || ''}`);
      const jaccard = calculateJaccardSimilarity(incomingTokens, candTokens);

      let score = jaccard * 60;
      if (cand.category && cleanCategory && cand.category.toLowerCase() === cleanCategory.toLowerCase()) {
        score += 25;
      }
      if (cand.locationName && cleanLocationName && cand.locationName.toLowerCase() === cleanLocationName.toLowerCase()) {
        score += 15;
      }

      if (score >= 50 && score > highestScore) {
        highestScore = Math.round(score);
        isDuplicate = true;
        similarToItemId = docSnap.id;
        duplicateWarning = `Possible duplicate of existing report "${cand.title}" (${highestScore}% similarity)`;
      }
    });

    const now = new Date().toISOString();

    // 8. Create Item strictly with status = "pending"
    // Client cannot override status or moderation fields
    const newItemData = {
      type: cleanType,
      title: cleanTitle,
      description: cleanDescription,
      category: cleanCategory,
      locationId: locationId || 'campus',
      locationName: cleanLocationName,
      location: cleanLocationName,
      dateOfIncident: cleanDate,
      date: cleanDate,
      imageUrls,
      secretIdentifyingDetails: sanitizeInput(secretIdentifyingDetails) || undefined,
      currentPossession: cleanType === 'found' ? sanitizeInput(currentPossession || 'With finder') : undefined,
      contactPreference: contactPreference === 'email_relay' ? 'email_relay' : 'in_app',

      // STRICTLY ENFORCED STATUS
      status: "pending",

      // Identity references
      createdBy: user.uid,
      createdByName: userData.name || user.name || user.email?.split('@')[0] || 'Campus Student',
      createdByEmail: user.email || userData.email || '',
      reportedBy: user.uid,
      reporterName: userData.name || user.name || user.email?.split('@')[0] || 'Campus Student',
      reporterEmail: user.email || userData.email || '',
      reporterRole: userData.role || 'student',

      // Moderation controls (strictly null upon creation)
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      suspiciousReason: null,
      reportCount: 0,
      moderationNotes: null,

      // Anti-spam / Duplicate flags
      isDuplicate,
      duplicateWarning,
      similarToItemId,
      similarityScore: highestScore > 0 ? highestScore : null,
      flaggedForReview: isDuplicate,

      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await db.collection("items").add(newItemData);

    // Update user abuse / reporting stats in users/{uid}
    const currentSubmitted = typeof userData.reportsSubmitted === 'number' ? userData.reportsSubmitted : 0;
    await userRef.set(
      {
        reportsSubmitted: currentSubmitted + 1,
        lastReportAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    return res.status(201).json({
      success: true,
      id: docRef.id,
      status: "pending",
      duplicateWarning,
      message: "Report submitted successfully. Your report is currently under verification by the CampusFind admin."
    });
  } catch (err: any) {
    console.error("Error creating report on server:", err);
    return res.status(500).json({
      error: "Something went wrong submitting your report. Please try again."
    });
  }
});

/* ==================================================
   2. ADMIN REPORT MODERATION API
   ================================================== */
app.post("/api/admin/reports/moderate", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user || !user.admin) {
    return res.status(403).json({
      error: "Forbidden. Campus administrator privileges required."
    });
  }

  const {
    reportId,
    action,
    rejectionReason,
    suspiciousReason,
    moderationNotes
  } = req.body || {};

  if (!reportId || !action) {
    return res.status(400).json({ error: "Missing reportId or action parameter." });
  }

  const validActions = ['approve', 'reject', 'mark_suspicious', 'resolve'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: `Action must be one of: ${validActions.join(', ')}` });
  }

  let newStatus: string;
  if (action === 'approve') newStatus = 'approved';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'mark_suspicious') newStatus = 'suspicious';
  else newStatus = 'resolved';

  try {
    const db = getAdminFirestore();
    const itemRef = db.collection("items").doc(reportId);
    const itemSnap = await itemRef.get();

    if (!itemSnap.exists) {
      return res.status(404).json({ error: "Report listing not found." });
    }

    const itemData = itemSnap.data() || {};
    const previousStatus = itemData.status || 'pending';
    const now = new Date().toISOString();

    const updates: Record<string, any> = {
      status: newStatus,
      reviewedBy: user.uid,
      reviewedAt: now,
      updatedAt: now
    };

    if (action === 'reject') {
      updates.rejectionReason = sanitizeInput(rejectionReason || "Insufficient information");
    }
    if (action === 'mark_suspicious') {
      updates.suspiciousReason = sanitizeInput(suspiciousReason || "Flagged for moderation review");
    }
    if (moderationNotes) {
      updates.moderationNotes = sanitizeInput(moderationNotes);
    }

    await itemRef.update(updates);

    // Update author's moderation counters
    const authorUid = itemData.reportedBy || itemData.createdBy;
    if (authorUid) {
      try {
        const authorRef = db.collection("users").doc(authorUid);
        const authorSnap = await authorRef.get();
        const authorData = authorSnap.data() || {};

        const counterUpdates: Record<string, any> = {};
        if (action === 'approve') {
          counterUpdates.reportsApproved = (authorData.reportsApproved || 0) + 1;
        } else if (action === 'reject') {
          counterUpdates.reportsRejected = (authorData.reportsRejected || 0) + 1;
        } else if (action === 'mark_suspicious') {
          counterUpdates.reportsMarkedSuspicious = (authorData.reportsMarkedSuspicious || 0) + 1;
        }

        if (Object.keys(counterUpdates).length > 0) {
          await authorRef.set(counterUpdates, { merge: true });
        }

        // Send In-App Notification to Author
        let notifTitle = "Report Update";
        let notifMsg = `Your CampusFind report for "${itemData.title || 'Item'}" status is updated.`;

        if (action === 'approve') {
          notifTitle = "Report Approved";
          notifMsg = `Your report for "${itemData.title || 'Item'}" has been approved and is now visible on CampusFind.`;
        } else if (action === 'reject') {
          notifTitle = "Report Rejected";
          notifMsg = `Your report for "${itemData.title || 'Item'}" was rejected.${updates.rejectionReason ? ` Reason: ${updates.rejectionReason}` : ''}`;
        } else if (action === 'mark_suspicious') {
          notifTitle = "Report Under Review";
          notifMsg = `Your report for "${itemData.title || 'Item'}" requires additional review.`;
        } else if (action === 'resolve') {
          notifTitle = "Report Resolved";
          notifMsg = `Your CampusFind report for "${itemData.title || 'Item'}" has been marked as resolved.`;
        }

        await db.collection("notifications").add({
          userId: authorUid,
          title: notifTitle,
          message: notifMsg,
          type: "admin_announcement",
          relatedItemId: reportId,
          isRead: false,
          createdAt: now
        });
      } catch (authorErr) {
        console.warn("Could not update author counters or send notification:", authorErr);
      }
    }

    // Write to Admin Moderation Audit Log (PRD Section 19)
    await db.collection("adminAuditLogs").add({
      reportId,
      reportTitle: itemData.title || 'Report',
      adminUid: user.uid,
      adminEmail: user.email || 'admin@campusfind.edu',
      action: `${action}_report`,
      previousStatus,
      newStatus,
      reason: updates.rejectionReason || updates.suspiciousReason || null,
      moderationNotes: updates.moderationNotes || null,
      timestamp: now
    });

    return res.json({
      success: true,
      id: reportId,
      status: newStatus,
      action
    });
  } catch (err: any) {
    console.error("Moderation error:", err);
    return res.status(500).json({ error: err.message || "Failed to moderate report." });
  }
});

/* ==================================================
   3. ADMIN USER TEMPORARY RESTRICTION API
   ================================================== */
app.post("/api/admin/users/restrict", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user || !user.admin) {
    return res.status(403).json({ error: "Forbidden. Admin privileges required." });
  }

  const { userId, restricted = true, durationHours = 24, reason } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "Missing target userId." });
  }

  try {
    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(userId);
    const now = new Date();
    const restrictionUntil = restricted ? new Date(now.getTime() + durationHours * 3600 * 1000).toISOString() : null;

    await userRef.set(
      {
        reportingRestricted: Boolean(restricted),
        restrictionUntil,
        restrictionReason: reason ? sanitizeInput(reason) : null,
        updatedAt: now.toISOString()
      },
      { merge: true }
    );

    // Audit log
    await db.collection("adminAuditLogs").add({
      reportId: `user_${userId}`,
      reportTitle: `User Submission Access`,
      adminUid: user.uid,
      adminEmail: user.email || 'admin',
      action: restricted ? 'restrict_user' : 'unrestrict_user',
      reason: reason || null,
      timestamp: now.toISOString()
    });

    return res.json({
      success: true,
      userId,
      restricted: Boolean(restricted),
      restrictionUntil
    });
  } catch (err: any) {
    console.error("Error restricting user:", err);
    return res.status(500).json({ error: "Failed to update user restriction." });
  }
});

/* ==================================================
   4. USER REPORTING OTHER LISTINGS ("REPORT THIS LISTING")
   ================================================== */
app.post("/api/listings/report", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Please sign in to report a listing." });
  }

  if (!user.admin && !isSaiVidyaDomain(user.email)) {
    return res.status(403).json({
      error: "CampusFind is restricted to verified Sai Vidya Institute of Technology students and staff with a @saividya.ac.in account."
    });
  }

  if (!user.admin && !user.emailVerified) {
    return res.status(403).json({
      error: "Email verification required. Please verify your @saividya.ac.in email address."
    });
  }

  const { listingId, reason, description } = req.body || {};
  if (!listingId || !reason) {
    return res.status(400).json({ error: "Missing listingId or reason." });
  }

  try {
    const db = getAdminFirestore();
    const itemRef = db.collection("items").doc(listingId);
    const itemSnap = await itemRef.get();
    const itemData = itemSnap.data() || {};

    const now = new Date().toISOString();
    const listingReport = {
      listingId,
      listingTitle: itemData.title || "Campus Listing",
      reportedBy: user.uid,
      reporterName: user.name || user.email?.split('@')[0] || "Student",
      reporterEmail: user.email || "",
      reason: sanitizeInput(reason),
      description: sanitizeInput(description || ""),
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    const repRef = await db.collection("listingReports").add(listingReport);

    // Increment reportedCount on item
    if (itemSnap.exists) {
      const curCount = typeof itemData.reportCount === 'number' ? itemData.reportCount : (itemData.reportedCount || 0);
      await itemRef.update({
        reportCount: curCount + 1,
        reportedCount: curCount + 1,
        flaggedForReview: true,
        updatedAt: now
      });
    }

    return res.status(201).json({
      success: true,
      id: repRef.id,
      message: "Listing reported successfully. Campus administration will review this listing."
    });
  } catch (err: any) {
    console.error("Error reporting listing:", err);
    return res.status(500).json({ error: "Failed to submit listing report." });
  }
});

/* ==================================================
   5. ADMIN MODERATION SUMMARY & AUDIT LOGS
   ================================================== */
app.get("/api/admin/moderation/summary", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user || !user.admin) {
    return res.status(403).json({ error: "Admin access required." });
  }

  try {
    const db = getAdminFirestore();
    const [pendingSnap, suspiciousSnap, duplicatesSnap, flagsSnap] = await Promise.all([
      db.collection("items").where("status", "==", "pending").get(),
      db.collection("items").where("status", "==", "suspicious").get(),
      db.collection("items").where("isDuplicate", "==", true).get(),
      db.collection("listingReports").where("status", "==", "pending").get()
    ]);

    return res.json({
      pendingCount: pendingSnap.size,
      suspiciousCount: suspiciousSnap.size,
      duplicatesCount: duplicatesSnap.size,
      flagsCount: flagsSnap.size
    });
  } catch (err: any) {
    console.error("Summary count error:", err);
    return res.json({
      pendingCount: 0,
      suspiciousCount: 0,
      duplicatesCount: 0,
      flagsCount: 0
    });
  }
});

app.get("/api/admin/audit-logs", async (req, res) => {
  const user = await authenticateRequest(req);
  if (!user || !user.admin) {
    return res.status(403).json({ error: "Admin access required." });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("adminAuditLogs").orderBy("timestamp", "desc").limit(50).get();
    const logs: any[] = [];
    snap.forEach((docSnap: any) => {
      logs.push({ id: docSnap.id, ...docSnap.data() });
    });
    return res.json({ logs });
  } catch (err: any) {
    console.error("Audit log error:", err);
    return res.json({ logs: [] });
  }
});

// Admin status check endpoint
app.get("/api/admin/status", async (req, res) => {
  const hasServiceAccount = isServiceAccountConfigured();

  res.json({
    status: "ok",
    serviceAccountConfigured: hasServiceAccount,
    setupSecretConfigured: Boolean(process.env.ADMIN_SETUP_SECRET),
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "campusfind-215cb.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "campusfind-215cb"
  });
});

// Server-side secure admin custom claim setup endpoint
// Compatible with Vercel and Express
app.post("/api/admin/set-claim", async (req, res) => {
  const setupSecret = process.env.ADMIN_SETUP_SECRET || "campusfind_super_secret_setup_key_2026";
  const providedSecret = req.headers["x-admin-setup-secret"] || (req.query?.secret as string);
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
      // Strictly verify Firebase Custom Claim
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
});

// AI Suggestion endpoint (PRD Section 61: "When user uploads an image, AI can suggest Category, Title, Description")
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { imageBase64, imageMimeType, titleHint, categoryHint } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.status(200).json({
        suggestedTitle: titleHint || "Found Campus Item",
        suggestedCategory: categoryHint || "Other",
        suggestedDescription: titleHint ? `Reported item: ${titleHint}.` : "Found campus property.",
        confidence: 0.6,
        source: "fallback_no_key"
      });
    }

    const contents: any[] = [];

    if (imageBase64) {
      contents.push({
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: imageMimeType || 'image/jpeg'
        }
      });
    }

    const promptText = `Analyze this lost/found campus item photo or hints.
Context: College campus Lost & Found system (CampusFind).
User input hint: "${titleHint || 'Unknown item'}"
Suggested category hint: "${categoryHint || 'None'}"

Allowed Categories:
- Electronics
- Mobile Phones
- Earphones
- Wallet
- Keys
- ID Card
- Documents
- Books
- Bag
- Clothing
- Jewellery
- Accessories
- Water Bottle
- Laptop
- Charger
- Other

Output a concise JSON object with:
1. suggestedTitle: Clear, short title (e.g. "Black Apple AirPods Case", "Blue Hydro Flask", "Brown Leather Wallet").
2. suggestedCategory: Must strictly be one of the Allowed Categories.
3. suggestedDescription: 1-2 factual sentences describing recognizable physical features (color, brand, wear, distinct stickers/markings).
Do not guess sensitive private IDs or cards.`;

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING },
            suggestedCategory: { type: Type.STRING },
            suggestedDescription: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["suggestedTitle", "suggestedCategory", "suggestedDescription"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      suggestedTitle: parsed.suggestedTitle || titleHint || "Campus Item",
      suggestedCategory: parsed.suggestedCategory || categoryHint || "Other",
      suggestedDescription: parsed.suggestedDescription || "Campus belonging.",
      confidence: parsed.confidence || 0.9,
      source: "gemini"
    });
  } catch (error) {
    console.error("Gemini suggestion error:", error);
    // Return graceful fallback without crashing
    res.status(200).json({
      suggestedTitle: req.body?.titleHint || "Campus Item",
      suggestedCategory: req.body?.categoryHint || "Other",
      suggestedDescription: "Campus item uploaded.",
      confidence: 0.5,
      source: "error_fallback"
    });
  }
});

// AI Semantic Match analysis between reported item and candidate listings (PRD Section 22-25)
app.post("/api/ai/match", async (req, res) => {
  try {
    const { targetItem, candidateItems } = req.body;
    const ai = getAI();

    if (!ai || !candidateItems || candidateItems.length === 0) {
      return res.json({ matches: [] });
    }

    const itemsSummary = candidateItems.slice(0, 8).map((c: any) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      description: c.description,
      location: c.locationName,
      date: c.dateOfIncident
    }));

    const prompt = `Compare this target item against candidates in a campus Lost & Found database.
Target Item:
- Type: ${targetItem.type}
- Title: ${targetItem.title}
- Category: ${targetItem.category}
- Description: ${targetItem.description}
- Location: ${targetItem.locationName}
- Date: ${targetItem.dateOfIncident}

Candidates (${targetItem.type === 'lost' ? 'Found items' : 'Lost items'}):
${JSON.stringify(itemsSummary, null, 2)}

Provide an assessment of semantic similarity. Rate match score from 0 to 100 for each candidate.
Return JSON with matches array: [{ id: string, score: number, reasons: string[] }]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  reasons: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "score"]
              }
            }
          },
          required: ["matches"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"matches":[]}');
    res.json(parsed);
  } catch (error) {
    console.error("AI Match error:", error);
    res.json({ matches: [] });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusFind server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
