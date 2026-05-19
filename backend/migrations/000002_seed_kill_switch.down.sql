-- 000002_seed_kill_switch.down.sql
-- Reverse of 000002_seed_kill_switch.up.sql

DELETE FROM system_config WHERE key = 'kill_switch';
