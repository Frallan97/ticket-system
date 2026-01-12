-- Add Casbin policies for event ticketing system

-- Customer policies (all authenticated users can browse events and book tickets)
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
    -- Browse events (public)
    ('p', 'customer', '/api/v1/events', 'GET'),
    ('p', 'customer', '/api/v1/events/*', 'GET'),
    ('p', 'customer', '/api/v1/events/*/ticket-types', 'GET'),
    ('p', 'customer', '/api/v1/events/*/seats', 'GET'),
    -- Manage bookings
    ('p', 'customer', '/api/v1/bookings', '(GET)|(POST)'),
    ('p', 'customer', '/api/v1/bookings/*', 'GET'),
    ('p', 'customer', '/api/v1/bookings/*/tickets', 'GET'),
    ('p', 'customer', '/api/v1/bookings/lock-seats', 'POST'),
    -- View tickets
    ('p', 'customer', '/api/v1/tickets/*/qr', 'GET')
ON CONFLICT DO NOTHING;

-- Organizer inherits customer permissions
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
    ('g', 'organizer', 'customer')
ON CONFLICT DO NOTHING;

-- Organizer-specific policies (event management)
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
    -- Create/manage events
    ('p', 'organizer', '/api/v1/events', 'POST'),
    ('p', 'organizer', '/api/v1/events/*', '(PATCH)|(DELETE)'),
    ('p', 'organizer', '/api/v1/events/*/image', 'POST'),
    -- Manage ticket types
    ('p', 'organizer', '/api/v1/events/*/ticket-types', 'POST'),
    ('p', 'organizer', '/api/v1/ticket-types/*', '(PATCH)|(DELETE)'),
    -- Manage seats
    ('p', 'organizer', '/api/v1/events/*/seats/bulk', 'POST'),
    -- View bookings and analytics
    ('p', 'organizer', '/api/v1/events/*/bookings', 'GET'),
    ('p', 'organizer', '/api/v1/events/*/analytics', 'GET'),
    -- Check-in tickets
    ('p', 'organizer', '/api/v1/tickets/*/validate', 'POST'),
    ('p', 'organizer', '/api/v1/tickets/*/checkin', 'POST'),
    ('p', 'organizer', '/api/v1/events/*/checkin-status', 'GET')
ON CONFLICT DO NOTHING;

-- Admin inherits organizer permissions
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
    ('g', 'admin', 'organizer')
ON CONFLICT DO NOTHING;
