# Salary Advance Pilot App — Project Brief

## Overview

Bohikor2 is a salary advance pilot app. The current scope (Epic 1) implements **authentication only** — admin login, employee invitation, and employee signup/login. Salary advance features (request flow, Campay payouts, surveys, kill switch) are deferred to subsequent epics.

## Authentication Flows

### Admin Dashboard

1. Admin signs in with email/password via Firebase Auth.
2. Backend verifies the Firebase ID token and confirms the user exists in the `admins` table.
3. Dashboard shows two panels: **Invite** (send invitation emails) and **Users** (list created employees).

### Mobile — Returning User (Login)

1. User enters phone number.
2. Firebase Phone Auth sends an SMS OTP.
3. User enters the OTP. Firebase verifies and returns an ID token.
4. App sends ID token to `POST /api/auth/verify`.
5. Backend looks up user by `firebase_uid`. If found and active, returns user data.
6. App routes to home screen.

**Edge cases:**
- User not found → "No account found. Please sign up first."
- User suspended → "Your account has been suspended. Contact your manager."
- 30-day session expired → Force re-authentication.

### Mobile — Fresh Start (Signup)

1. User enters the email they were invited with.
2. App calls `GET /api/auth/check-invite?email=...`. If the email has no active invitation, the user is blocked.
3. If invited, app calls `POST /api/auth/send-email-otp` → 6-digit code sent via Resend.
4. User enters the code. App calls `POST /api/auth/verify-email-otp`.
5. App navigates to phone verification. User enters their phone number.
6. Firebase Phone Auth sends an SMS OTP. User enters the code.
7. App calls `POST /api/auth/verify-phone-otp` with the phone number and the Firebase ID token.
8. Backend creates the user record, marks the invitation as accepted, logs a `signup_completed` event.
9. App routes to home screen.

**Edge cases:**
- If user already exists → "You already have an account. Please log in." → route to login.
- If invitation was already accepted but user not yet verified → route to phone verification.
- No invitation found → "Your email is not invited. Contact your manager."

## Verification

- **Employee primary identity:** Phone number (Firebase Phone Auth).
- **Employee email verification:** 6-digit OTP via Resend. Stored in `email_otps` table, consumed on success.
- **Admin identity:** Email/password via Firebase Auth.

## Data Retention

All data is retained indefinitely after the pilot concludes. No automated deletion schedule.