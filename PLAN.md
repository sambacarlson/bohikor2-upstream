# Master Execution Plan: Bohikor2 Pilot

## 1. Project Status Matrix

| Epic | Status | Priority | Owner |
| :--- | :---: | :---: | :--- |
| **0. Foundation & Data Contract** | 🏗️ | P0 | Backend |
| **1. Identity & Auth (Firebase)** | ⚪ | P0 | Fullstack |
| **2. Mobile: Onboarding & Phone Verification** | ⚪ | P1 | Mobile |
| **3. Backend: Eligibility & Campay Payouts** | ⚪ | P0 | Backend |
| **4. Admin: Monitoring & Kill Switch** | ⚪ | P1 | Admin |
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
- [ ] Initialize Admin Dashboard (Next.js + shadcn).
- [ ] Initialize Mobile App (Expo + NativeWind).

### 1. Identity & Auth (Firebase)
- [ ] Configure Firebase Project (Auth & Admin SDK).
- [ ] Implement Admin Invite flow (Backend + Email).
- [ ] Implement Employee Magic Link/OTP flow (Mobile).

### 2. Mobile: Onboarding & Phone Verification
- [ ] Signup & Terms Acceptance UI.
- [ ] Phone Input & Campay 5 XAF Collection trigger (non-refundable, clearly communicated).
- [ ] Active Loop Verification (Transaction ID matching + store phone on `users` table).

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
| 2026-05-19 | ⚖️ Pivot | Request window constrained to 15th–last day; 5 XAF fee marked non-refundable. |
| 2026-05-19 | 🔄 Schema Rev 2 | Removed DB-level day CHECK (enforce in app logic with Africa/Douala TZ). Fixed partial unique index timezone expressions. Added `phone_number` to `users`, `status` to `invitations`, `UNIQUE(user_id, request_id)` to `surveys`. Added missing indexes. Moved kill switch seed to migration note. Clarified `updated_at` as app-layer responsibility. |
| 2026-05-19 | 🔄 Brief Rev 2 | Specified Africa/Douala timezone for all date boundaries. Clarified kill switch scope (block new, let in-flight finish, flag for review). Added Campay webhook HMAC authentication requirement. Clarified survey triggers on final status only. Added data retention policy (indefinite). |
| 2026-05-19 | 🔄 Stack Rev 2 | Added Supabase PG-17 compatibility note. Added Maestro for mobile E2E testing. Added CI/CD pipeline section (GitHub Actions). |
| 2026-05-19 | ✅ Design Decisions | Calendar-month reset (Jan 31 + Feb 15 = both allowed). 5 XAF fee is non-refundable. Data retained indefinitely post-pilot. |
| 2026-05-19 | 🏗️ Backend Init | Go backend scaffolded: Gin server with graceful shutdown, `slog` structured logging, request ID middleware, pgxpool connection, `caarlos0/env` + `godotenv` config loading. Makefile (run/build/docker-build/lint/test/generate/migrate-up/migrate-down/migrate-force/migrate-create/clean/install-tools). Dockerfile (multi-stage Go 1.26-alpine → alpine). Migrations: `000001_schema.up/down.sql` (full DDL), `000002_seed_kill_switch.up/down.sql`. sqlc config with pgx/v5 + uuid/time/decimal overrides. `.golangci.yml` with errcheck/govet/bodyclose/noctx. `.env` + `.env.example` with Neon/local DB placeholders. Health endpoint at `GET /health`. |

---

## 4. Current Blockers

*None currently identified.*