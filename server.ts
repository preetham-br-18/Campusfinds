import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  setAdminCustomClaim,
  setAdminCustomClaimByEmail,
  getAdminAuth,
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
