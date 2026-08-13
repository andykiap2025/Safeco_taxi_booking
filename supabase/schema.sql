-- Safeco Taxi Booking — Postgres schema for Supabase.
-- Mirrors packages/shared/src/types.ts; business rules per CLAUDE.md.
-- Run in the Supabase SQL editor (or supabase db push) once the project exists.
--
-- Safe to re-run: every object is created IF NOT EXISTS or dropped first.

-- ── Types ───────────────────────────────────────────────────────────────────

do $$ begin
  create type tier_id as enum ('share', 'go', 'xl'); -- PROVISIONAL tier list
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum (
    'requested', 'at_desk', 'waiting', 'offered', 'assigned',
    'arriving', 'at_pickup', 'on_trip', 'completed', 'cancelled', 'returned'
  );
exception when duplicate_object then null; end $$;

-- Added after the table first shipped, so existing projects need it too.
alter table jobs add column if not exists route jsonb;

-- Added after the enum first shipped, so existing projects need it too.
-- 'at_pickup' separates "the driver has arrived" from "the rider has boarded".
-- Without it the driver's arrival would jump the job straight to on_trip and
-- the rider would never see the car-identification screen — the one moment
-- they check the plate before getting in.
do $$ begin
  alter type job_status add value if not exists 'at_pickup' after 'arriving';
exception when others then null; end $$;

do $$ begin
  create type actor_role as enum ('customer', 'driver', 'dispatcher');
exception when duplicate_object then null; end $$;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role actor_role not null,
  name text not null,
  phone text unique not null, -- auth is phone-OTP only
  ward text, -- dispatchers
  rating numeric(3, 2), -- drivers
  total_rides int default 0,
  online boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  tier tier_id not null, -- REQUIRED: assignment filters on this
  seats int not null check (seats > 0), -- gates upgrade offers
  make text not null,
  model text not null,
  colour text not null,
  plate text unique not null,
  driver_id uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- Known pickup and drop-off points the Office serves.
--
-- Chosen over address geocoding (2026-08-14): no external API, no per-lookup
-- cost, works offline, and it fits fixed-fare pricing between known points —
-- which is how an operator this size actually quotes. Distance is estimated
-- from the coordinates (see estimateRoute in data/fare.ts); the operator tunes
-- the road factor rather than paying for a routing service.
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- what riders see: "Vision City"
  address text not null,
  ward text,
  lat double precision,
  lng double precision,
  -- Retire a place without deleting it, so historical jobs keep their address.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists places_active_idx on places (active, name);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 40121),
  customer_id uuid not null references profiles (id),
  tier tier_id not null,
  pickup jsonb not null, -- { address, location: {lat,lng} }
  dropoff jsonb not null,
  stops jsonb not null default '[]',
  note_to_driver text,
  -- { distanceKm, durationMin } as quoted. Stored because the receipt itemises
  -- distance and time as CHARGE LINES — without this they were hardcoded
  -- display strings that never matched the fare beside them.
  route jsonb,
  party_size int, -- null → capacity proxy = requested tier's seat count
  quoted_fare jsonb not null, -- locked FareBreakdown
  amendments jsonb not null default '[]', -- confirmed add-stop amendments only
  status job_status not null default 'requested',
  assigned_driver_id uuid references profiles (id),
  assigned_vehicle_id uuid references vehicles (id),
  dispatcher_id uuid references profiles (id),
  upgrade_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit timeline surfaced to the customer ("9:29 · Ravi K. assigned Marisol").
create table if not exists job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs (id) on delete cascade,
  actor_id uuid references profiles (id),
  event text not null, -- e.g. 'created', 'offered', 'confirmed', 'returned', 'amended'
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Every upgrade-at-quote instance is logged for cost review; the per-account
-- rate limit (UPGRADE_AT_QUOTE.rateLimitPerAccount) is enforced against this.
create table if not exists upgrade_log (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs (id),
  customer_id uuid not null references profiles (id),
  from_tier tier_id not null,
  to_tier tier_id not null,
  fare_charged numeric(10, 2) not null, -- requested tier's price
  fare_normal numeric(10, 2) not null, -- what the upgraded tier would cost
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_customer_idx on jobs (customer_id);
create index if not exists jobs_driver_idx on jobs (assigned_driver_id);
create index if not exists job_events_job_idx on job_events (job_id);
create index if not exists upgrade_log_customer_idx on upgrade_log (customer_id, created_at);

-- ── updated_at maintenance ──────────────────────────────────────────────────
-- jobs.updated_at is surfaced in the UI; keep it honest server-side rather
-- than trusting every client to set it.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_touch_updated_at on jobs;
create trigger jobs_touch_updated_at
  before update on jobs
  for each row execute function public.touch_updated_at();

-- ── Role helpers ────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER on purpose: these read profiles/jobs from inside policies
-- that are themselves attached to those tables. Running them as the definer
-- bypasses RLS *inside the function only*, which is what prevents infinite
-- policy recursion. They take no user input and return no row data.

create or replace function public.current_actor_role()
returns actor_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_dispatcher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_actor_role() = 'dispatcher', false);
$$;

