-- 000001_schema.down.sql
-- Reverse of 000001_schema.up.sql
-- Drop order respects foreign key dependencies.

DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS email_otps;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS user_status;