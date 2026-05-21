# Identity & Auth — Implementation Plan

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Mobile    │◄───────►│   Backend    │◄───────►│   Admin      │
│   (Expo)    │  HTTP   │   (Go/Gin)   │  HTTP   │   (Next.js)  │
│             │         │              │         │              │
│ Email OTP   │         │ Firebase     │         │ Email/Pass   │
│ Phone OTP   │         │ Admin SDK    │         │ Firebase     │
│ Firebase    │         │ Resend       │         │ Firebase     │
│ SDK         │         │ pgx/sqlc     │         │ SDK          │
└─────────────┘         └──────────────┘         └──────────────┘
```

**Auth strategy:**
- **Employees (mobile):** Email verified first (invitation check + 6-digit OTP via Resend), then phone becomes primary identity (Firebase Phone OTP). Both must be verified before signup completes.
- **Admins (dashboard):** Email/password via Firebase Auth. Provisioned by existing admin.
- **Backend:** Verifies Firebase ID tokens on every request via `firebase-admin-go`. 30-day session expiry enforced via `auth_time` claim.

---

## Mobile Auth Flow (Phone-First)

### Sequence Diagram

```
User opens app
  │
  ▼
/login
  │ Enter email
  │ POST /api/auth/check-invite?email=...
  │   → 404: "No invitation found. Contact your manager."
  │   → 200: { has_invitation: true, status: "pending"|"sent" }
  │
  ▼
POST /api/auth/send-email-otp { email }
  │ Backend: generates 6-digit code, stores in email_otps (10min TTL)
  │ Backend: sends OTP via Resend
  │
  ▼
/verify-email
  │ Enter 6-digit email OTP
  │ POST /api/auth/verify-email-otp { email, code }
  │   → Invalid/expired: 400 "Invalid or expired OTP"
  │   → Valid: 200 OK, OTP deleted from DB
  │
  ▼ Enter phone number
  │ Firebase Phone OTP: signInWithPhoneNumber()
  │ Backend receives Firebase ID token + phone number
  │
  ▼
/verify-phone
  │ Enter 6-digit phone OTP (Firebase handles verification)
  │ POST /api/auth/verify-phone-otp { phone_number }
  │   (with Firebase ID token in Authorization header)
  │ Backend:
  │   1. Verifies Firebase ID token → gets firebase_uid, email
  │   2. Checks user doesn't already exist
  │   3. Checks active invitation exists
  │   4. Creates user record (email_verified=true, phone_verified=true)
  │   5. Accepts invitation (status='accepted', accepted_at=NOW())
  │   6. Logs signup_completed event
  │   → 201 Created: { user: {...} }
  │
  ▼
/(app)/terms → Accept terms → /(app)/(tabs)/home
```

---

## Backend Endpoints (Mobile Auth)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/auth/check-invite?email=` | None | Check if email has active invitation |
| POST | `/api/auth/send-email-otp` | None | Generate + send email OTP via Resend |
| POST | `/api/auth/verify-email-otp` | None | Verify email OTP code |
| POST | `/api/auth/verify-phone-otp` | Firebase Bearer | Verify phone + create user |
| POST | `/api/auth/verify` | Firebase Bearer | Returning user login |

### Request/Response Specs

#### `GET /api/auth/check-invite`

```
Query: email=user@example.com

200 OK:
{
  "data": {
    "has_invitation": true,
    "status": "pending"
  }
}

404 Not Found:
{
  "error": "No invitation found for this email. Contact your manager.",
  "code": "no_invitation"
}
```

#### `POST /api/auth/send-email-otp`

```json
Body: { "email": "user@example.com" }

200 OK: { "status": "ok" }

404 Not Found: { "error": "No invitation found...", "code": "no_invitation" }
403 Forbidden: { "error": "Invitation is no longer active", "code": "invitation_not_active" }
500 Internal: { "error": "Failed to send OTP email", "code": "send_otp_failed" }
```

#### `POST /api/auth/verify-email-otp`

```json
Body: { "email": "user@example.com", "code": "123456" }

200 OK: { "status": "ok" }

400 Bad Request: { "error": "Invalid or expired OTP", "code": "invalid_otp" }
```

