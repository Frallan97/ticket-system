-- Remove demo events and their associated data
-- This will cascade delete ticket_types, seats, bookings, and tickets

DELETE FROM events WHERE title IN (
    'Summer Music Festival 2026',
    'Tech Conference 2026',
    'Comedy Night Live',
    'Food & Wine Festival',
    'Rock Concert: The Legends',
    'Art Exhibition: Modern Masters'
);
