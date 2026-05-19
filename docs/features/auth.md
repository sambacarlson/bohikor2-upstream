# Identity & Auth (Firebase) — Feature Spec

## Overview

All authentication uses Firebase Auth. Admins authenticate via email/password. Employees authenticate via passwordless Email OTP (magic link). The backend verifies Firebase ID tokens on every API request using `firebase-admin-go`. Admins are provisioned via invitation flow — no self-signup for admin accounts.

## User Types & Auth Methods

| Type | Auth Method | Provisioning |
| :--- | :--- | :--- |
| **Admin** | Firebase Email/Password | Admin invite → create user in Firebase → store in `admins` table |
| **Employee** | Firebase Email OTP (passwordless) | Admin sends invitation → employee signs up via mobile app |

## Firebase Project Setup

### 1. Create Firebase Project

```bash
# Go to https://console.firebase.google.com
# Create project: bohikor2-{env}
```

### 2. Enable Authentication Providers

In Firebase Console → Authentication → Sign-in method:

- **Email/Password**: Enable (for admin login)
- **Email link (passwordless)**: Enable (for employee OTP/magic link)

### 3. Generate Admin SDK Credentials

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Store as `FIREBASE_CREDENTIALS_JSON` env var (base64-encoded for deployment) or file path for local dev

### 4. Get Web App Config

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
```

### 5. Add Authorized Domains

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

### Employee Sign-Up (Email OTP / Magic Link)

**Location:** Mobile app (not yet built)

**Flow:**
1. Employee receives invitation email with link to download mobile app
2. Employee opens app, enters email
3. App calls `sendSignInLinkToEmail(auth, email, actionCodeSettings)` (Firebase SDK)
4. Employee receives email with magic link
5. Employee clicks link → opens mobile app (deep link / universal link)
6. App calls `isSignInWithEmailLink(auth, url)` then `signInWithEmailLink(auth, email, url)`
7. On success, backend receives Firebase ID token, creates `users` record (`email`, `firebase_uid`)
8. Employee is now authenticated

**API Endpoints Required:**
- `POST /api/auth/verify` — Verify Firebase ID token, create/return user record
- `POST /api/auth/terms` — Record terms acceptance (`is_terms_accepted = true`, `terms_accepted_at`, `terms_version`, `user_ip_at_consent`)

**Database:** `users` table

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
   - Logs event: re-enables Firebase user

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
- Axios interceptor in admin dashboard attaches fresh token on every request
- No passwords stored in database — Firebase manages all credentials

---

## Implementation Checklist

### Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Email/Password auth (admin)
- [ ] Enable Email link/passwordless auth (employee)
- [ ] Generate Admin SDK service account JSON
- [ ] Register web app and copy config to `admin/.env.local`
- [ ] Register mobile app and copy config to `mobile/.env`
- [ ] Add `FIREBASE_CREDENTIALS_JSON` to `backend/.env`
- [ ] Add authorized domains (localhost, Vercel, etc.)

### Backend (Go)
- [ ] Initialize `firebase-admin-go` with service account credentials
- [ ] Implement Firebase auth middleware (token verification)
- [ ] Implement `POST /api/auth/verify` — verify token, create/return user
- [ ] Implement `POST /api/admins/invite` — create invitation + Firebase user + send email via Resend
- [ ] Implement `PUT /api/users/:id/suspend` — suspend user + disable Firebase
- [ ] Implement `PUT /api/users/:id/activate` — activate user + re-enable Firebase
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
- [ ] Email OTP sign-up screen
- [ ] Magic link handling (deep link / universal link)
- [ ] Sign out button
- [ ] Firebase token attachment to API requests (Axios interceptor)