-- True when the current user is the customer or the assigned driver on a job
-- with `other_id` as its counterpart — i.e. the two people share a live trip
-- and may therefore see each other's name, rating and vehicle.
create or replace function public.shares_job_with(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
    where (j.customer_id = auth.uid() and j.assigned_driver_id = other_id)
       or (j.assigned_driver_id = auth.uid() and j.customer_id = other_id)
  );
$$;

-- True when `other_id` is the dispatcher who handled a job the current user is
-- on. CLAUDE.md requires customers and drivers see the dispatcher's real name
-- ("At the Office · Ravi K."), which they cannot do without reading that row.
create or replace function public.is_my_dispatcher(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
    where j.dispatcher_id = other_id
      and (j.customer_id = auth.uid() or j.assigned_driver_id = auth.uid())
  );
$$;

-- True when the current user may see a given job at all.
create or replace function public.can_see_job(j_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = j_id
      and (j.customer_id = auth.uid()
        or j.assigned_driver_id = auth.uid()
        or public.is_dispatcher())
  );
$$;

grant execute on function public.current_actor_role() to authenticated;
grant execute on function public.is_dispatcher() to authenticated;
grant execute on function public.shares_job_with(uuid) to authenticated;
grant execute on function public.is_my_dispatcher(uuid) to authenticated;
grant execute on function public.can_see_job(uuid) to authenticated;

-- ── Row-level security ──────────────────────────────────────────────────────
-- RLS on everywhere, then explicit policies per table. Anything not granted
-- below is denied: there is no permissive fallback.

alter table places enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table jobs enable row level security;
alter table job_events enable row level security;
alter table upgrade_log enable row level security;

-- places .....................................................................
-- The service map is not secret: any signed-in user needs it to book. Only the
-- Office may change it.

drop policy if exists "places readable" on places;
create policy "places readable" on places for select to authenticated using (true);

drop policy if exists "dispatcher manages places" on places;
create policy "dispatcher manages places" on places for all to authenticated
  using (public.is_dispatcher())
  with check (public.is_dispatcher());

-- profiles ...................................................................

drop policy if exists "own profile" on profiles;
drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select to authenticated
  using (
    id = auth.uid()                  -- yourself
    or public.is_dispatcher()        -- the desk sees the whole roster
    or public.shares_job_with(id)    -- your driver / your rider, while paired
    or public.is_my_dispatcher(id)   -- the Office person who handled your job
  );

-- Self-signup may only ever create a CUSTOMER. Without the role clause here a
-- new user could insert themselves as 'dispatcher', at which point
-- is_dispatcher() returns true and they can read the entire database. Driver
-- and dispatcher profiles are provisioned by the desk, or from the dashboard
-- with the service role (which bypasses RLS) to create the first dispatcher.
drop policy if exists "create own profile" on profiles;
create policy "create own profile" on profiles for insert to authenticated
  with check (
    (id = auth.uid() and role = 'customer')
    or public.is_dispatcher()
  );

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update to authenticated
  using (id = auth.uid() or public.is_dispatcher())
  with check (id = auth.uid() or public.is_dispatcher());

-- The same escalation is reachable by UPDATE — a user editing their own row to
-- role='dispatcher'. RLS cannot compare OLD to NEW, so a trigger enforces it.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_dispatcher() then
    raise exception 'Only the Office can change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on profiles;
create trigger profiles_guard_role
  before update on profiles
  for each row execute function public.guard_profile_role();

-- vehicles ...................................................................
-- Scoped rather than blanket-readable: a plate plus a driver_id is personal
-- data, so a rider sees only the car actually coming for them.

drop policy if exists "vehicles readable" on vehicles;
create policy "vehicles readable" on vehicles for select to authenticated
  using (
    public.is_dispatcher()
    or driver_id = auth.uid()
    or exists (
      select 1 from jobs j
      where j.assigned_vehicle_id = vehicles.id
        and j.customer_id = auth.uid()
    )
  );

drop policy if exists "dispatcher manages fleet" on vehicles;
create policy "dispatcher manages fleet" on vehicles for all to authenticated
  using (public.is_dispatcher())
  with check (public.is_dispatcher());

-- jobs .......................................................................

