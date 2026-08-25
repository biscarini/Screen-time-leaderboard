-- Screen Time Leaderboard — initial schema
-- Postgres / Supabase. Six tables, two views, everything else derived.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,          -- short, shareable, e.g. 'TIDE-4417'
  timezone    text not null default 'America/New_York',

  -- Submission window, in group-local time. Defaults: Fri 18:00 -> Sat 12:00.
  -- ISO day of week: 1 = Monday ... 7 = Sunday.
  opens_dow   smallint not null default 5 check (opens_dow between 1 and 7),
  opens_hour  smallint not null default 18 check (opens_hour between 0 and 23),
  closes_dow  smallint not null default 6 check (closes_dow between 1 and 7),
  closes_hour smallint not null default 12 check (closes_hour between 0 and 23),

  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table group_members (
  group_id  uuid not null references groups on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  role      text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index on group_members (user_id);

-- ---------------------------------------------------------------------------
-- Weeks
-- One row per group per competition week. Sunday -> Saturday, matching the
-- week boundary Apple uses in the iOS Screen Time report.
-- ---------------------------------------------------------------------------

create table weeks (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups on delete cascade,
  starts_on date not null,                   -- Sunday, group-local
  ends_on   date not null,                   -- Saturday, group-local
  status    text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  unique (group_id, starts_on),
  check (ends_on = starts_on + 6)
);

-- At most one open week per group.
create unique index one_open_week_per_group
  on weeks (group_id) where status = 'open';

-- ---------------------------------------------------------------------------
-- Submissions
-- One screenshot + one confirmed number, per person, per week.
-- `minutes` is the single source of truth for ranking; everything the UI shows
-- (h/m formatting, deltas, ranks, records) is derived from it.
-- ---------------------------------------------------------------------------

create table submissions (
  id               uuid primary key default gen_random_uuid(),
  week_id          uuid not null references weeks on delete cascade,
  user_id          uuid not null references profiles on delete cascade,

  minutes          int not null check (minutes between 0 and 1440),  -- confirmed daily average
  detected_minutes int check (detected_minutes between 0 and 1440),  -- what the vision pass read
  was_corrected    boolean generated always as
                     (detected_minutes is distinct from minutes) stored,

  screenshot_path  text not null,   -- storage key: {group_id}/{week_id}/{user_id}/{uuid}.jpg
  extraction       jsonb,           -- raw model response: confidence, total, week label, scope

  created_at       timestamptz not null default now(),
  unique (week_id, user_id)
);

create index on submissions (user_id);

-- ---------------------------------------------------------------------------
-- Derived reads
-- Friend groups are ~5-15 people, so ranks, deltas, streaks and records are
-- computed on read. No denormalized standings table to keep in sync.
-- ---------------------------------------------------------------------------

create view week_standings as
select
  w.group_id,
  w.id            as week_id,
  w.starts_on,
  w.status,
  s.user_id,
  s.minutes,
  s.screenshot_path,
  s.created_at    as submitted_at,
  rank() over (partition by s.week_id order by s.minutes) as rank
from submissions s
join weeks w on w.id = s.week_id;

-- Same rows, plus each member's previous week, for "↓ 18m" deltas.
create view member_week_history as
select
  ws.*,
  lag(ws.minutes) over (
    partition by ws.group_id, ws.user_id order by ws.starts_on
  ) as prev_minutes,
  ws.minutes - lag(ws.minutes) over (
    partition by ws.group_id, ws.user_id order by ws.starts_on
  ) as delta_minutes
from week_standings ws;

-- ---------------------------------------------------------------------------
-- Row level security
-- Rule: you can read everything inside a group you belong to, and write only
-- your own rows.
-- ---------------------------------------------------------------------------

-- security definer to avoid recursive policy evaluation on group_members
create function is_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

alter table profiles      enable row level security;
alter table groups        enable row level security;
alter table group_members enable row level security;
alter table weeks         enable row level security;
alter table submissions   enable row level security;

create policy "read profiles of people you share a group with" on profiles
  for select using (
    id = auth.uid() or exists (
      select 1 from group_members mine
      join group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );
create policy "write your own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "read groups you belong to" on groups
  for select using (is_member(id));
create policy "anyone signed in can create a group" on groups
  for insert with check (created_by = auth.uid());

create policy "read members of your groups" on group_members
  for select using (is_member(group_id));
create policy "join or leave as yourself" on group_members
  for insert with check (user_id = auth.uid());
create policy "leave as yourself" on group_members
  for delete using (user_id = auth.uid());

create policy "read weeks of your groups" on weeks
  for select using (is_member(group_id));

create policy "read submissions in your groups" on submissions
  for select using (
    exists (select 1 from weeks w where w.id = week_id and is_member(w.group_id))
  );
create policy "submit only for yourself, only to an open week" on submissions
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from weeks w
                where w.id = week_id and w.status = 'open' and is_member(w.group_id))
  );
create policy "amend your own submission while the week is open" on submissions
  for update using (
    user_id = auth.uid()
    and exists (select 1 from weeks w where w.id = week_id and w.status = 'open')
  );

-- weeks are opened and closed by the scheduled job (service role), never by clients.
