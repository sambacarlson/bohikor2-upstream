# PLAN.md — Bohikor2

## Epic 1: Authentication (Current)

Complete auth for admin dashboard and mobile app.

- **Backend:** Firebase Admin SDK integration, Resend email OTP, auth middleware, role middleware, invitation CRUD, user creation, email/phone verification endpoints
- **Admin Dashboard:** Email/password login via Firebase, invite page, users list with suspend/activate
- **Mobile:** Phone login (returning user), email invitation check → email OTP → phone OTP (new user), home screen with user info

## Epic 2: Salary Advance Core

- Request window enforcement (15th–end of month, Africa/Douala timezone)
- Daily/monthly throttling
- Campay payout API integration
- Kill switch

## Epic 3: Admin Monitoring

- Request monitoring dashboard
- Kill switch toggle
- Event logs

## Epic 4: Pilot Launch

- E2E testing
- Production deployment
- Observability