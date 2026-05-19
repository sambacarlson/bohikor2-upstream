-- 000001_schema.down.sql
-- Reverse of 000001_schema.up.sql
-- Drop order respects foreign key dependencies.

DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS surveys;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS advance_requests;
DROP TABLE IF EXISTS phone_verifications;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;

-- Drop enums (must be after all tables that use them)
DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS verification_status;
DROP TYPE IF EXISTS request_status;
