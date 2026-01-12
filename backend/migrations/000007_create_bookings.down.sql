-- Drop bookings table
DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
DROP INDEX IF EXISTS idx_bookings_status;
DROP INDEX IF EXISTS idx_bookings_reference;
DROP INDEX IF EXISTS idx_bookings_event;
DROP INDEX IF EXISTS idx_bookings_customer;
DROP TABLE IF EXISTS bookings;
