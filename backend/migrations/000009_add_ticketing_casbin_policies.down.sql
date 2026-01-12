-- Remove ticketing Casbin policies

-- Remove admin inheritance
DELETE FROM casbin_rule WHERE ptype = 'g' AND v0 = 'admin' AND v1 = 'organizer';

-- Remove organizer-specific policies
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'organizer' AND v1 LIKE '/api/v1/events%';
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'organizer' AND v1 LIKE '/api/v1/ticket-types%';
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'organizer' AND v1 LIKE '/api/v1/tickets%';

-- Remove organizer inheritance
DELETE FROM casbin_rule WHERE ptype = 'g' AND v0 = 'organizer' AND v1 = 'customer';

-- Remove customer policies
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'customer' AND v1 LIKE '/api/v1/events%';
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'customer' AND v1 LIKE '/api/v1/bookings%';
DELETE FROM casbin_rule WHERE ptype = 'p' AND v0 = 'customer' AND v1 LIKE '/api/v1/tickets%';
