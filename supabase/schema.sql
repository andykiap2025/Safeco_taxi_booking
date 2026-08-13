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
    'arriving', 'on_trip', 'completed', 'cancelled', 'returned'
  );
exception when duplicate_object then null; end $$;

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

create table if not exists jobs (
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
grant execute on function public.can_see_job(uuid) to authenticated;

-- ── Row-level security ──────────────────────────────────────────────────────
-- RLS on everywhere, then explicit policies per table. Anything not granted
-- below is denied: there is no permissive fallback.

alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table jobs enable row level security;
alter table job_events enable row level security;
alter table upgrade_log enable row level security;

-- profiles ...................................................................

drop policy if exists "own profile" on profiles;
drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select to authenticated
  using (
    id = auth.uid()                 -- yourself
    or public.is_dispatcher()       -- the desk sees the whole roster
    or public.shares_job_with(id)   -- your driver / your rider, while paired
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

drop policy if exists "customers book own jobs" on jobs;
create policy "customers book own jobs" on jobs for insert to authenticated
  with check (customer_id = auth.uid());

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
