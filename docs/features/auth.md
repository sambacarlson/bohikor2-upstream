# Identity & Auth (Firebase) — Feature Spec

## Overview

Authentication is phone-first. Employees use their phone number as their primary identity, verified via Firebase Phone OTP. Email is verified separately via a 6-digit OTP sent through Resend. The backend verifies Firebase ID tokens on every API request using `firebase-admin-go`. Admins authenticate via email/password. Admins are provisioned via invitation flow — no self-signup for admin accounts.

## User Types & Auth Methods

| Type | Auth Method | Provisioning |
| :--- | :--- | :--- |
| **Admin** | Firebase Email/Password | Admin invite → create user in Firebase → store in `admins` table |
| **Employee** | Firebase Phone OTP (primary identity) | Admin sends invitation → employee signs up via mobile app with email + phone |

## Firebase Project Setup

### 1. Create Firebase Project

```bash
# Go to https://console.firebase.google.com
# Create project: bohikor2-{env}
```

### 2. Enable Authentication Providers

In Firebase Console → Authentication → Sign-in method:

- **Email/Password**: Enable (for admin login)
- **Phone**: Enable (for employee phone OTP verification)

### 3. Configure App Attestation (Android)

For Firebase Phone Auth on Android, configure SafetyNet/Play Integrity:

1. Go to Google Cloud Console → APIs & Services
2. Enable SafetyNet API
3. Add SHA-256 certificate fingerprints to Firebase project settings
4. For Expo: run `eas credentials` to get fingerprints

### 4. Configure APNs (iOS)

For silent phone verification on iOS:

1. Upload APNs authentication key to Firebase Console
2. Enable Push Notifications capability in Xcode project

### 5. Generate Admin SDK Credentials

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Store as `FIREBASE_CREDENTIALS_JSON` env var (base64-encoded for deployment) or file path for local dev

### 6. Get Web App Config

1. Go to Project Settings → General → Your apps → Web app
2. Register app (nickname: `bohikor2-admin` or `bohikor2-mobile`)
3. Copy the config values into the appropriate `.env.local` files:

**Admin (`admin/.env.local`):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bohikor2-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=bohikor2-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bohikor2-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Mobile (`mobile/.env`):**
```
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=bohikor2-xxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=bohikor2-xxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=bohikor2-xxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

**Backend (`backend/.env`):**
```
FIREBASE_PROJECT_ID=bohikor2-xxx
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}
RESEND_API_KEY=re_xxx
```

### 7. Add Authorized Domains

In Firebase Console → Authentication → Settings → Authorized domains:

- `localhost` (development)
- Your Vercel deployment domain (e.g., `bohikor2-admin.vercel.app`)
- Your mobile app's domain if applicable

---

## Admin Auth Flow

### Admin Sign-In (Email/Password)

**Location:** `admin/src/app/(auth)/login/page.tsx`

**Flow:**
1. Admin enters email + password
2. Calls `signInWithEmailAndPassword(auth, email, password)`
3. On success, Firebase returns user session
4. `AuthProvider` detects user → `AuthGuard` allows access
5. Redirect to `/` (dashboard)
6. Axios interceptor attaches Firebase ID token to every API request: `Authorization: Bearer <id_token>`

**Backend verification:** Every protected endpoint calls `auth.Client.VerifyIDToken(ctx, idToken)` to validate the token, then checks the `admins` table for a matching `firebase_uid`.

### Admin Sign-Out

**Location:** `admin/src/components/sidebar.tsx`

**Flow:**
1. Admin clicks "Sign Out" in sidebar
2. Calls `auth.signOut()` (Firebase SDK)
3. Clears session → `AuthProvider` sets `user` to `null`
4. `AuthGuard` redirects to `/login`

### Admin Invite Flow (Provisioning New Admins)

**Not yet implemented.** This is the flow for adding new admins:

1. Existing admin enters email in admin dashboard
2. Backend creates invitation record in `invitations` table (`status = 'sent'`)
3. Backend creates Firebase user via Admin SDK:
   ```go
   user, err := authClient.CreateUser(ctx, &auth.UserToCreate{
       Email:    email,
       Password: randomPassword,
   })
   ```
4. Backend sends invitation email via Resend with temporary password or magic link
5. Admin clicks link, signs in, and is prompted to change password
6. On first successful login, backend creates `admins` record (`email`, `firebase_uid`)
7. Invitation status updated to `accepted` with `accepted_at` timestamp

**API Endpoints Required:**
- `POST /api/admins/invite` — Create invitation + Firebase user + send email
- `GET /api/admins` — List admins (authenticated)
- `DELETE /api/admins/:id` — Revoke admin access (deactivate Firebase user)

**Database:** `admins` table + `invitations` table

---

## Employee Auth Flow

### Employee Sign-Up (Phone-First: Email OTP → Phone OTP)

**Location:** Mobile app

**Flow:**

#### Step 1: Enter Email + Phone
1. Employee opens app, enters email and phone number
2. App calls `POST /api/auth/check-invitation` with email
3. Backend checks `invitations` table for matching email with `status = 'sent'`
4. If invited → proceed to Step 2. If not → show error, stay on screen

#### Step 2: Email OTP Verification
1. Backend generates 6-digit code, stores with 10-minute expiry, sends via Resend
2. Employee enters the 6-digit code from their email
3. App calls `POST /api/auth/verify-email-otp` with email + code
4. Backend validates code → returns email verification token/claim
5. On success, persist email-verified state locally (AsyncStorage)

#### Step 3: Phone OTP Verification (Firebase Phone Auth)
1. App calls Firebase `signInWithPhoneNumber(phoneNumber)`
2. Firebase sends SMS with OTP
3. Employee enters the 6-digit code from SMS
4. App calls Firebase `confirmationResult.confirm(code)`
5. Firebase returns user credential with ID token
6. App calls `POST /api/auth/complete-signup` with:
   - Firebase ID token
   - Email (verified in Step 2)
   - Phone number
7. Backend:
   - Verifies Firebase ID token
   - Checks email was previously verified (via session/token claim)
   - Creates `users` record (`email`, `email_verified = true`, `firebase_uid`, `phone_number`, `phone_verified = true`, `status = 'active'`)
   - Updates `invitations` record (`status = 'accepted'`, `accepted_at = NOW()`)
   - Logs event: `signup_completed`
   - Returns user object + auth token
8. Employee is redirected to main screen

**API Endpoints Required:**
- `POST /api/auth/check-invitation` — Check if email has pending invitation
- `POST /api/auth/send-email-otp` — Generate and send email OTP via Resend
- `POST /api/auth/verify-email-otp` — Verify email OTP code
- `POST /api/auth/complete-signup` — Finalize signup with Firebase token + email + phone
- `POST /api/auth/verify` — Verify Firebase ID token for returning users (login)
- `POST /api/auth/terms` — Record terms acceptance

**Database:** `users` table, `invitations` table

### Employee Login (Returning User)

**Location:** Mobile app `/(auth)/login`

**Flow:**
1. Employee enters phone number
2. Firebase Phone OTP flow (same as Step 3 of sign-up)
3. App calls `POST /api/auth/verify` with Firebase ID token
4. Backend:
   - Verifies token
   - Checks `auth_time` claim — if > 30 days since last auth, reject with `reauth_required`
   - Looks up user by `firebase_uid`
   - Checks `users.status` — if `suspended`, reject
   - Returns user object

### Employee Sign-Out (Mobile)

**Flow:**
1. Employee taps "Sign Out" in mobile app
2. Calls `auth.signOut()` (Firebase SDK)
3. Clears local session and cached data

---

## Backend Token Verification Middleware

**Not yet implemented.** All protected API routes must verify Firebase ID tokens.

**Implementation:**
```go
func FirebaseAuth(client *auth.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "missing authorization header",
            })
            return
        }

        token := strings.TrimPrefix(authHeader, "Bearer ")
        idToken, err := client.VerifyIDToken(c.Request.Context(), token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "invalid token",
            })
            return
        }

        // Check 30-day session expiry
        authTime := time.Unix(int64(idToken.Claims["auth_time"].(float64)), 0)
        if time.Since(authTime) > 30*24*time.Hour {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "session_expired",
                "reauth_required": true,
            })
            return
        }

        c.Set("firebase_uid", idToken.UID)
        c.Set("email", idToken.Claims["email"])
        c.Next()
    }
}
```

**After verification**, the handler checks whether the `firebase_uid` exists in `admins` or `users` table to determine role and permissions.

---

## User Suspension

**Location:** `admin/src/app/(dashboard)/users/page.tsx`

**Flow:**
1. Admin clicks dropdown menu on user row → "Suspend"
2. Calls `PUT /api/users/:id/suspend`
3. Backend:
   - Updates `users.status = 'suspended'` and `updated_at = NOW()`
   - Logs event: `user_suspended` in `events` table
   - Optionally disables Firebase user: `authClient.UpdateUser(ctx, firebaseUID, &auth.UserToUpdate{Disabled: true})`
4. Suspended user cannot authenticate — Firebase returns disabled account error
5. Admin can reverse with "Activate" → `PUT /api/users/:id/activate`
   - Sets `users.status = 'active'` and `updated_at = NOW()`
   - Logs event: `user_activated`
   - Re-enables Firebase user

**API Endpoints Required:**
- `PUT /api/users/:id/suspend` — Suspend user
- `PUT /api/users/:id/activate` — Activate user

**Database:** `users` table (`status` column), `events` table

---

## Security Rules

- All API endpoints (except `GET /health`) require valid Firebase ID token
- Admin-only endpoints verify `firebase_uid` exists in `admins` table
- Employee endpoints verify `firebase_uid` exists in `users` table and `status = 'active'`
- Suspended users are disabled at Firebase level — cannot obtain valid ID tokens
- Firebase ID tokens expire after 1 hour; client SDK auto-refreshes
- Sessions expire after 30 days (`auth_time` claim check); re-authentication required
- Axios interceptor in admin dashboard attaches fresh token on every request
- No passwords stored in database — Firebase manages all credentials
- Email OTP codes expire after 10 minutes, max 5 attempts before 15-minute lockout

---

## Implementation Checklist

### Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Email/Password auth (admin)
- [ ] Enable Phone auth (employee)
- [ ] Configure Android SafetyNet/Play Integrity
- [ ] Configure iOS APNs for silent verification
- [ ] Generate Admin SDK service account JSON
- [ ] Register web app and copy config to `admin/.env.local`
- [ ] Register mobile app and copy config to `mobile/.env`
- [ ] Add `FIREBASE_CREDENTIALS_JSON` to `backend/.env`
- [ ] Add authorized domains (localhost, Vercel, etc.)

### Resend Setup
- [ ] Create Resend account
- [ ] Verify sending domain
- [ ] Add `RESEND_API_KEY` to `backend/.env`

### Backend (Go)
- [ ] Initialize `firebase-admin-go` with service account credentials
- [ ] Initialize Resend client
- [ ] Implement Firebase auth middleware (token verification + 30-day expiry check)
- [ ] Implement `POST /api/auth/check-invitation` — check pending invitation
- [ ] Implement `POST /api/auth/send-email-otp` — generate + send email OTP
- [ ] Implement `POST /api/auth/verify-email-otp` — verify email OTP
- [ ] Implement `POST /api/auth/complete-signup` — create user, accept invitation
- [ ] Implement `POST /api/auth/verify` — verify token for returning users
- [ ] Implement `POST /api/auth/terms` — record terms acceptance
- [ ] Implement `PUT /api/users/:id/suspend` — suspend user + disable Firebase
- [ ] Implement `PUT /api/users/:id/activate` — activate user + re-enable Firebase
- [ ] Implement `POST /api/admins/invite` — create invitation + Firebase user + send email
- [ ] Implement `GET /api/admins` — list admins
- [ ] Implement `DELETE /api/admins/:id` — revoke admin
- [ ] Log all auth events to `events` table

### Admin Dashboard (Next.js)
- [x] Login page (email/password sign-in)
- [x] Auth guard (redirect to `/login` if unauthenticated)
- [x] Sign out (sidebar button)
- [x] User suspend/activate UI (users page)
- [ ] Admin invite UI (create new admins)
- [ ] Admin list page
- [ ] Handle Firebase token refresh in Axios interceptor (already implemented)

### Mobile App (Expo)
- [ ] Signup screen (email + phone input, invitation check)
- [ ] Email OTP verification screen
- [ ] Phone OTP verification screen (Firebase Phone Auth)
- [ ] Persist verification state (AsyncStorage)
- [ ] Login screen (phone number input)
- [ ] Complete signup flow → create user, accept invitation
- [ ] Terms acceptance screen
- [ ] Sign out button
- [ ] Firebase token attachment to API requests (Axios interceptor)
