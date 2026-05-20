# Bohikor2 — UX Flows & Edge Cases

## 1. Mobile App Flows

### 1.1 First-Time Onboarding (Email → Phone → Main Screen)

#### Step 1: Enter Email + Phone Number

**Screen:** `/(auth)/signup`

**UI:**
- Email input field
- Phone number input field (+237 format)
- "Continue" button

**Flow:**
1. User enters email and phone number
2. Taps "Continue"
3. App validates email format and phone number format
4. App calls `POST /api/auth/check-invitation` with email
5. Backend checks `invitations` table for matching email with `status = 'sent'`

**If email IS invited:**
- Proceed to Step 2 (Email OTP)

**If email is NOT invited:**
- Show inline error: "Your email is not in our system. Check your inbox for an invitation email, or contact your manager to request one."
- User stays on the same screen
- "Continue" button remains disabled until a valid invited email is entered

**Edge cases:**
- Email already accepted → Show: "This email has already been used to sign up. Please log in with your phone number."
- Email invitation revoked → Show: "Your invitation has been revoked. Contact your manager."
- Email invitation expired → Show: "Your invitation has expired. Contact your manager to send a new one."
- Network error → Show: "Connection error. Please try again."
- Invalid email format → Inline validation error before API call
- Invalid phone format → Inline validation error before API call

#### Step 2: Email OTP Verification

**Screen:** `/(auth)/verify-email`

**UI:**
- Display: "We sent a 6-digit code to {email}"
- 6-digit OTP input
- "Verify" button (disabled until 6 digits entered)
- "Resend code" link (disabled for 60 seconds)
- "← Back" to return to Step 1

**Flow:**
1. Backend generates 6-digit code, stores in Redis/memory with 10-minute expiry, sends via Resend
2. User enters the 6-digit code from their email
3. Taps "Verify"
4. App calls `POST /api/auth/verify-email-otp` with email + code
5. Backend validates code

**If code is correct:**
- Mark email as verified in local persisted state (AsyncStorage)
- Proceed to Step 3 (Phone OTP)

**If code is incorrect:**
- Show inline error: "Invalid code. Please try again."
- Allow retry

**If code expired:**
- Show: "Code expired. Please request a new one."
- Enable "Resend code"

**Edge cases:**
- Wrong email entered in Step 1 → User taps "← Back", changes email, restarts
- User closes app mid-verification → State is persisted. On reopen, if email was verified, skip to Step 3. If not, resume at Step 2 with "Resend code" enabled.
- Resend rate limit → Show: "Please wait {X} seconds before requesting a new code."
- Email not delivered → "Resend code" available after 60s cooldown
- Too many failed attempts (5+) → Lock for 15 minutes, show: "Too many attempts. Please try again in 15 minutes."

#### Step 3: Phone Number OTP Verification (Firebase Phone Auth)

**Screen:** `/(auth)/verify-phone`

**UI:**
- Display: "Verifying phone number: {phone}"
- "Send Code" button
- After code sent: 6-digit OTP input
- "Verify" button (disabled until 6 digits entered)
- "Resend code" link (disabled for 60 seconds)
- "← Back" to return to Step 2

**Flow:**
1. App calls Firebase `signInWithPhoneNumber(phoneNumber)`
2. Firebase sends SMS with OTP
3. User enters the 6-digit code from SMS
4. Taps "Verify"
5. App calls Firebase `confirmationResult.confirm(code)`
6. Firebase returns user credential with ID token
7. App calls `POST /api/auth/complete-signup` with:
   - Firebase ID token
   - Email (verified in Step 2)
   - Phone number
8. Backend:
   - Verifies Firebase ID token
   - Checks email was previously verified (via session/token claim)
   - Creates `users` record (`email`, `firebase_uid`, `phone_number`, `status = 'active'`)
   - Updates `invitations` record (`status = 'accepted'`, `accepted_at = NOW()`)
   - Logs event: `signup_completed`
   - Returns user object + auth token

**If phone OTP is correct:**
- User is created, invitation accepted, redirected to main screen `/(app)/home`

