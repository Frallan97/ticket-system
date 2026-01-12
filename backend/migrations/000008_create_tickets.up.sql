-- Tickets table for individual tickets within a booking
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_type_id INT NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    seat_id INT REFERENCES seats(id) ON DELETE SET NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    qr_code_data TEXT NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    is_checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP,
    checked_in_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_checkin ON tickets(event_id, is_checked_in);

-- Auto-update timestamp trigger for tickets
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
