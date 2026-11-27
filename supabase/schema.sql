-- AttuneUI study storage. Run once in the Supabase SQL editor.
-- Only the server (secret key) reads or writes: RLS is on and there are no policies.

create table if not exists public.participants (
  id uuid primary key,
  created_at timestamptz not null default now(),
  phase text not null check (phase in ('test', 'pilot', 'confirmatory')),
  pointer text not null check (pointer in ('mouse', 'touch', 'pen')),
  viewport_width integer not null check (viewport_width between 0 and 10000),
  arm text not null check (arm in ('A', 'B', 'C', 'P')), -- P: pilot
  variant_order text not null check (variant_order in ('AB', 'BA')),
  seq integer check (seq >= 0), -- allocation slot; null when assigned offline
  offline boolean not null default false,
  repeat_device boolean not null default false,
  unique (phase, pointer, seq)
);

create table if not exists public.events (
  participant_id uuid not null references public.participants (id) on delete cascade,
  seq integer not null check (seq between 0 and 10000),
  block smallint not null check (block in (1, 2, 3)),
  kind text not null check (kind in ('task', 'interactions', 'rating', 'decision', 'chip', 'done')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 200000),
  created_at timestamptz not null default now(),
  primary key (participant_id, seq)
);

-- Upgrades tables created by an earlier version of this file; safe to re-run.
alter table public.participants drop constraint if exists participants_arm_check;
alter table public.participants add constraint participants_arm_check check (arm in ('A', 'B', 'C', 'P'));
alter table public.events drop constraint if exists events_block_check;
alter table public.events add constraint events_block_check check (block in (1, 2, 3));

alter table public.participants enable row level security;
alter table public.events enable row level security;

revoke all on public.participants, public.events from anon, authenticated;
grant select, insert, update on public.participants to service_role;
grant select, insert on public.events to service_role;

-- Live /demo snapshots for the admin page. Short-lived; never study data.
create table if not exists public.live_sessions (
  id uuid primary key,
  updated_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 16000)
);
alter table public.live_sessions enable row level security;
revoke all on public.live_sessions from anon, authenticated;
grant select, insert, update, delete on public.live_sessions to service_role;
