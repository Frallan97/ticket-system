-- Drop events table
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_date;
DROP INDEX IF EXISTS idx_events_organizer;
DROP TABLE IF EXISTS events;
