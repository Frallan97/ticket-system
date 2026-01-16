-- Add demo events for demonstration purposes
-- Uses the first user as the event organizer

-- Insert demo events
INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Summer Music Festival 2026',
    'Join us for an unforgettable evening of live music featuring top artists from around the world. Experience incredible performances under the stars with food, drinks, and amazing vibes.',
    'Central Park Amphitheater',
    '123 Park Avenue, New York, NY 10001',
    '2026-07-15 19:00:00',
    '2026-07-15 18:00:00',
    TRUE,
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop',
    'published',
    5000
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Tech Conference 2026',
    'The premier technology conference featuring keynotes from industry leaders, hands-on workshops, and networking opportunities. Discover the latest innovations in AI, cloud computing, and software development.',
    'Innovation Center',
    '456 Tech Drive, San Francisco, CA 94105',
    '2026-08-22 09:00:00',
    '2026-08-22 08:00:00',
    TRUE,
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
    'published',
    2000
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Comedy Night Live',
    'Get ready for a night of non-stop laughter with some of the funniest comedians in the business. Perfect for a date night or friends outing!',
    'Downtown Comedy Club',
    '789 Laugh Lane, Chicago, IL 60601',
    '2026-06-30 20:00:00',
    '2026-06-30 19:30:00',
    TRUE,
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=600&fit=crop',
    'published',
    300
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Food & Wine Festival',
    'Indulge in exquisite cuisine from renowned chefs paired with premium wines from around the world. A culinary experience you won''t forget!',
    'Harbor Convention Center',
    '321 Waterfront Blvd, Seattle, WA 98101',
    '2026-09-10 17:00:00',
    '2026-09-10 16:30:00',
    FALSE,
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    'published',
    1500
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Rock Concert: The Legends',
    'Experience classic rock legends performing their greatest hits live. Featuring special guests and an incredible light show that will blow your mind!',
    'Metro Arena',
    '555 Stadium Way, Los Angeles, CA 90015',
    '2026-10-05 20:00:00',
    '2026-10-05 19:00:00',
    TRUE,
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop',
    'published',
    10000
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

INSERT INTO events (organizer_id, title, description, venue_name, venue_address, event_date, doors_open, has_seating, image_url, status, max_capacity)
SELECT
    (SELECT id FROM users ORDER BY created_at ASC LIMIT 1),
    'Art Exhibition: Modern Masters',
    'Explore contemporary art from emerging and established artists. This curated exhibition showcases innovative works across various mediums.',
    'City Art Gallery',
    '888 Museum Ave, Boston, MA 02101',
    '2026-07-01 10:00:00',
    '2026-07-01 10:00:00',
    FALSE,
    'https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800&h=600&fit=crop',
    'published',
    500
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

-- Add ticket types for each event
-- Summer Music Festival
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'General Admission', 'Standing room access to all stages', 89.99, 3000, 0, '2026-03-01 00:00:00', '2026-07-15 19:00:00', TRUE
FROM events WHERE title = 'Summer Music Festival 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'VIP', 'Premium seating, backstage access, and exclusive lounge', 249.99, 500, 0, '2026-03-01 00:00:00', '2026-07-15 19:00:00', TRUE
FROM events WHERE title = 'Summer Music Festival 2026';

-- Tech Conference
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Early Bird', 'Full conference access (limited time offer)', 299.00, 500, 0, '2026-02-01 00:00:00', '2026-05-01 00:00:00', TRUE
FROM events WHERE title = 'Tech Conference 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Standard', 'Full conference access', 399.00, 1000, 0, '2026-02-01 00:00:00', '2026-08-22 09:00:00', TRUE
FROM events WHERE title = 'Tech Conference 2026';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Premium', 'Conference access plus exclusive workshops', 599.00, 300, 0, '2026-02-01 00:00:00', '2026-08-22 09:00:00', TRUE
FROM events WHERE title = 'Tech Conference 2026';

-- Comedy Night
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Standard Seating', 'Regular table seating', 45.00, 200, 0, '2026-04-01 00:00:00', '2026-06-30 20:00:00', TRUE
FROM events WHERE title = 'Comedy Night Live';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Front Row', 'Premium front row seating', 75.00, 50, 0, '2026-04-01 00:00:00', '2026-06-30 20:00:00', TRUE
FROM events WHERE title = 'Comedy Night Live';

-- Food & Wine Festival
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Tasting Pass', 'Access to all food and wine tastings', 125.00, 1000, 0, '2026-05-01 00:00:00', '2026-09-10 17:00:00', TRUE
FROM events WHERE title = 'Food & Wine Festival';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'VIP Experience', 'Premium tastings, chef meet & greets, and exclusive lounge', 299.00, 200, 0, '2026-05-01 00:00:00', '2026-09-10 17:00:00', TRUE
FROM events WHERE title = 'Food & Wine Festival';

-- Rock Concert
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'General Admission', 'Standing room floor access', 79.00, 5000, 0, '2026-06-01 00:00:00', '2026-10-05 20:00:00', TRUE
FROM events WHERE title = 'Rock Concert: The Legends';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Reserved Seating', 'Assigned arena seating', 129.00, 3000, 0, '2026-06-01 00:00:00', '2026-10-05 20:00:00', TRUE
FROM events WHERE title = 'Rock Concert: The Legends';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'VIP Package', 'Premium seating, meet & greet, and exclusive merchandise', 399.00, 200, 0, '2026-06-01 00:00:00', '2026-10-05 20:00:00', TRUE
FROM events WHERE title = 'Rock Concert: The Legends';

-- Art Exhibition
INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'General Admission', 'Access to all exhibition areas', 25.00, 400, 0, '2026-05-15 00:00:00', '2026-07-01 10:00:00', TRUE
FROM events WHERE title = 'Art Exhibition: Modern Masters';

INSERT INTO ticket_types (event_id, name, description, price, quantity_available, quantity_sold, sale_start_date, sale_end_date, is_active)
SELECT id, 'Guided Tour', 'Includes guided tour with curator', 50.00, 50, 0, '2026-05-15 00:00:00', '2026-07-01 10:00:00', TRUE
FROM events WHERE title = 'Art Exhibition: Modern Masters';
