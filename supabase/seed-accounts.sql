-- Provision staff accounts and fleet.
--
-- Run in the Supabase SQL editor, which executes as the table owner and
-- therefore bypasses RLS. This is deliberate and is the ONLY way driver and
-- dispatcher profiles can be created: self-signup is restricted to
-- role = 'customer' by policy AND by the guard_profile_role trigger, so a user
-- can never promote themselves. See supabase/schema.sql.
--
-- The auth.users rows must exist first — a profile's id references them. They
-- are created by signing in once with each number (test OTPs, so no SMS).
--
-- Safe to re-run.

-- ── Driver ──────────────────────────────────────────────────────────────────
-- +675 72453312 (SIM 2). Named from the design cast so test runs stay legible:
-- the customer reads as "Andy K." and the driver as "Marisol A.".

insert into profiles (id, role, name, phone, rating, total_rides, online)
values (
  'e57709b2-e7e4-46b0-b0ad-dd3d04128934',
  'driver',
  'Marisol A.',
  '67572453312',
  4.94,
  2180,
  false
)
on conflict (id) do update
  set role = excluded.role,
      name = excluded.name,
      rating = excluded.rating,
      total_rides = excluded.total_rides;

-- Their car. tier is REQUIRED — assignment filters on it (CLAUDE.md), and
-- seats gates upgrade-at-quote offers against party size.
insert into vehicles (tier, seats, make, model, colour, plate, driver_id)
values ('go', 4, 'Toyota', 'Corolla', 'Silver', 'KB 41 508', 'e57709b2-e7e4-46b0-b0ad-dd3d04128934')
on conflict (plate) do update
  set driver_id = excluded.driver_id,
      tier = excluded.tier,
      seats = excluded.seats;

-- A second car in another tier, so the Office console has a real tier filter
-- to exercise and the upgrade-at-quote path is reachable. Unassigned until a
-- second driver exists.
insert into vehicles (tier, seats, make, model, colour, plate)
values ('xl', 6, 'Toyota', 'HiAce', 'White', 'KB 77 002')
on conflict (plate) do nothing;

-- ── Dispatcher ──────────────────────────────────────────────────────────────
-- +675 70000002, the Office console in a browser. Customers and drivers see
-- this name ("At the Office · Ravi K.") — never the word "dispatch".

insert into profiles (id, role, name, phone, ward)
values (
  '0cc0e0a1-eb31-4200-a195-8d480c02bd1b',
  'dispatcher',
  'Ravi K.',
  '67570000002',
  'Kingsway ward'
)
on conflict (id) do update
  set role = excluded.role,
      name = excluded.name,
      ward = excluded.ward;

-- ── Places (the service map) ────────────────────────────────────────────────
--
-- ⚠ SAMPLE DATA — VERIFY BEFORE USING FOR REAL BOOKINGS.
--
-- Real Port Moresby landmarks with APPROXIMATE coordinates, good enough to
-- exercise booking end to end. Every fare is computed from these, so a
-- coordinate that is off by a kilometre is a fare that is wrong by a kilometre.
-- Check each against a map, and add the points you actually serve.
--
-- Riders can only book between places listed here, so this table is the
-- service map: if it is empty, nobody can book anything.

insert into places (name, address, ward, lat, lng) values
  ('Jacksons International Airport', 'Airport Road, 7 Mile',    'Moresby North East', -9.4438, 147.2200),
  ('Vision City',                    'Waigani Drive, Waigani',  'Moresby North West', -9.4200, 147.1870),
  ('Boroko',                         'Okari Street, Boroko',    'Moresby North East', -9.4640, 147.1930),
  ('Ela Beach',                      'Ela Beach Road, Town',    'Moresby South',      -9.4790, 147.1560),
  ('Gerehu Stage 4',                 'Gerehu Drive, Gerehu',    'Moresby North West', -9.3830, 147.1560),
  ('Port Moresby General Hospital',  'Taurama Road, Korobosea', 'Moresby South',      -9.4750, 147.2000)
on conflict do nothing;

-- ── Check ───────────────────────────────────────────────────────────────────
select p.role, p.name, p.phone, v.plate, v.tier
from profiles p
left join vehicles v on v.driver_id = p.id
order by p.role;
