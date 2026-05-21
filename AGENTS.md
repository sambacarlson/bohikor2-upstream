# AGENTS.md — Bohikor2

Salary advance pilot app. Current scope: **Epic 1 — Authentication only**. See `docs/brief.md` for auth flows and `docs/schema.md` for the data contract.

## Stack

- **Backend:** Go 1.26, Gin, sqlc, pgx/v5, golang-migrate, Firebase Admin SDK, Resend
- **Admin:** Next.js 16, shadcn/ui, Tailwind v4, TanStack Query, Firebase Auth
- **Mobile:** Expo SDK 54, React Native 0.81, NativeWind, TanStack Query, Firebase Auth
- **Database:** PostgreSQL 17 (Neon/Supabase)
- **Testing:** Go `testing`, Jest + RTL (admin), Jest + RNTL (mobile)

## Repo Structure

```
bohikor2/
├── docs/              # brief.md, schema.md
├── PLAN.md
├── AGENTS.md
├── backend/           # Go API (Gin + sqlc + golang-migrate)
│   ├── cmd/server/main.go
│   ├── internal/      # handlers, services, middleware, config
│   ├── db/queries/    # sqlc query definitions
│   ├── db/sqlc/       # generated Go code (do not edit)
│   ├── migrations/    # numbered .up.sql / .down.sql files
│   └── go.mod
├── admin/             # Next.js dashboard (invite + users)
│   └── src/
└── mobile/            # Expo app (phone login + signup)
    ├── app/           # Expo Router routes
    └── src/           # hooks, providers, types, lib
```

## Build & Run

### Backend

```bash
cd backend && go mod download
go generate ./db/...          # regenerate sqlc after query changes
go run cmd/server/main.go     # dev server
go test ./...                  # tests
golangci-lint run              # lint
```

### Admin

```bash
cd admin && npm install
npm run dev       # dev server
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm run test      # Jest
```

### Mobile

```bash
cd mobile && npm install
npx expo start    # dev server
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm run test      # Jest + RNTL
```

## Auth Flows

### Admin Dashboard

1. Sign in with email/password via Firebase Auth
2. Backend verifies Firebase ID token, confirms user exists in `admins` table
3. Dashboard has two panels: **Invite** (send invitation emails) and **Users** (list + refresh)

### Mobile — Login (Returning User)

1. Enter phone number → Firebase Phone OTP → `POST /api/auth/verify` → home

### Mobile — Start Fresh (New User)

1. Enter invited email → `GET /api/auth/check-invite` → blocked if no invitation
2. `POST /api/auth/send-email-otp` → 6-digit code via Resend
3. Enter code → `POST /api/auth/verify-email-otp`
4. Enter phone → Firebase Phone OTP → `POST /api/auth/verify-phone-otp` → user created, invite accepted → home

**Edge cases:** User already exists → route to login. Invite accepted but user not verified → route to phone verification. Suspended user → blocked with message.

## Code Style

### Go

- `gofmt` formatting, `golangci-lint run` must pass
- All `UPDATE` queries must set `updated_at = NOW()`
- Use `slog` with structured fields, no string interpolation for errors
- Migrations: numbered sequentially, no `IF NOT EXISTS`/`IF EXISTS`
- Config via environment variables (`caarlos0/env`)

### TypeScript

- Strict mode in all `tsconfig.json`
- Prettier + ESLint
- TanStack React Query for all server state
- Axios interceptors attach Firebase ID tokens

### Database

- Schema source of truth: `docs/schema.md`
- `snake_case` tables/columns, `idx_<table>_<desc>` for indexes
- All timestamps `TIMESTAMPTZ`, IDs as UUIDs
- Migrations run in CI pre-deploy, never on app boot

## Testing

Every PR must pass lint + typecheck + tests for the changed workspace(s).

## Security

- Never commit secrets or Firebase service account JSON
- Use environment variables for all config (`.env.example` files with dummy values)
- Admin endpoints require Firebase Auth ID token via `firebase-admin-go`