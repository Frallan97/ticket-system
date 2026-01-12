-- Seats table for events with assigned seating
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    row_label VARCHAR(10) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    ticket_type_id INT REFERENCES ticket_types(id) ON DELETE SET NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, section, row_label, seat_number)
);

-- Indexes for performance
CREATE INDEX idx_seats_event ON seats(event_id);
CREATE INDEX idx_seats_availability ON seats(event_id, is_available);

-- Seat locks table to prevent double booking during checkout
CREATE TABLE IF NOT EXISTS seat_locks (
    id SERIAL PRIMARY KEY,
    seat_id INT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(seat_id)
);

-- Index for cleaning up expired locks
CREATE INDEX idx_seat_locks_expiry ON seat_locks(expires_at);
