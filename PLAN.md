# Master Execution Plan: Bohikor2 Pilot

## 1. Project Status Matrix

| Epic | Status | Priority | Owner |
| :--- | :---: | :---: | :--- |
| **0. Foundation & Data Contract** | ✅ | P0 | Backend |
| **1. Identity & Auth (Firebase)** | 🏗️ | P0 | Fullstack |
| **2. Mobile: Onboarding & Phone Verification** | 🏗️ | P1 | Mobile |
| **3. Backend: Eligibility & Campay Payouts** | ⚪ | P0 | Backend |
| **4. Admin: Monitoring & Kill Switch** | 🏗️ | P1 | Admin |
| **5. Observability & Event Logging** | ⚪ | P1 | Backend |
| **6. Pilot Launch & Feedback Loop** | ⚪ | P2 | Fullstack |

**Legend:**
- ✅ Completed
- 🏗️ In Progress
- ⚪ Not Started
- 🛑 Blocked

---

## 2. Feature Epics & Checkpoints

### 0. Foundation & Data Contract
- [x] Initial Project Brief & Tech Stack definition.
- [x] Data Contract & Schema Engineering (`docs/schema.md`).
- [x] Resolve open design questions (calendar-month reset, non-refundable fee, data retention).
- [x] Initialize Go Backend (Gin + sqlc + golang-migrate).
- [x] Initialize Admin Dashboard (Next.js + shadcn).
- [x] Initialize Mobile App (Expo + NativeWind).

### 1. Identity & Auth (Firebase)
- [ ] Configure Firebase Project (Auth & Admin SDK).
- [x] Backend: Firebase Admin SDK integration (`internal/firebaseapp/app.go`).
- [x] Backend: Resend email client (`internal/email/email.go`).
- [x] Backend: Firebase auth middleware with 30-day session expiry (`internal/middleware/auth.go`).
- [x] Backend: Role-check middleware — RequireAdmin, RequireActiveUser (`internal/middleware/role.go`).
- [x] Backend: sqlc queries for users, admins, invitations, events (`db/queries/`).
- [x] Backend: Server routes — `/health`, `/api/auth/verify`, `/api/admin/me`, `/api/users/me`, `/api/admin/invite`, `/api/admin/invitations`, `/api/admin/users`.
- [x] Backend: 41 unit tests passing, 0 lint issues.
- [x] Implement Admin Invite flow (Backend + Email) — `POST /api/admin/invite`, invitation email via Resend, duplicate detection. Invitations created as `pending`, updated to `sent` on email success or `failed` on email error.
- [x] Admin Dashboard: Invite page (`/invite`) — send invitations, view invitation list with status badges (pending/sent/accepted/failed), manual refresh. Jest + RTL test infrastructure added. 7 RTL tests passing.
- [ ] Implement Employee phone-first signup flow (Mobile).

### 2. Mobile: Onboarding & Phone-First Auth
- [ ] Signup screen (email + phone input, invitation check).
- [ ] Email OTP verification (Resend).
- [ ] Firebase Phone OTP verification (primary identity).
- [ ] Persist verification state across app restarts.
- [ ] Complete signup → create user, accept invitation, redirect to home.

### 3. Backend: Eligibility & Campay Payouts
- [ ] Date Window Enforcement (15th–End of Month in Africa/Douala timezone).
- [ ] Request Throttling (1/day in Africa/Douala timezone) & Success Limit (1/calendar month).
- [ ] Campay Payout API Integration & Webhook Handler (with HMAC signature verification).
- [ ] Kill Switch: block new requests; let in-flight payouts complete but flag for manual review.

### 4. Admin: Monitoring & Kill Switch
- [ ] Admin Dashboard UI (User List + Request Feed).
- [ ] Global Kill Switch toggle (blocks new requests, flags in-flight for review).
- [ ] Manual User Suspension mechanism.

### 5. Observability & Event Logging
- [ ] Structured Logging implementation (`slog`).
- [ ] Event Table tracking for all state transitions (including `kill_switch_activated`, `kill_switch_deactivated`, `user_suspended`).
- [ ] Payout speed metrics (P50/P90 calculation).

### 6. Pilot Launch & Feedback Loop
- [ ] End-to-End Payout Testing (Sandbox).
- [ ] Post-payout Satisfaction Survey (triggered on `success` or `failed` status only).
- [ ] Final Pilot Audit & Performance Review.

---

## 3. Running Changelog

