# CampusFind: Admin Authorization & Setup Guide

This document explains the security architecture of CampusFind and how to initialize your Firebase administrator account (`preethamirl@gmail.com`) using Firebase Authentication, Firebase Custom Claims `{ "admin": true }`, and the server-side Firebase Admin SDK endpoint `/api/admin/set-claim`.

---

## 1. Security Architecture Overview

1. **Custom Claim Authorization**:
   - Privileged administrative access relies strictly on the Firebase Auth Custom Claim:
     ```json
     {
       "admin": true
     }
     ```
   - This claim is embedded directly into the user's cryptographically signed Firebase ID token.
   - Admin status is **never** determined merely from an email address or client-side `localStorage`.
   - Firestore security rules strictly evaluate:
     ```
     function isAdmin() {
       return isAuthenticated() && request.auth.token.admin == true;
     }
     ```

2. **Authentication & Routing Flow**:
   - When a user signs in at `#login`, Firebase Authentication verifies their credentials.
   - The application immediately forces a refresh of the ID token (`user.getIdTokenResult(true)`).
   - The application checks `idTokenResult.claims.admin === true`.
   - **If `admin === true`**: The user is immediately redirected to `/admin` (`#admin`). The app strictly prevents redirecting this account to `/dashboard`.
   - **If normal student**: The user is redirected to `/dashboard` (`#dashboard`).
   - All public registrations through the website default strictly to `role: "student"`. Users cannot choose or escalate their role.

---

## 2. How to Run the Admin Setup Endpoint for Your User's UID

The server provides the endpoint `POST /api/admin/set-claim`. To grant custom claims, the Firebase Admin SDK requires credentials for your Firebase project (`campusfind-215cb`).

### Step 1: Obtain your Firebase Service Account Key
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **campusfind-215cb**.
3. Click the gear icon ⚙️ (Project settings) -> **Service accounts** tab.
4. Click **Generate new private key** and download the JSON file.

### Step 2: Run the Setup Endpoint

Choose whichever method is easiest for you:

#### Option A: Pass the Service Account directly in the curl command
You can send your user's UID and include the downloaded `serviceAccountKey.json`:

```bash
curl -X POST http://localhost:3000/api/admin/set-claim \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-secret: campusfind_super_secret_setup_key_2026" \
  -d '{
    "uid": "YOUR_FIREBASE_USER_UID",
    "admin": true,
    "serviceAccount": '"$(cat /path/to/serviceAccountKey.json)"'
  }'
```

*Replace `YOUR_FIREBASE_USER_UID` with your Firebase Authentication UID (found in Firebase Console -> Authentication -> Users, or in the app Profile screen).*

#### Option B: Place `serviceAccountKey.json` in the project root
Save the downloaded service account key as `serviceAccountKey.json` in the root folder of this project, then run:

```bash
curl -X POST http://localhost:3000/api/admin/set-claim \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-secret: campusfind_super_secret_setup_key_2026" \
  -d '{
    "uid": "YOUR_FIREBASE_USER_UID",
    "admin": true
  }'
```

*(You can also use `"email": "preethamirl@gmail.com"` instead of `"uid"` if you prefer).*

### Expected Successful Response
```json
{
  "success": true,
  "message": "Custom claim { admin: true } set successfully for user YOUR_FIREBASE_USER_UID.",
  "uid": "YOUR_FIREBASE_USER_UID",
  "claims": {
    "admin": true
  }
}
```

---

## 3. Verifying the Admin Redirection in the App

1. In the app, click **Sign Out** (if already logged in).
2. Sign in with **`preethamirl@gmail.com`**.
3. During sign-in, the app obtains the refreshed Firebase ID token containing `{ "admin": true }`.
4. The authentication flow detects `admin === true` and automatically redirects you directly to `/admin` (the Admin Console).
5. The account is never redirected to `/dashboard`.
6. Normal users continue to be routed to `/dashboard`.
