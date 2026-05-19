# Bohikor2 Detailed Full-Stack MVP Specification

## 1. Explicit Engine & Core Runtimes

- **Backend Runtime:** `Go 1.26`
- **Admin Front-End Engine:** `Node.js 22.x LTS`
- **Admin Framework:** `Next.js 15.x` (React 19, Strict TypeScript)
- **Mobile Runtime:** `Node.js 22.x LTS`
- **Mobile Framework:** `React Native 0.85` (Strict TypeScript)
- **Mobile Ecosystem:** `Expo SDK 54`

## 2. Infrastructure, Database & Topology

- **Hosting Platforms:**
  - **Go Backend API:** Render / Koyeb (Free Tier Web Service)
  - **Next.js Admin Dashboard:** Vercel (Hobby Tier)
  - **PostgreSQL Database Engine:** Neon Serverless (Free Tier, migrating to AWS RDS post-pilot). **Note:** Neon supports PostgreSQL 17. If using Supabase instead, verify PG version support — Supabase may not yet support PG 17 at time of deployment.
  - **Transactional Email & OTP:** Resend (Free Tier)
- **Database Engine:** `PostgreSQL 17`
- **Failover & Backup Topology:** Single-node instance with active connection pooling.
  - Automated daily logical backups executed at the platform level.
  - No multi-region read replicas or high-availability failover clusters configured for MVP.

## 3. Core Backend Stack (Go)

- **HTTP Router / Web Framework:** `Gin Web Framework` (High performance, explicit context bindings).
- **Database Access & Code Generation:** `sqlc` (Compile-time type-safe Go code generation directly from raw SQL schemas and queries).
- **Database Migrations:** `golang-migrate` (Go-native tool compiled into the binary or run as an independent utility to handle SQL schema states). Migration files use `.up.sql` / `.down.sql` convention. Migrations are **manual** — never auto-run on server start.
- **Authentication Handler:** `firebase-admin-go` (Firebase Admin Go SDK to verify client-side Firebase Auth ID tokens, decode claims, and manage stateless security contexts).
- **Structured Logging / Observability:** Go Standard Library `slog` (Structured JSON log output parsed directly by cloud platform logging drains).
- **Configuration:** `caarlos0/env` for environment variable parsing + `godotenv` for `.env` file loading in development.
- **HTTP Client:** `net/http` standard library (no external HTTP client needed).
- **Database Driver:** `pgx/v5` via `pgxpool` (connection pooling with health checks).
- **Build & Dev Tooling:** Standalone `Makefile` in `backend/` — all commands run from within `backend/` directory. Dockerfile uses multi-stage build (Go 1.26-alpine → alpine:3.20).

## 4. Admin Dashboard Stack (Next.js)

- **UI Foundation & Design System:** `shadcn/ui` (Radix UI primitives tailored via Tailwind CSS).
- **Styling Engine:** `Tailwind CSS` (Utility-first styling matching shadcn structures).
- **Server State & Data Fetching:** `TanStack React Query` (Declarative caching, auto-refreshes, and mutations).
- **Authentication Subsystem:** `firebase/auth` (Firebase Client SDK integrated into Next.js for admin authentication state management).
- **Component Compilation:** Next.js App Router with React Server Components (RSC) architecture.

## 5. Mobile Application Stack (React Native & Expo)

- **Styling & Presentation Layer:** `NativeWind` (Tailwind CSS configuration layer mapping utility classes natively to React Native primitives).
- **State Management & Network Sync:** `TanStack React Query` (Shared query paradigms matching the Admin frontend).
- **Navigation Architecture:** `Expo Router` (File-based routing built on top of React Navigation).
- **Authentication Infrastructure:** `firebase/auth` (Client-side user registration, passwordless links/email OTP, and token refresh handling).
- **Network Client:** `Axios` (Configured with automated interceptors for attaching fresh Firebase ID tokens to request headers).

## 6. Comprehensive Testing Suites

- **Backend Units & Integration Testing:** Go native `testing` package for isolated unit logic.
  - Integration testing against clean localized PostgreSQL instances or transactional sandbox systems.
- **Admin Dashboard Testing:**
  - `Jest` + `React Testing Library` for front-end unit and component rendering assertions.
  - `Cypress` for full end-to-end user path simulation.
- **Mobile App Validation:**
  - `Jest` + `React Native Testing Library` (RNTL) for component interactions and state testing.
  - `Maestro` for mobile E2E flow testing on physical devices and simulators.

## 7. CI/CD Pipeline

- **Platform:** GitHub Actions (free tier for public/private repos).
- **Backend CI:** On push/PR — `go vet`, `go test`, `golangci-lint run`.
- **Admin CI:** On push/PR — `next lint`, `tsc --noEmit`, `jest --coverage`.
- **Mobile CI:** On push/PR — `expo export`, Maestro E2E (on simulator).
- **Deploy:** Manual promote to staging/production via GitHub Actions workflow dispatch (no auto-deploy to production in MVP).
- **Database Migrations:** Run `golang-migrate` as a pre-deploy step in CI, never auto-migrate on app boot.