-- Safeco Taxi Booking — Postgres schema for Supabase.
-- Mirrors packages/shared/src/types.ts; business rules per CLAUDE.md.
-- Run in the Supabase SQL editor (or supabase db push) once the project exists.

create type tier_id as enum ('share', 'go', 'xl'); -- PROVISIONAL tier list
create type job_status as enum (
  'requested', 'at_desk', 'waiting', 'offered', 'assigned',
  'arriving', 'on_trip', 'completed', 'cancelled', 'returned'
);
create type actor_role as enum ('customer', 'driver', 'dispatcher');

create table profiles (
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

create table vehicles (
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

create table jobs (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 40121),
  customer_id uuid not null references profiles (id),
  tier tier_id not null,
  pickup jsonb not null, -- { address, location: {lat,lng} }
  dropoff jsonb not null,
  stops jsonb not null default '[]',
  note_to_driver text,
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
create table job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs (id) on delete cascade,
  actor_id uuid references profiles (id),
  event text not null, -- e.g. 'created', 'offered', 'confirmed', 'returned', 'amended'
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Every upgrade-at-quote instance is logged for cost review; the per-account
-- rate limit (UPGRADE_AT_QUOTE.rateLimitPerAccount) is enforced against this.
create table upgrade_log (
  id bigint generated always as identity primary key,
  job_id uuid not null references jobs (id),
  customer_id uuid not null references profiles (id),
  from_tier tier_id not null,
  to_tier tier_id not null,
  fare_charged numeric(10, 2) not null, -- requested tier's price
  fare_normal numeric(10, 2) not null, -- what the upgraded tier would cost
  created_at timestamptz not null default now()
);

create index jobs_status_idx on jobs (status);
create index jobs_customer_idx on jobs (customer_id);
create index job_events_job_idx on job_events (job_id);
create index upgrade_log_customer_idx on upgrade_log (customer_id, created_at);

-- RLS on everywhere; policies below are a minimal start — harden before launch.
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table jobs enable row level security;
alter table job_events enable row level security;
alter table upgrade_log enable row level security;

create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "customers see own jobs" on jobs for select using (auth.uid() = customer_id);
create policy "drivers see assigned jobs" on jobs for select using (auth.uid() = assigned_driver_id);
-- Dispatcher/staff access should use a role claim or service key; TODO before launch.