**If phone OTP is incorrect:**
- Firebase returns error → Show: "Invalid code. Please try again."

**Edge cases:**
- SMS not received → "Resend code" after 60s
- Wrong phone number → "← Back" to Step 1 to re-enter
- Phone number already registered → Backend returns error → Show: "This phone number is already registered. Please log in."
- Firebase quota exceeded → Show: "SMS service temporarily unavailable. Please try again later."
- User closes app mid-verification → On reopen:
  - If email verified but phone not → Resume at Step 3
  - If both verified but signup incomplete → Retry `POST /api/auth/complete-signup`
- Android without Google Play Services → Firebase phone auth may fail → Show: "Please use a device with Google Play Services, or contact support."

### 1.2 Returning User Login

**Screen:** `/(auth)/login`

**UI:**
- Phone number input
- "Continue" button

**Flow:**
1. User enters phone number
2. App calls Firebase `signInWithPhoneNumber(phoneNumber)`
3. Firebase sends SMS OTP
4. User enters code
5. Firebase verifies → returns ID token
6. App calls `POST /api/auth/verify` with Firebase ID token
7. Backend:
   - Verifies token
   - Checks `auth_time` claim — if > 30 days since last auth, reject and require re-auth
   - Looks up user by `firebase_uid`
   - Checks `users.status` — if `suspended`, reject with message
   - Returns user object

**If user is active:**
- Redirect to `/(app)/home`

**If user is suspended:**
- Show: "Your account has been suspended. Contact your manager."
- Block access

**If user not found:**
- Show: "No account found with this phone number. Please sign up first."
- Redirect to `/(auth)/signup`

**Edge cases:**
- 30-day session expired → Force re-authentication (same flow, user just re-enters phone + OTP)
- Suspended account → Blocked with clear message
- Phone number changed → User must contact admin (phone cannot be changed in MVP)

### 1.3 Main Screen (Home)

**Screen:** `/(app)/home`

**UI:**
- Greeting with user name
- Current advance status (if any)
- "Request Advance" button (if eligible)
- Status message if not eligible

**Eligibility checks (on screen load):**
1. Is current date between 15th and last day of month (Africa/Douala time)?
   - NO → Show: "Advance requests are available from the 15th to the end of each month. Next window opens on [date]."
2. Has user already attempted a request today (Africa/Douala time)?
   - YES → Show: "You've already made a request today. Try again tomorrow."
3. Has user already received a successful advance this calendar month?
   - YES → Show: "You've already received an advance this month. Next window opens on the 15th of next month."
4. Is the kill switch active?
   - YES → Show: "Advance requests are temporarily paused. Please check back later."
5. Is user suspended?
   - YES → Should have been caught at login, but double-check → Block with message

**If all checks pass:**
- "Request Advance" button is enabled

### 1.4 Request Advance

**Screen:** `/(app)/request-advance`

**UI:**
- Confirmation: "You are requesting an advance of 10,000 XAF"
- "Confirm Request" button
- "Cancel" button

**Flow:**
1. User taps "Request Advance" from home
2. Reviews amount and confirms
3. App calls `POST /api/advance-requests`
4. Backend runs eligibility checks (same as home screen, server-side)
5. If checks pass:
   - Creates `advance_requests` record with `status = 'initiated'`
   - Calls Campay Payout API
   - Logs event: `request_initiated`
   - Returns request object
6. App redirects to `/(app)/request-status`

**Edge cases:**
- Eligibility fails server-side (race condition) → Show specific error message, redirect to home
- Campay API unavailable → `status = 'initiated'`, retry logic on backend, show: "Your request is being processed. You'll be notified shortly."
- Duplicate request (double-tap) → Idempotency key prevents duplicate, show existing request status

### 1.5 Request Status

**Screen:** `/(app)/request-status`

**UI:**
- Status indicator (initiated → pending → success/failed)
- Auto-refreshes via polling or WebSocket

