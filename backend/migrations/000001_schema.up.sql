-- 000001_schema.sql
-- Source of truth: docs/schema.md

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE request_status AS ENUM ('initiated', 'pending', 'success', 'failed');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'failed');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE invitation_status AS ENUM ('sent', 'accepted', 'expired', 'revoked');

-- Admins
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    firebase_uid TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (Employees)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    firebase_uid TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    status user_status NOT NULL DEFAULT 'active',
    is_terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    terms_version TEXT,
    user_ip_at_consent INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    status invitation_status NOT NULL DEFAULT 'sent',
    invited_by UUID REFERENCES admins(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_one_active_invitation_per_email
ON invitations (email) WHERE (status IN ('sent', 'accepted'));

-- Phone Verifications
CREATE TABLE phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    phone_number TEXT NOT NULL,
    transaction_id TEXT,
    verification_code CHAR(6),
    fee_xaf NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (fee_xaf = 5.00),
    status verification_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX idx_phone_verifications_user_id ON phone_verifications (user_id);
CREATE INDEX idx_phone_verifications_status ON phone_verifications (user_id, status);

-- Advance Requests
CREATE TABLE advance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount_xaf NUMERIC(10, 2) NOT NULL DEFAULT 10000.00 CHECK (amount_xaf = 10000.00),
    status request_status NOT NULL DEFAULT 'initiated',
    campay_payout_ref TEXT UNIQUE,
    failure_reason TEXT,
    payout_duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One request attempt per day per user (Cameroon time)
CREATE UNIQUE INDEX idx_one_request_per_day
ON advance_requests (user_id, ((created_at AT TIME ZONE 'Africa/Douala')::DATE));

-- One successful advance per calendar month (Cameroon time)
CREATE UNIQUE INDEX idx_one_success_per_month
ON advance_requests (
    user_id,
    EXTRACT(MONTH FROM created_at AT TIME ZONE 'Africa/Douala'),
    EXTRACT(YEAR FROM created_at AT TIME ZONE 'Africa/Douala')
) WHERE (status = 'success');

CREATE INDEX idx_advance_requests_user_id ON advance_requests (user_id);

-- Event Logs
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

-- Surveys
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    request_id UUID NOT NULL REFERENCES advance_requests(id),
    satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, request_id)
);

-- System Config
CREATE TABLE system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
