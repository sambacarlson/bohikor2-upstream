-- 000002_seed_kill_switch.sql
-- Seed the kill switch as inactive by default.

INSERT INTO system_config (key, value) VALUES ('kill_switch', '{"active": false}');
