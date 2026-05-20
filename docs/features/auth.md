# Identity & Auth — Implementation Plan

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Mobile    │◄───────►│   Backend    │◄───────►│   Admin      │
│   (Expo)    │  HTTP   │   (Go/Gin)   │  HTTP   │   (Next.js)  │
│             │         │              │         │              │
│ Phone OTP   │         │ Firebase     │         │ Email/Pass   │
│ Email OTP   │         │ Admin SDK    │         │ Firebase     │
│ Firebase    │         │ Resend       │         │ Firebase     │
│ SDK         │         │ pgx/sqlc     │         │ SDK          │
└─────────────┘         └──────────────┘         └──────────────┘
```

**Auth strategy:**
- **Employees (mobile):** Phone number is primary identity (Firebase Phone OTP). Email is verified separately via 6-digit OTP sent through Resend. Both must be verified before signup completes.
- **Admins (dashboard):** Email/password via Firebase Auth. Provisioned by existing admin.
- **Backend:** Verifies Firebase ID tokens on every request via `firebase-admin-go`. 30-day session expiry enforced via `auth_time` claim.

---

## Increment 1: Backend Foundation — Config, DB, Middleware

**Goal:** Backend can start, connect to DB, run migrations, and verify Firebase tokens.

### 1.1 Run migrations and generate sqlc code

- [x] Run `make migrate-up` against local Postgres
- [x] Run `make generate` to produce sqlc Go code
- [x] Verify `db/sqlc/` contains `models.go`, `querier.go`, `index.sql.go`
- [x] **Test:** `make test` passes (even with zero tests, build must succeed)

### 1.2 Add Firebase Admin SDK dependency

- [x] `go get firebase.google.com/go/v4`
- [x] Update `internal/config/config.go` — verify `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS_JSON` are loaded
- [x] Create `internal/firebaseapp/app.go` — initialize `firebase.App` and `auth.Client` from credentials
- [x] **Test:** `internal/firebaseapp/app_test.go` — test that `NewClient()` returns error on malformed JSON, succeeds on valid JSON (use a mock service account JSON fixture)

### 1.3 Add Resend client

- [x] `go get github.com/resend/resend-go/v2`
- [x] Create `internal/email/email.go` — wrapper with `SendEmailOTP(ctx, email, code string) error`
- [x] **Test:** `internal/email/email_test.go` — test email format validation. Integration test skipped without `RESEND_API_KEY`.

### 1.4 Implement Firebase auth middleware

- [x] Create `internal/middleware/auth.go` — `FirebaseAuth(authClient *auth.Client) gin.HandlerFunc`
- [x] Middleware extracts `Authorization: Bearer <token>`, calls `authClient.VerifyIDToken()`, sets `firebase_uid` and `email` on Gin context
- [x] Add 30-day session expiry check via `auth_time` claim → returns `401 {"error": "session_expired", "reauth_required": true}`
- [x] **Test:** `internal/middleware/auth_test.go` — use a mock `auth.Client` (interface) to test:
  - Missing header → 401
  - Invalid token → 401
  - Expired session (>30 days) → 401 with `reauth_required`
  - Valid token → calls `Next()`, context has `firebase_uid` and `email`

### 1.5 Create role-check middleware

- [x] Create `internal/middleware/role.go` — `RequireAdmin(db *db.Queries)` and `RequireActiveUser(db *db.Queries)`
- [x] `RequireAdmin` checks `firebase_uid` exists in `admins` table
- [x] `RequireActiveUser` checks `firebase_uid` exists in `users` table with `status = 'active'`
- [x] **Test:** `internal/middleware/role_test.go` — mock `db.Queries` interface, test admin found/not found, user active/suspended/not found

### 1.6 Wire middleware into server

- [x] Update `internal/server/server.go` — initialize Firebase client, Resend client, register routes
- [x] `GET /health` — no auth (existing)
- [x] All other routes behind `FirebaseAuth` middleware
- [x] **Test:** Integration test — `GET /health` returns 200 without token; `GET /api/users` returns 401 without token

**Checkpoint:** `make test && make lint` passes. Server starts with `make run`.

---

## Increment 2: Backend — Email OTP Endpoints

**Goal:** Backend can generate, send, and verify email OTP codes.

### 2.1 OTP storage

- [ ] Decide: in-memory store (map with TTL) vs Redis. For MVP, use in-memory with `sync.Map` + goroutine cleanup.
- [ ] Create `internal/service/otp.go` — `GenerateCode() string`, `Store(email, code string, ttl time.Duration)`, `Verify(email, code string) bool`, `Invalidate(email string)`
- [ ] Add rate limiting: max 5 attempts per email, 15-minute lockout after failures
- [ ] **Test:** `internal/service/otp_test.go` — table-driven tests for:
  - Generate returns 6-digit numeric string
  - Store + Verify succeeds with correct code
  - Verify fails with wrong code
  - Verify fails after expiry
  - Verify fails after 5 attempts (lockout)
  - Invalidate removes entry

### 2.2 `POST /api/auth/send-email-otp`

- [ ] Handler: accepts `{"email": "user@example.com"}`
- [ ] Validates email format
- [ ] Generates 6-digit code, stores with 10-minute TTL
- [ ] Calls Resend to send email with code
- [ ] Logs event: `email_otp_sent`
- [ ] Returns `{"message": "OTP sent"}`
- [ ] **Test:** `internal/handler/auth_test.go` — test:
  - Invalid email → 400
  - Valid email → 200, code stored, Resend called
  - Resend failure → 502

### 2.3 `POST /api/auth/verify-email-otp`

- [ ] Handler: accepts `{"email": "user@example.com", "code": "123456"}`
- [ ] Validates code against stored OTP
- [ ] On success: returns `{"email_verified": true, "email_token": "<jwt>"}` — a short-lived JWT (5 min) proving email was verified, used in Step 3 of signup
- [ ] On failure: returns 400 with reason
- [ ] Logs event: `email_otp_verified` or `email_otp_failed`
- [ ] **Test:** `internal/handler/auth_test.go` — test:
  - Correct code → 200, returns email_token
  - Wrong code → 400
  - Expired code → 400
  - Lockout → 429

**Checkpoint:** `make test && make lint` passes. Can manually test with `curl`.

---

## Increment 3: Backend — Employee Signup & Login Endpoints

**Goal:** Backend can complete employee signup and handle returning user login.

### 3.1 Write sqlc queries

- [ ] Create `db/queries/users.sql`:
  - `CreateUser` — INSERT into `users`
  - `GetUserByFirebaseUID` — SELECT by `firebase_uid`
  - `GetUserByEmail` — SELECT by `email`
  - `UpdateUserStatus` — UPDATE `status`, `updated_at`
  - `UpdateTermsAcceptance` — UPDATE terms fields, `updated_at`
- [ ] Create `db/queries/invitations.sql`:
  - `GetInvitationByEmail` — SELECT by email WHERE status = 'sent'
  - `AcceptInvitation` — UPDATE status = 'accepted', accepted_at
- [ ] Create `db/queries/events.sql`:
  - `CreateEvent` — INSERT into `events`
- [ ] Run `make generate`
- [ ] **Test:** `db/queries/` — no direct Go tests needed; sqlc validates at compile time. Integration tests in handler tests.

### 3.2 `POST /api/auth/check-invitation`

- [ ] Handler: accepts `{"email": "user@example.com"}`
- [ ] Queries `invitations` table for matching email with `status = 'sent'`
- [ ] Returns `{"invited": true}` or `{"invited": false, "reason": "not_found|accepted|expired|revoked"}`
- [ ] **Test:** `internal/handler/auth_test.go` — test all four invitation states

### 3.3 `POST /api/auth/complete-signup`

- [ ] Handler: accepts `{"firebase_id_token": "...", "email": "...", "email_token": "..."}`
- [ ] Verifies Firebase ID token → gets `firebase_uid`, `phone_number` (from `phone_number` claim)
- [ ] Verifies `email_token` (JWT from step 2.3) → confirms email was verified
- [ ] Checks invitation status is still `'sent'` (race condition protection)
- [ ] Creates `users` record: `email`, `email_verified = true`, `firebase_uid`, `phone_number`, `phone_verified = true`, `status = 'active'`
- [ ] Updates `invitations` → `status = 'accepted'`, `accepted_at = NOW()`
- [ ] Logs event: `signup_completed`
- [ ] Returns `{"user": {...}}`
- [ ] **Test:** `internal/handler/auth_test.go` — test:
  - Valid flow → 200, user created, invitation accepted
  - Missing Firebase token → 401
  - Invalid email_token → 400
  - Invitation already accepted → 409
  - User already exists (duplicate Firebase UID) → 409

### 3.4 `POST /api/auth/verify` (returning user login)

- [ ] Handler: accepts `{"firebase_id_token": "..."}`
- [ ] Verifies Firebase ID token
- [ ] Checks 30-day session expiry via `auth_time`
- [ ] Looks up user by `firebase_uid`
- [ ] Checks `status = 'active'`
- [ ] Returns `{"user": {...}}`
- [ ] **Test:** `internal/handler/auth_test.go` — test:
  - Valid → 200, returns user
  - Session expired → 401 `reauth_required`
  - User suspended → 403
  - User not found → 404

### 3.5 `POST /api/auth/terms`

- [ ] Handler: accepts `{"terms_version": "v1"}`
- [ ] Requires auth middleware (user must be logged in)
- [ ] Updates `users` → `is_terms_accepted = true`, `terms_accepted_at = NOW()`, `terms_version`, `user_ip_at_consent`
- [ ] Logs event: `terms_accepted`
- [ ] Returns `{"ok": true}`
- [ ] **Test:** `internal/handler/auth_test.go` — test:
  - Valid → 200, terms recorded
  - Already accepted → 200 (idempotent)

### 3.6 Create repository layer

- [ ] Create `internal/repository/user_repo.go` — wraps sqlc `CreateUser`, `GetUserByFirebaseUID`, etc.
- [ ] Create `internal/repository/invitation_repo.go` — wraps sqlc invitation queries
- [ ] Create `internal/repository/event_repo.go` — wraps sqlc event queries
- [ ] **Test:** Repository tests use a test database (transactional, rolled back after each test)

**Checkpoint:** `make test && make lint` passes. Full employee signup flow testable end-to-end with mock Firebase tokens.

---

## Increment 4: Backend — Admin User Management

**Goal:** Admins can invite employees, suspend/activate users.

### 4.1 `POST /api/invitations` (invite employee)

- [ ] Handler: accepts `{"email": "user@example.com"}`
- [ ] Requires `RequireAdmin` middleware
- [ ] Checks no active invitation exists for email
- [ ] Checks email not already registered as user
- [ ] Creates `invitations` record (`status = 'sent'`, `invited_by = admin_id`, `sent_at = NOW()`)
- [ ] Sends invitation email via Resend (download link + instructions)
- [ ] Logs event: `user_invited`
- [ ] Returns `{"message": "Invitation sent"}`
- [ ] **Test:** `internal/handler/invitation_test.go` — test:
  - Valid → 200, invitation created, email sent
  - Already invited → 409
  - Already registered → 409
  - Non-admin → 403

### 4.2 `GET /api/users` (list users)

- [ ] Handler: requires `RequireAdmin` middleware
- [ ] Returns paginated list of users
- [ ] Supports query params: `?page=1&per_page=20&status=active`
- [ ] **Test:** `internal/handler/user_test.go` — test pagination, filtering

### 4.3 `PUT /api/users/:id/suspend` and `PUT /api/users/:id/activate`

- [ ] Handler: requires `RequireAdmin` middleware
- [ ] Suspend: sets `status = 'suspended'`, `updated_at = NOW()`, disables Firebase user
- [ ] Activate: sets `status = 'active'`, `updated_at = NOW()`, re-enables Firebase user
- [ ] Logs event: `user_suspended` or `user_activated`
- [ ] **Test:** `internal/handler/user_test.go` — test:
  - Suspend active user → 200, status updated
  - Activate suspended user → 200, status updated
  - Suspend already suspended → 409
  - Non-admin → 403

### 4.4 `GET /api/admins` and `DELETE /api/admins/:id`

- [ ] List admins, revoke admin access
- [ ] **Test:** `internal/handler/admin_test.go`

**Checkpoint:** `make test && make lint` passes. Admin can manage users via API.

---

## Increment 5: Mobile — Auth Screens (Signup + Login)

**Goal:** Employee can complete full signup and login flow on mobile.

### 5.1 Fix environment variables

- [ ] Fix `mobile/.env` — change `NEXT_PUBLIC_*` to `EXPO_PUBLIC_*`
- [ ] Fix `mobile/src/lib/firebase.ts` — use `getReactNativePersistence(AsyncStorage)` instead of `inMemoryPersistence`
- [ ] **Test:** Verify Firebase initializes correctly with env vars

### 5.2 Create `/(auth)/signup` screen

- [ ] UI: email input + phone input + "Continue" button
- [ ] On submit: calls `POST /api/auth/check-invitation`
- [ ] If invited → navigate to `/(auth)/verify-email`
- [ ] If not invited → show inline error, stay on screen
- [ ] **Test:** `__tests__/signup.test.tsx` — test:
  - Invalid email format → validation error
  - Invalid phone format → validation error
  - API returns invited → navigates to verify-email
  - API returns not invited → shows error message
  - Network error → shows connection error

### 5.3 Create `/(auth)/verify-email` screen

- [ ] UI: "We sent a 6-digit code to {email}", 6-digit OTP input, "Verify" button, "Resend code" link
- [ ] On first render: calls `POST /api/auth/send-email-otp`
- [ ] On verify: calls `POST /api/auth/verify-email-otp`
- [ ] On success: persist email-verified state + email_token in AsyncStorage, navigate to `/(auth)/verify-phone`
- [ ] On resend: calls send-email-otp again (with 60s cooldown)
- [ ] **Test:** `__tests__/verify-email.test.tsx` — test:
  - Correct code → navigates to verify-phone, state persisted
  - Wrong code → shows error
  - Resend → calls API, cooldown timer works
  - Back button → returns to signup

### 5.4 Create `/(auth)/verify-phone` screen

- [ ] UI: "Verifying phone number: {phone}", "Send Code" button, 6-digit OTP input, "Verify" button
- [ ] On "Send Code": calls Firebase `signInWithPhoneNumber(phoneNumber)`
- [ ] On verify: calls Firebase `confirmationResult.confirm(code)`
- [ ] On success: calls `POST /api/auth/complete-signup` with Firebase ID token + email + email_token
- [ ] On success: navigate to `/(app)/terms` (first-time) or `/(app)/(tabs)/home` (returning)
- [ ] **Test:** `__tests__/verify-phone.test.tsx` — test:
  - Firebase sends code → UI shows OTP input
  - Correct code → calls complete-signup, navigates
  - Wrong code → shows Firebase error
  - Back button → returns to verify-email

### 5.5 Update `/(auth)/login` screen (returning user)

- [ ] UI: phone number input + "Continue" button
- [ ] On submit: Firebase Phone OTP flow
- [ ] On Firebase success: calls `POST /api/auth/verify` with Firebase ID token
- [ ] On success: navigate to `/(app)/(tabs)/home`
- [ ] On session expired (30 days): show "Session expired, please re-authenticate" and retry
- [ ] On suspended: show "Account suspended. Contact your manager."
- [ ] **Test:** `__tests__/login.test.tsx` — test:
  - Valid login → navigates to home
  - Suspended account → shows error
  - Session expired → shows re-auth message

### 5.6 Update `app/index.tsx` redirect logic

- [ ] If user authenticated → `/(app)/(tabs)/home`
- [ ] If not authenticated → `/(auth)/login`
- [ ] **Test:** `__tests__/index.test.tsx` — test redirect logic

**Checkpoint:** `npm run lint && npm run typecheck && npm run test` passes in mobile.

---

## Increment 6: Mobile — Terms, Home, Profile Updates

**Goal:** Post-signup flow works: terms acceptance, home screen, profile.

### 6.1 Update `/(app)/terms` screen

- [ ] Connect "Continue" button to `POST /api/auth/terms`
- [ ] On success: navigate to `/(app)/(tabs)/home`
- [ ] **Test:** `__tests__/terms.test.tsx` — test:
  - Accept → calls API, navigates
  - Don't accept → button disabled

### 6.2 Update `/(app)/(tabs)/home` screen

- [ ] Fetch user data on load
- [ ] Show eligibility status (window check, daily limit, monthly limit, kill switch)
- [ ] "Request Advance" button enabled only if eligible
- [ ] Show current request status if any
- [ ] **Test:** `__tests__/home.test.tsx` — test:
  - Eligible → button enabled
  - Outside window → shows message, button disabled
  - Already requested today → shows message
  - Kill switch active → shows message

### 6.3 Update `/(app)/(tabs)/profile` screen

- [ ] Show email (verified badge), phone (verified badge)
- [ ] Show terms acceptance status
- [ ] Sign out button → calls `auth.signOut()`, clears AsyncStorage, navigates to `/(auth)/login`
- [ ] **Test:** `__tests__/profile.test.tsx` — test sign out flow

### 6.4 Remove dead screens

- [ ] Delete `/(auth)/verify-otp.tsx` (replaced by verify-email)
- [ ] Delete `/(auth)/magic-link.tsx` (not used)
- [ ] Remove "Verify Phone" quick action from home (phone verified during signup)

**Checkpoint:** `npm run lint && npm run typecheck && npm run test` passes.

---

## Increment 7: Admin Dashboard — Auth Integration

**Goal:** Admin dashboard connects to backend API, shows real data.

### 7.1 Add admin role check to auth guard

- [ ] Update `admin/src/components/auth-guard.tsx` — after Firebase auth, call `POST /api/auth/verify` to confirm admin role
- [ ] If not admin → redirect to `/login` with error
- [ ] **Test:** `admin/src/__tests__/auth-guard.test.tsx` — test:
  - Firebase user is admin → renders children
  - Firebase user is not admin → redirects to login

### 7.2 Connect dashboard home to API

- [ ] Create `admin/src/hooks/use-dashboard.ts` — `GET /api/dashboard/stats`
- [ ] Update `admin/src/app/(dashboard)/page.tsx` — fetch and display real stats
- [ ] **Test:** `admin/src/__tests__/dashboard.test.tsx` — test loading, success, error states

### 7.3 Connect users page to real API

- [ ] Already wired via `use-users.ts` hook — verify it hits correct endpoints
- [ ] Add pagination controls
- [ ] **Test:** `admin/src/__tests__/users.test.tsx` — test suspend/activate flow

### 7.4 Connect requests, events, kill-switch pages

- [ ] Verify all hooks hit correct backend endpoints
- [ ] Add loading states, error handling
- [ ] **Test:** Test each page for loading, success, error states

### 7.5 Add employee invitation UI

- [ ] Create `admin/src/app/(dashboard)/invitations/page.tsx` or modal
- [ ] UI: email input + "Send Invitation" button
- [ ] Calls `POST /api/invitations`
- [ ] Shows list of pending invitations
- [ ] **Test:** `admin/src/__tests__/invitations.test.tsx` — test invite flow, duplicate detection

**Checkpoint:** `npm run lint && npm run typecheck` passes in admin. All pages connected to API.

---

## Increment 8: Integration & E2E Testing

**Goal:** Full flows tested end-to-end.

### 8.1 Backend integration tests

- [ ] Create `internal/integration/auth_test.go` — full signup flow with test Firebase tokens
- [ ] Create `internal/integration/user_test.go` — suspend/activate flow
- [ ] Use test database with transaction rollback
- [ ] Mock Firebase Admin SDK with test tokens

### 8.2 Mobile E2E (Maestro)

- [ ] Create `mobile/.maestro/signup.yaml` — full signup flow: enter email+phone → verify email OTP → verify phone OTP → accept terms → home
- [ ] Create `mobile/.maestro/login.yaml` — returning user login flow
- [ ] Create `mobile/.maestro/suspend.yaml` — suspended user blocked from login

### 8.3 Admin E2E (Cypress)

- [ ] Create `admin/cypress/e2e/admin-login.cy.ts`
- [ ] Create `admin/cypress/e2e/invite-employee.cy.ts`
- [ ] Create `admin/cypress/e2e/suspend-user.cy.ts`

**Checkpoint:** All E2E tests pass. Ready for pilot.

---

## Dependency Graph

```
Increment 1 (Backend Foundation)
    │
    ▼