**States:**
- `initiated` → "Processing your request..."
- `pending` → "Payout in progress. Funds should arrive shortly."
- `success` → "10,000 XAF has been sent to your mobile money wallet!" → Auto-redirect to survey after 3 seconds
- `failed` → "Your request could not be completed. [Reason]" → Auto-redirect to survey after 3 seconds

### 1.6 Post-Payout Survey

**Screen:** `/(app)/survey`

**UI:**
- "How was your experience?"
- 1-5 star rating
- Optional feedback text field
- "Submit" button

**Flow:**
1. Shown only after `success` or `failed` status
2. User rates and optionally provides feedback
3. App calls `POST /api/surveys`
4. Creates `surveys` record
5. Logs event: `survey_submitted`
6. Redirect to home

**Edge cases:**
- User skips survey → "Skip" button available, logs no survey
- User already submitted survey for this request → Don't show again (enforced by `UNIQUE(user_id, request_id)`)

### 1.7 Terms Acceptance

**Screen:** `/(app)/terms`

**When shown:** After signup, before first advance request. Also accessible from profile.

**UI:**
- Terms and conditions text
- "I accept the terms and conditions" checkbox
- "Continue" button (disabled until checkbox checked)

**Flow:**
1. User reads terms
2. Checks the acceptance checkbox
3. Taps "Continue"
4. App calls `POST /api/auth/terms`
5. Backend updates `users` record (`is_terms_accepted = true`, `terms_accepted_at`, `terms_version`, `user_ip_at_consent`)
6. Redirect to home

**Edge cases:**
- User doesn't accept → Cannot proceed to request advance
- Terms updated → Re-show terms on next app open if `terms_version` mismatch

### 1.8 History

**Screen:** `/(app)/history`

**UI:**
- List of all advance requests with status, date, amount
- Filter by status (all, success, failed, pending)

### 1.9 Profile

**Screen:** `/(app)/profile`

**UI:**
- User name
- Email (verified badge)
- Phone number (verified badge)
- Terms acceptance status
- "Sign Out" button

**Edge cases:**
- Phone number change → Not available in MVP. Show: "To change your phone number, contact your manager."

---

## 2. Admin Dashboard Flows

### 2.1 Admin Login

**Screen:** `/login`

**UI:**
- Email input
- Password input
- "Sign In" button

**Flow:**
1. Admin enters email + password
2. Firebase `signInWithEmailAndPassword`
3. On success → redirect to `/` (dashboard)
4. Axios interceptor attaches Firebase ID token to all API requests

**Edge cases:**
- Wrong credentials → Firebase error → Show: "Invalid email or password."
- Account disabled → Firebase error → Show: "Your account has been disabled. Contact support."
- Forgot password → Use Firebase password reset flow

### 2.2 Dashboard Overview

**Screen:** `/`

**UI:**
- Stats cards:
  - Total users
  - Active requests today
  - Payout success rate
  - Average payout time (P50)
- Quick links to users, requests, kill switch, events

### 2.3 User Management

**Screen:** `/users`

**UI:**
- Table of all users with:
  - Email
  - Phone number
  - Status (active/suspended)
  - Signup date
  - Total advances
- Actions per user: Suspend / Activate
- Search/filter

**Suspend flow:**
1. Admin clicks dropdown → "Suspend"
2. Confirmation dialog: "Suspend {email}? They will not be able to access the app."
3. Admin confirms
4. App calls `PUT /api/users/:id/suspend`
5. Backend:
   - Updates `users.status = 'suspended'`, `updated_at = NOW()`
   - Disables Firebase user
   - Logs event: `user_suspended`
6. UI updates to show suspended status

**Activate flow:**
1. Admin clicks dropdown → "Activate"
2. App calls `PUT /api/users/:id/activate`
3. Backend:
   - Updates `users.status = 'active'`, `updated_at = NOW()`
   - Re-enables Firebase user
   - Logs event: `user_activated`

### 2.4 Invite Employee

**Screen:** `/invitations` or modal from `/users`

**UI:**
- Email input
- "Send Invitation" button

