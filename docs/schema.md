# Data Contract & Schema — Epic 1: Authentication

This document defines the canonical database schema for the current implementation scope (authentication only). Tables for salary advances, Campay payouts, surveys, and the kill switch will be added in future epics.

## Timezone Convention

All timestamp columns use `TIMESTAMPTZ` (stored in UTC). Business-logic date boundaries must be evaluated in `Africa/Douala` timezone (WAT, UTC+1).

## SQL DDL (PostgreSQL 17)

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Enums

```sql
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE invitation_status AS ENUM ('pending', 'sent', 'accepted', 'revoked', 'failed');
```

### Admins

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    firebase_uid TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Users (Employees)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    firebase_uid TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT NOT NULL,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status user_status NOT NULL DEFAULT 'active',
    is_terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    terms_version TEXT,
    user_ip_at_consent INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> `updated_at` has no auto-update trigger. All Go update queries **must** explicitly set `updated_at = NOW()`.

### Invitations

```sql
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES admins(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_one_active_invitation_per_email
ON invitations (email) WHERE (status IN ('pending', 'sent', 'accepted'));
```

### Email OTPs (temporary)

```sql
CREATE TABLE email_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otps_email ON email_otps (email);
CREATE INDEX idx_email_otps_expires_at ON email_otps (expires_at);
```

OTP records are consumed (deleted) on successful verification. Expired records should be cleaned up periodically.

### Events

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    admin_id UUID REFERENCES admins(id),
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user_id ON events (user_id);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_created_at ON events (created_at);
```

Auth event types: `user_invited`, `email_otp_sent`, `email_otp_verified`, `phone_otp_verified`, `signup_completed`, `user_suspended`, `user_activated`.

## Integrity Rules

- **Foreign Keys:** `ON DELETE RESTRICT` for users and admins to preserve audit trails.
- **IDs:** UUIDs via `uuid_generate_v4()`.
- **Timestamps:** All `TIMESTAMPTZ`. No auto-update triggers; application layer sets `updated_at`.

## Design Decisions

| Question | Resolution |
| :--- | :--- |
| **Invitation expiry** | No automatic expiry in MVP. Invitations remain valid until accepted or revoked. The `revoked` and `failed` statuses are available for manual revocation or email delivery failure. |
| **Phone verification** | Firebase Phone OTP. Phone number is the primary identity for returning users. Email is verified separately via Resend OTP. |
| **Data retention** | Indefinite. No automated deletion. |