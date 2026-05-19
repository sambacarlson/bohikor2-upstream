# Salary Advance Pilot App — Project Brief

## Overview

Build a lightweight internal salary advance platform for a small employee pilot program. The app allows verified employees to request a one-time emergency cash advance of 10,000 XAF before payday. Requests are paid instantly through mobile money using Campay. The primary goal is not scale. The goal is to validate employee demand, payout speed, operational reliability, and user trust. This should be implemented as a simple, operationally safe MVP with strong logging and observability.

## Business Goal

Provide employees with fast access to emergency cash before payday while measuring how many employees use the service, how often they attempt requests, payout success/failure rates, and how quickly funds reach users.

## Core Rules

- **Fixed advance amount:** 10,000 XAF.
- **Request Window:** Advances can only be requested between the **15th and the last day of every month**, evaluated in **Cameroon local time (Africa/Douala, WAT/UTC+1)**.
- **One successful advance allowed per calendar month:** Deterministically managed within the request window. A success on Jan 31 does not block a request on Feb 15.
- **Maximum one request attempt per day:** Additional requests are rejected and logged. Day boundaries are evaluated in Cameroon time (Africa/Douala).
- **Uniform cap:** All users have the same cap.
- **No manual approval flow in MVP:** Payouts should be automatic.

## Primary User Types

### Employee

Can:

- sign up,
- verify identity,
- accept terms,
- request advance (only between 15th and end of month in Cameroon time),
- view request history.

### Admin

Can:

- invite employees,
- suspend users,
- monitor requests,
- monitor payout status,
- activate/deactivate kill switch,
- view analytics and logs.

## Employee Flow

### 1. Invitation

Employee receives invitation email. Track invite sent timestamp and recipient email. Expired or revoked invitations can be re-sent.

### 2. Signup

Employee signs up via the mobile app using email. Authentication is passwordless via magic link or Email OTP.

### 3. Phone Verification (Active Debit Loop)

To verify that the employee controls the mobile money wallet, an active withdrawal validation loop is initialized:

- The user inputs their mobile money phone number.
- The system triggers a mobile money collection (withdrawal pull request) via Campay for a tiny sum (**5 XAF**). This fee is **non-refundable** — it is a permanent verification charge, clearly communicated to the user in the app.
- Once the user approves the prompt and authorization succeeds, the operator generates a network transaction receipt containing a reference code.
- The app prompts the user to enter the last 6 digits of that transaction ID to match cached webhook transaction states, completing active ownership verification.
- On successful verification, the verified phone number is also stored on the `users` table for faster lookups.

### 4. Terms Acceptance

User views explicit terms and gives consent. Track consent version, consent timestamp, and user IP address.

### 5. Request Advance

User taps "Request Advance". The system runs eligibility checks:

- Check if current date (in Africa/Douala timezone) is between the **15th and the last day of the month**.
- Check daily attempt rule (evaluated in Africa/Douala timezone).
- Check monthly limit rule (one success per calendar month).
- Check if the global Admin Kill Switch is active. **Kill switch behavior:** Block all **new** requests. In-flight payouts (already in `initiated` or `pending` status) are allowed to complete but are **flagged for manual admin review**.
- If checks pass, system transitions request status to `initiated` and calls the Campay Payout API.

### 6. Payout Completion

The system listens to Campay webhooks or polls for status updates.

- **Success:** Update request status to `success` and show a completion screen to the user.
- **Failure:** Update request status to `failed`, store error details, and show a clear message to the user.

**Webhook Authentication:** All incoming Campay webhook payloads **must** be verified using cryptographic signature validation (shared secret / HMAC) before processing. Reject any webhook that fails signature verification. Store the Campay webhook secret in environment variables — never hardcode.

### 7. Feedback Survey

Immediately after a payout reaches a **final** status (`success` or `failed`), a single-question satisfaction survey is shown to the user. Surveys are not shown for `pending` or `initiated` states.

## Core Data & Tracking

### Request Records

Track:

- request ID,
- user ID,
- status,
- timestamps,
- payout reference,
- failure reason,
- payout duration.

### Event Logs

Track all major events with timestamps: `user_invited`, `otp_sent`, `otp_verified`, `signup_completed`, `request_initiated`, `payout_success`, `payout_failed`, `survey_submitted`, `kill_switch_activated`, `kill_switch_deactivated`, `user_suspended`.

## Operational Requirements

### Reliability

- Prevent duplicate payouts.
- Ensure retries are safe (idempotency keys on Campay API calls).
- Handle webhook failures gracefully (retry queue with exponential backoff).

### Security

- Minimize stored PII.
- Hash sensitive data where possible.
- Restrict admin access.
- Encrypt secrets and API keys.
- Verify all incoming Campay webhook signatures before processing.

### Observability

Critical requirement. System must easily answer: What failed? Why did it fail? How long did it take? Which users are affected?

### Success Criteria

Target payout speed: P50 ≤ 60 seconds, P90 ≤ 120 seconds.

## Data Retention

All data is retained indefinitely after the pilot concludes. No automated deletion schedule.