#### `POST /api/auth/verify-phone-otp`

```
Headers: Authorization: Bearer <firebase_id_token>
Body: { "phone_number": "+2376XXXXXXXX" }

201 Created:
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "email_verified": true,
    "firebase_uid": "...",
    "phone_number": "+2376XXXXXXXX",
    "phone_verified": true,
    "status": "active",
    "is_terms_accepted": false,
    "created_at": "2026-05-20T..."
  }
}

401 Unauthorized: { "error": "Firebase UID not found in context", "code": "unauthorized" }
403 Forbidden: { "error": "No active invitation found", "code": "no_invitation" }
409 Conflict: { "error": "User already exists with this email", "code": "user_exists" }
```

---

## Database Tables (Auth-Related)

### email_otps (new)

```sql
CREATE TABLE email_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- OTP codes expire after 10 minutes
- Indexed on `email` and `expires_at` for fast lookup and cleanup

### invitations (updated)

- Active statuses: `pending`, `sent` (both block re-invites)
- `idx_one_active_invitation_per_email` covers `('pending', 'sent')`

---

## Implementation Status

### ✅ Completed

| Item | Status |
|------|--------|
| Backend: Firebase Admin SDK integration | ✅ |
| Backend: Resend email client | ✅ |
| Backend: Firebase auth middleware (30-day expiry) | ✅ |
| Backend: Role middleware (RequireAdmin, RequireActiveUser) | ✅ |
| Backend: sqlc queries (users, admins, invitations, events) | ✅ |
| Backend: Admin invite flow (`POST /api/admin/invite`) | ✅ |
| Backend: `GET /api/auth/check-invite` | ✅ |
| Backend: `POST /api/auth/send-email-otp` | ✅ |
| Backend: `POST /api/auth/verify-email-otp` | ✅ |
| Backend: `POST /api/auth/verify-phone-otp` | ✅ |
| Backend: `email_otps` table migration | ✅ |
| Backend: `invitations.updated_at` migration | ✅ |
| Backend: `invitation_status` enum order fix | ✅ |
| Admin: Invite page (`/invite`) | ✅ |
| Admin: Users, requests, events, kill-switch pages | ✅ |
| Mobile: Route structure, types, providers | ✅ |

### ⏳ Pending

| Item | Priority |
|------|----------|
| Mobile: `/login` screen (email input + invitation check) | High |
| Mobile: `/verify-email` screen (email OTP input) | High |
| Mobile: `/verify-phone` screen (Firebase Phone OTP) | High |
| Mobile: Auth provider backend sync (`/api/users/me`) | High |
| Mobile: Auth guard on `AppLayout` | High |
| Mobile: TanStack Query hooks for auth endpoints | High |
| Mobile: Terms screen connected to backend | Medium |
| Mobile: Remove dead screens (`verify-otp`, `magic-link`) | Low |

---

## Mobile Route Structure (Target)

```
app/
├── _layout.tsx                    # Root layout (providers)
├── index.tsx                      # Auth-based redirect
└── (auth)/                        # Unauthenticated routes
    ├── _layout.tsx
    ├── login.tsx                  # Email input → check invitation → send OTP
    ├── verify-email.tsx           # Email OTP verification
    └── verify-phone.tsx           # Phone input + Firebase Phone OTP
└── (app)/                         # Authenticated routes
    ├── _layout.tsx                # Auth guard
    ├── (tabs)/
    │   ├── home.tsx
    │   ├── history.tsx
    │   └── profile.tsx
    ├── terms.tsx
    ├── request-advance.tsx
    └── survey.tsx
```

---

## Test Strategy

| Layer | Tool | What |
|-------|------|------|
| Backend unit | `go test` | OTP generation, middleware, handlers with mocked deps |
| Backend integration | `go test` + test DB | Full API flows with real DB, mock Firebase |
| Mobile unit | Jest + RNTL | Screen rendering, user interactions, API call mocking |
| Mobile E2E | Maestro | Full signup/login flows on simulator |
| Admin unit | Jest + RTL | Component rendering, state management |
| Admin E2E | Cypress | Admin login, invite, suspend flows |

**Rule:** Every handler has at least one test. Every screen has at least one test. No PR merges without passing tests.