drop policy if exists "customers see own jobs" on jobs;
drop policy if exists "drivers see assigned jobs" on jobs;
drop policy if exists "jobs readable" on jobs;
create policy "jobs readable" on jobs for select to authenticated
  using (
    customer_id = auth.uid()
    or assigned_driver_id = auth.uid()
    or public.is_dispatcher()
  );

-- NO direct insert policy on jobs. Booking goes through book_ride(), which
-- prices the ride server-side — see "Fare integrity" below. Granting insert
-- here would restore the path where a client names its own fare.
drop policy if exists "customers book own jobs" on jobs;

-- Update rights are role-shaped, not column-shaped: RLS cannot restrict which
-- columns change. See the FARE INTEGRITY note at the foot of this file.
drop policy if exists "participants update jobs" on jobs;
create policy "participants update jobs" on jobs for update to authenticated
  using (
    customer_id = auth.uid()
    or assigned_driver_id = auth.uid()
    or public.is_dispatcher()
  )
  with check (
    customer_id = auth.uid()
    or assigned_driver_id = auth.uid()
    or public.is_dispatcher()
  );

-- job_events .................................................................

drop policy if exists "job events readable" on job_events;
create policy "job events readable" on job_events for select to authenticated
  using (public.can_see_job(job_id));

drop policy if exists "participants append events" on job_events;
create policy "participants append events" on job_events for insert to authenticated
  with check (public.can_see_job(job_id) and actor_id = auth.uid());

-- upgrade_log ................................................................
-- Desk-only: this is cost-review data, and customers must not be able to
-- enumerate who received discretionary upgrades.

drop policy if exists "dispatcher reads upgrade log" on upgrade_log;
create policy "dispatcher reads upgrade log" on upgrade_log for select to authenticated
  using (public.is_dispatcher());

drop policy if exists "dispatcher writes upgrade log" on upgrade_log;
create policy "dispatcher writes upgrade log" on upgrade_log for insert to authenticated
  with check (public.is_dispatcher());

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Realtime is opt-in per table. Without these, reads still work but the desk
-- would not see a new booking until someone reloaded — which is the entire
-- point of a dispatch console. RLS still applies to realtime payloads, so each
-- role only receives changes to rows it may already read.

do $$ begin
  alter publication supabase_realtime add table jobs;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table profiles;
exception when duplicate_object then null; end $$;

-- ── Fare integrity: the server prices rides, not the client ─────────────────
--
-- RLS controls WHICH ROWS a user may write, never WHICH COLUMNS. So while
-- customers could insert their own jobs directly, a crafted client could book
-- a ride at any price it liked — the fare lock was enforced only by the app.
--
-- Booking now goes through book_ride(), which recomputes the fare from server
-- config and rejects the request if the client's figure disagrees. The client
-- still quotes locally for display; the mismatch check makes any drift loud
-- instead of silently charging a different amount than the customer saw.

create table if not exists fare_config (
  id boolean primary key default true check (id), -- single row
  base numeric(10,2) not null,
  per_km numeric(10,2) not null,
  per_min numeric(10,2) not null,
  city_levy numeric(10,2) not null,
  round_step numeric(10,2) not null,
  currency text not null,
  road_factor numeric(10,3) not null,
  avg_speed_kmh numeric(10,2) not null,
  min_distance_km numeric(10,2) not null
);

-- MUST mirror FARE_RATES and ROUTE_ESTIMATE in packages/shared/src/constants.ts.
-- A difference here is not silent: book_ride rejects the booking.
insert into fare_config (id, base, per_km, per_min, city_levy, round_step, currency,
                         road_factor, avg_speed_kmh, min_distance_km)
values (true, 4.50, 1.20, 0.18, 0.70, 0.05, 'PGK', 1.350, 26.00, 0.80)
on conflict (id) do nothing;

create table if not exists tier_rates (
  id tier_id primary key,
  seats int not null,
  fare_multiplier numeric(10,4) not null,
  sort_order int not null
);

-- Mirrors TIERS in constants.ts.
insert into tier_rates (id, seats, fare_multiplier, sort_order) values
  ('share', 2, 0.6410, 0),
  ('go',    4, 1.0000, 1),
  ('xl',    6, 1.5560, 2)
on conflict (id) do update
  set seats = excluded.seats,
      fare_multiplier = excluded.fare_multiplier,
      sort_order = excluded.sort_order;

alter table fare_config enable row level security;
alter table tier_rates enable row level security;

drop policy if exists "fare config readable" on fare_config;
create policy "fare config readable" on fare_config for select to authenticated using (true);
drop policy if exists "tier rates readable" on tier_rates;
create policy "tier rates readable" on tier_rates for select to authenticated using (true);
-- No write policies: rates change by migration, never from an app.