**Flow:**
1. Admin enters employee email
2. Taps "Send Invitation"
3. App calls `POST /api/invitations`
4. Backend:
   - Checks if email already has an active invitation → error if yes
   - Checks if email already registered as user → error if yes
   - Creates `invitations` record (`status = 'sent'`, `invited_by`, `sent_at`)
   - Sends invitation email via Resend with app download link
   - Logs event: `user_invited`
5. Shows success: "Invitation sent to {email}"

**Edge cases:**
- Email already invited (active) → "This email already has a pending invitation."
- Email already registered → "This user is already signed up."
- Email previously invited but expired → Allow re-send, update existing record or create new one

### 2.5 Request Monitoring

**Screen:** `/requests`

**UI:**
- Table of all advance requests:
  - User email
  - Amount
  - Status
  - Created at
  - Payout duration (if successful)
  - Failure reason (if failed)
- Filter by status
- Search by user email

### 2.6 Kill Switch

**Screen:** `/kill-switch`

**UI:**
- Current status indicator (Active / Inactive)
- Toggle switch
- Confirmation dialog when toggling

**Activate flow:**
1. Admin toggles to "Active"
2. Confirmation: "Activate kill switch? All new advance requests will be blocked."
3. Admin confirms
4. App calls `PUT /api/system/kill-switch` with `{ active: true }`
5. Backend updates `system_config` value, logs event: `kill_switch_activated`
6. UI shows active status

**Deactivate flow:**
1. Admin toggles to "Inactive"
2. Confirmation: "Deactivate kill switch? New advance requests will be allowed."
3. Admin confirms
4. App calls `PUT /api/system/kill-switch` with `{ active: false }`
5. Backend updates `system_config` value, logs event: `kill_switch_deactivated`

### 2.7 Event Logs

**Screen:** `/events`

**UI:**
- Table of all events:
  - Timestamp
  - Event type
  - User email (if applicable)
  - Admin email (if applicable)
  - Metadata (expandable)
- Filter by event type
- Filter by date range
- Search by user email

### 2.8 Admin Management

**Screen:** `/admins`

**UI:**
- Table of all admins:
  - Email
  - Created at
- "Invite Admin" button
- Actions: Revoke (disable)

---

## 3. Shared Edge Cases

### 3.1 Network Failures

- **Mobile:** All API calls have retry logic (3 attempts with exponential backoff). If all fail, show: "Connection error. Please check your internet and try again."
- **Admin:** Same retry logic. TanStack Query handles automatic refetch on reconnect.

### 3.2 Concurrent Requests

- **Two admins suspend the same user simultaneously:** Database `UPDATE` is atomic, second request is a no-op. Both see suspended status.
- **User requests advance while kill switch is being activated:** Server-side check at request time. If kill switch activated between client check and server processing, request is rejected.

### 3.3 Timezone Edge Cases

- **All date boundaries evaluated in Africa/Douala (WAT/UTC+1):**
  - Request window (15th–last day)
  - Daily attempt limit (1 per day)
  - Monthly success limit (1 per calendar month)
  - 30-day session expiry
- **UTC midnight boundary:** A user at 23:59 UTC (00:59 WAT next day) — the system correctly evaluates in WAT, not UTC.

### 3.4 Data Integrity

- **Duplicate payouts prevented:** Idempotency key on Campay API calls (based on `advance_requests.id`).
- **Webhook replay attacks:** HMAC signature verification on all Campay webhooks. Duplicate webhook deliveries are idempotent (status already updated → no-op).
- **Race condition on daily limit:** Database unique index `idx_one_request_per_day` prevents duplicate inserts at the DB level even if application logic races.

### 3.5 Session Management

- **Firebase ID tokens expire after 1 hour:** Client SDK auto-refreshes.
- **30-day re-authentication:** Backend checks `auth_time` claim. If > 30 days, returns `401` with `reauth_required` flag. Mobile app redirects to login.
- **Suspended user session:** Even with a valid token, backend checks `users.status` on every request. Suspended users are rejected immediately.