| Date | Change Type | Description |
| :--- | :--- | :--- |
| 2026-05-19 | 🚀 Initial | Project initialized; Brief, Stack, and Schema locked. |
| 2026-05-19 | ⚖️ Pivot | Request window constrained to 15th–last day. Auth pivoted from Campay 5 XAF collection to Firebase Phone OTP + Resend email OTP. |
| 2026-05-19 | 🔄 Schema Rev 2 | Removed DB-level day CHECK (enforce in app logic with Africa/Douala TZ). Fixed partial unique index timezone expressions. Added `phone_number` to `users`, `status` to `invitations`, `UNIQUE(user_id, request_id)` to `surveys`. Added missing indexes. Moved kill switch seed to migration note. Clarified `updated_at` as app-layer responsibility. |
| 2026-05-19 | 🔄 Brief Rev 2 | Specified Africa/Douala timezone for all date boundaries. Clarified kill switch scope (block new, let in-flight finish, flag for review). Added Campay webhook HMAC authentication requirement. Clarified survey triggers on final status only. Added data retention policy (indefinite). |
| 2026-05-19 | 🔄 Stack Rev 2 | Added Supabase PG-17 compatibility note. Added Maestro for mobile E2E testing. Added CI/CD pipeline section (GitHub Actions). |
| 2026-05-19 | ✅ Design Decisions | Calendar-month reset (Jan 31 + Feb 15 = both allowed). Phone-first auth via Firebase Phone OTP + Resend email OTP. Data retained indefinitely post-pilot. |
| 2026-05-19 | 🏗️ Backend Init | Go backend scaffolded: Gin server with graceful shutdown, `slog` structured logging, request ID middleware, pgxpool connection, `caarlos0/env` + `godotenv` config loading. Makefile (run/build/docker-build/lint/test/generate/migrate-up/migrate-down/migrate-force/migrate-create/clean/install-tools). Dockerfile (multi-stage Go 1.26-alpine → alpine). Migrations: `000001_schema.up/down.sql` (full DDL), `000002_seed_kill_switch.up/down.sql`. sqlc config with pgx/v5 + uuid/time/decimal overrides. `.golangci.yml` with errcheck/govet/bodyclose/noctx. `.env` + `.env.example` with Neon/local DB placeholders. Health endpoint at `GET /health`. |
| 2026-05-19 | 🏗️ Admin Init | Admin dashboard scaffolded: Next.js 16 + shadcn/ui (radix) + Tailwind v4 + TanStack React Query + Firebase auth + Axios with token interceptor. Pages: login (email/password), dashboard overview (stats cards), users (table + suspend/activate), requests (table + status filter), kill switch (toggle + status), events (log table). Auth guard protects all dashboard routes. TypeScript types match backend schema. `.env.local` with Firebase + API placeholders. `npm run lint` and `npm run typecheck` pass clean. Auth flow spec in `docs/features/auth.md`. |
| 2026-05-20 | ✅ Backend Increment 1 | Auth foundation complete: Firebase Admin SDK, Resend client, auth middleware (30-day session expiry), role middleware (RequireAdmin/RequireActiveUser), sqlc queries (users/admins/invitations/events), server routes wired. 21 tests pass, 0 lint issues. Server starts and /health returns 200. |
| 2026-05-20 | ✅ Admin Invite Flow | `POST /api/admin/invite` endpoint: validates email, checks for active invitations (sent/accepted), creates invitation record, sends email via Resend. Service layer with mocked store + email sender. 13 new tests (email, service, handler, server integration). 34 total tests pass, 0 lint issues. |
| 2026-05-20 | ✅ Admin Invite UI + Tests | Admin dashboard invite page (`/invite`): email form, send button, invitations table with status badges, manual refresh. Jest + RTL test infrastructure (jest.config.js, jest.setup.ts, 7 passing tests). `GET /api/admin/invitations` backend endpoint added. Sidebar updated with Invite link. Admin types overhauled to match backend sqlc models. |
| 2026-05-20 | ✅ Invitation Status Flow | Invitations now created as `pending`, updated to `sent` on Resend success or `failed` on error. New enum values: `pending`, `failed`. `GET /api/admin/users` endpoint added with pagination. Admin users hook fixed to call `/api/admin/users`. Firebase UID string handling fixed (no longer parsed as UUID). 41 total backend tests pass, 0 lint issues. |
| 2026-05-19 | 🏗️ Mobile Init | Mobile app scaffolded: Expo SDK 54 + NativeWind v5 (Tailwind v4) + Expo Router + Firebase Auth + TanStack Query + Axios. Route groups: `(auth)` (login, signup, verify-email, verify-phone) and `(app)` with bottom tabs (home, history, profile) + stack screens (request-advance, terms, survey). TypeScript types matching backend schema. ESLint + Jest config. `npm run lint` and `npm run typecheck` pass clean. |
| 2026-05-20 | ✅ Backend Mobile Auth Endpoints | 4 new endpoints: `GET /api/auth/check-invite`, `POST /api/auth/send-email-otp`, `POST /api/auth/verify-email-otp`, `POST /api/auth/verify-phone-otp`. `email_otps` table migration (000006). sqlc queries for OTP storage. Auth handler with invitation check, OTP generation/validation, user creation + invitation acceptance. All tests pass, 0 lint issues. |
| 2026-05-20 | ✅ Backend Fixes | `invitations.updated_at` migration (000005) — all UPDATE queries now set `updated_at = NOW()`. `invitations_update.sql` and `AcceptInvitation` queries updated. `AGENTS.md` updated: migrations must not use `IF NOT EXISTS` or `IF EXISTS` clauses. |
| 2026-05-20 | ✅ Docs Overhaul | `docs/features/auth.md` rewritten with complete mobile auth flow, API specs, route structure, and implementation status. `AGENTS.md` updated: Next.js 16.2.6, React Native 0.81, Expo SDK 54. Mobile types fixed: `amount_xaf` as `number`, added `InvitationStatus` and `invited_by` field. Admin `Invitation` type updated with `invited_by` (TODO comment). |

---

## 4. Current Blockers

*None currently identified.*