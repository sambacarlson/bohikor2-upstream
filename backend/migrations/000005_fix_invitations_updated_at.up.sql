-- 000005_fix_invitations_updated_at.sql
-- AGENTS.md requires every UPDATE query to explicitly set updated_at = NOW()
-- The invitations table currently lacks this column in UPDATE queries.

ALTER TABLE invitations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
