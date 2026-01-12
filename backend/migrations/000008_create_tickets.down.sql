-- Drop tickets table
DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
DROP INDEX IF EXISTS idx_tickets_checkin;
DROP INDEX IF EXISTS idx_tickets_code;
DROP INDEX IF EXISTS idx_tickets_event;
DROP INDEX IF EXISTS idx_tickets_booking;
DROP TABLE IF EXISTS tickets;
