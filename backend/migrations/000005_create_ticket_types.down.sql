-- Drop ticket_types table
DROP TRIGGER IF EXISTS ticket_types_updated_at ON ticket_types;
DROP INDEX IF EXISTS idx_ticket_types_event;
DROP TABLE IF EXISTS ticket_types;