-- Great-circle km. Mirrors haversineKm in data/fare.ts.
create or replace function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql
immutable
as $$
  select 2 * 6371 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    sin(radians(lng2 - lng1) / 2) ^ 2 * cos(radians(lat1)) * cos(radians(lat2))
  ));
$$;

-- The authoritative quote. Mirrors estimateRoute + computeQuote, including
-- summing the total from the ROUNDED components so an itemised receipt adds up.
create or replace function public.quote_ride(p_pickup uuid, p_dropoff uuid, p_tier tier_id)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c fare_config%rowtype;
  t tier_rates%rowtype;
  a places%rowtype;
  b places%rowtype;
  straight double precision;
  dist numeric;
  mins numeric;
  v_base numeric; v_dist numeric; v_time numeric;
begin
  select * into c from fare_config where id;
  select * into t from tier_rates where id = p_tier;
  select * into a from places where id = p_pickup and active;
  select * into b from places where id = p_dropoff and active;

  if a.id is null or b.id is null then
    raise exception 'Unknown pickup or destination';
  end if;
  if a.lat is null or a.lng is null or b.lat is null or b.lng is null then
    raise exception 'That journey has no map coordinates, so it cannot be priced';
  end if;

  straight := public.distance_km(a.lat, a.lng, b.lat, b.lng);
  dist := round(greatest(c.min_distance_km, (straight * c.road_factor)::numeric), 1);
  mins := greatest(1, round(dist / c.avg_speed_kmh * 60));

  v_base := round((c.base * t.fare_multiplier) / c.round_step) * c.round_step;
  v_dist := round((c.per_km * dist * t.fare_multiplier) / c.round_step) * c.round_step;
  v_time := round((c.per_min * mins * t.fare_multiplier) / c.round_step) * c.round_step;

  return jsonb_build_object(
    'base', v_base, 'distance', v_dist, 'time', v_time, 'cityLevy', c.city_levy,
    'total', v_base + v_dist + v_time + c.city_levy, 'currency', c.currency,
    'route', jsonb_build_object('distanceKm', dist, 'durationMin', mins)
  );
end;
$$;

-- Books a ride at the SERVER's price.
--
-- p_expected_total is what the customer was shown. If it disagrees with the
-- server's figure the booking is refused, so a client can never set its own
-- fare and a genuine config drift surfaces as a visible error rather than an
-- unexpected charge.
create or replace function public.book_ride(
  p_pickup uuid,
  p_dropoff uuid,
  p_tier tier_id,
  p_expected_total numeric,
  p_note text default null,
  p_party_size int default null
) returns jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  q jsonb;
  j jobs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  q := public.quote_ride(p_pickup, p_dropoff, p_tier);

  if abs((q->>'total')::numeric - p_expected_total) > 0.001 then
    raise exception 'The fare changed while you were booking (shown %, now %). Please try again.',
      p_expected_total, (q->>'total')::numeric;
  end if;

  insert into jobs (customer_id, tier, pickup, dropoff, route, quoted_fare,
                    note_to_driver, party_size, status)
  values (
    auth.uid(),
    p_tier,
    (select jsonb_build_object('address', name,
       'location', case when lat is null then null
                        else jsonb_build_object('lat', lat, 'lng', lng) end)
     from places where id = p_pickup),
    (select jsonb_build_object('address', name,
       'location', case when lat is null then null
                        else jsonb_build_object('lat', lat, 'lng', lng) end)
     from places where id = p_dropoff),
    q->'route',
    q - 'route',
    nullif(btrim(coalesce(p_note, '')), ''),
    p_party_size,
    'at_desk'
  )
  returning * into j;

  insert into job_events (job_id, actor_id, event) values (j.id, auth.uid(), 'created');
  return j;
end;
$$;

grant execute on function public.quote_ride(uuid, uuid, tier_id) to authenticated;
grant execute on function public.book_ride(uuid, uuid, tier_id, numeric, text, int) to authenticated;

-- ── Known gaps, deliberately left to application/server work ────────────────
--
-- FARE INTEGRITY: "participants update jobs" lets a customer update their own
-- job row, and RLS cannot restrict WHICH columns an update touches. A crafted
-- client could therefore PATCH quoted_fare. The fare lock is a commercial
-- promise, so before real money moves, every mutation that touches
-- quoted_fare / status / assignment must go through a SECURITY DEFINER RPC or
-- Edge Function that computes the fare server-side, and the direct update
-- policy above should be narrowed or revoked. Column-level GRANTs are the
-- lighter-weight alternative.
--
-- RATE LIMITING: UPGRADE_AT_QUOTE.rateLimitPerAccount is not enforced here.
-- It belongs in the same server-side path that writes upgrade_log, counting
-- prior rows in the window before an upgrade is offered.
