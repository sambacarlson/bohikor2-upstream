-- 000006_email_otps.sql
-- Temporary storage for email OTP codes during mobile signup flow

CREATE TABLE email_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otps_email ON email_otps (email);
CREATE INDEX idx_email_otps_expires_at ON email_otps (expires_at);

-- Auto-cleanup: delete expired OTPs (optional, can also be done via cron)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-expired-otps', '*/5 * * * *', $$DELETE FROM email_otps WHERE expires_at < NOW()$$);