Increment 2 (Email OTP) ─────────────────────────────────────┐
    │                                                         │
    ▼                                                         │
Increment 3 (Signup/Login)                                    │
    │                                                         │
    ├──────────────┬──────────────────────┐                   │
    ▼              ▼                      ▼                   │
Increment 5      Increment 4            Increment 7           │
(Mobile Auth)    (Admin User Mgmt)      (Admin Dashboard)     │
    │              ▲                      ▲                   │
    │              │                      │                   │
    └──────────────┴──────────────────────┘                   │
                            │                                 │
                            ▼                                 │
                    Increment 8 (E2E) ◄───────────────────────┘
                            │
                            ▼
                    Increment 6 (Mobile Post-Signup)
```

**Parallel work:** Increments 4, 5, and 7 can start as soon as Increment 3 is done. Increment 6 depends on Increment 5. Increment 8 depends on everything.

---

## Test Strategy Summary

| Layer | Tool | What |
|---|---|---|
| Backend unit | `go test` | OTP generation/storage, middleware, handlers with mocked deps |
| Backend integration | `go test` + test DB | Full API flows with real DB, mock Firebase |
| Mobile unit | Jest + RNTL | Screen rendering, user interactions, API call mocking |
| Mobile E2E | Maestro | Full signup/login flows on simulator |
| Admin unit | Jest + RTL | Component rendering, state management |
| Admin E2E | Cypress | Admin login, invite, suspend flows |

**Rule:** Every handler has at least one test. Every screen has at least one test. No PR merges without passing tests.
