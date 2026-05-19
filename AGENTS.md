# AGENTS.md — Project Conventions & Build Instructions

## Project Overview

Bohikor2 is a salary advance pilot app. See `docs/brief.md` for business rules and `docs/schema.md` for the data contract; this file is the operational guide for working on the codebase.

## Repository Structure (Target)

```
bohikor2/
├── docs/              # Brief, schema, stack (source of truth — already exists)
├── PLAN.md            # Master execution plan
├── AGENTS.md          # This file
├── backend/           # Go API (Gin + sqlc + golang-migrate)
│   ├── cmd/           # Entry points
│   ├── internal/      # App logic (handlers, services, repositories)
│   ├── db/            # sqlc queries + migrations
│   ├── migrations/    # golang-migrate SQL files
│   └── go.mod
├── admin/             # Next.js 15 dashboard (shadcn/ui + TanStack Query)
│   ├── src/
│   └── package.json
└── mobile/            # Expo SDK 54 + React Native 0.85 (NativeWind)
    ├── app/           # Expo Router file-based routes
    └── package.json
```

## Build & Run Commands

### Backend (Go 1.26)

```bash
# Install dependencies
cd backend && go mod download

# Generate sqlc code (after changing queries or schema)
go generate ./db/...

# Run database migrations (pre-deploy, never on app boot)
go run github.com/golang-migrate/migrate/v4/cmd/migrate \
  -source=file://migrations -database="$DATABASE_URL" up

# Run tests
go test ./...

# Lint
golangci-lint run

# Start dev server
go run cmd/server/main.go
```

### Admin Dashboard (Next.js 15)

```bash
cd admin
npm install
npm run dev           # Dev server
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Jest
npm run test:e2e      # Cypress
```

### Mobile App (Expo SDK 54)

```bash
cd mobile
npm install
npx expo start        # Dev server
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Jest + RNTL
```

## Code Style & Conventions

### Go (Backend)

- **Formatting:** `gofmt` (enforced by `golangci-lint`).
- **Linting:** `golangci-lint run` — must pass before every commit.
- **Error handling:** No wrapped error silencing. Always log or return errors. Use `slog` structured fields, not string interpolation.
- **`updated_at` column:** The database has no auto-update trigger. **Every `UPDATE` query must explicitly set `updated_at = NOW()`.**
- **Timezone-sensitive logic:** All date-window checks (15th–end of month, daily throttling) must evaluate timestamps in `Africa/Douala` (WAT/UTC+1). Use `time.LoadLocation("Africa/Douala")` — never rely on server local time.
- **sqlc:** All SQL queries live in `.sql` files under `db/queries/`. Run `go generate ./db/...` after any query change. Never manually edit generated Go code.
- **Migrations:** Numbered sequentially (`000001_schema.sql`, `000002_seed_kill_switch.sql`, etc.). Never modify a migration that has been applied to production — always add a new one.
- **Environment variables:** Use `github.com/caarlos0/env` or similar. Never hardcode secrets. All config reads from env vars.

### TypeScript (Admin + Mobile)

- **Strict mode:** `"strict": true` in all `tsconfig.json` files.
- **Formatting:** Prettier (config in repo root for consistency).
- **Linting:** ESLint with `eslint:recommended` + framework-specific plugins.
- **State fetching:** TanStack React Query for all server state. No local state for API data.
- **Firebase Auth:** Token refresh handled by the Firebase SDK. Axios interceptors attach fresh ID tokens to every request header.

### Database (PostgreSQL 17)

- **Schema source of truth:** `docs/schema.md`. The DDL in that file is canonical. Any change starts with an update to that doc, then a migration file.
- **Naming:** `snake_case` for tables and columns. `idx_<table>_<description>` for indexes.
- **Timestamps:** All `TIMESTAMPTZ`. Never use `TIMESTAMP` without timezone.
- **IDs:** UUIDs via `uuid_generate_v4()`.
- **Migrations:** Run in CI as a pre-deploy step. Never auto-migrate on app boot.

## Business Rules Quick Reference

| Rule | Detail |
| :--- | :--- |
| Advance amount | Fixed 10,000 XAF |
| Request window | 15th–last day of month, Africa/Douala time |
| Daily attempt limit | 1 per day per user (Africa/Douala time) |
| Monthly success limit | 1 per calendar month per user |
| Verification fee | 5 XAF, non-refundable |
| Kill switch | Blocks **new** requests; in-flight payouts complete but flagged for review |
| Survey trigger | On `success` or `failed` status only |
| Webhook auth | Campay HMAC signature verification required |
| Data retention | Indefinite (post-pilot retained) |
| Timezone for all date logic | `Africa/Douala` (WAT / UTC+1) |

## Testing Requirements

- **Before every PR:** Lint and typecheck must pass for the changed workspace(s).
- **Backend:** `go test ./...` + `golangci-lint run`.
- **Admin:** `npm run lint && npm run typecheck && npm run test`.
- **Mobile:** `npm run lint && npm run typecheck && npm run test`.
- **E2E:** Cypress (admin) and Maestro (mobile) for critical user flows before release.

## Security Practices

- Never commit secrets, API keys, or Firebase service account JSON to the repository.
- All Campay webhook payloads must be HMAC-verified before processing.
- Minimize stored PII. Hash or encrypt sensitive fields where possible.
- Use environment variables for all configuration. Provide `.env.example` files with dummy values.
- Admin endpoints require Firebase Auth ID token verification via `firebase-admin-go`.