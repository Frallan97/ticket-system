-- Drop seat locks table
DROP INDEX IF EXISTS idx_seat_locks_expiry;
DROP TABLE IF EXISTS seat_locks;

-- Drop seats table
DROP INDEX IF EXISTS idx_seats_availability;
DROP INDEX IF EXISTS idx_seats_event;
DROP TABLE IF EXISTS seats;
