-- Screen Time Leaderboard — tables
-- Six tables. Everything competitive is derived (see 0002_views.sql).

create extension if not exists pgcrypto;

create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  timezone    text not null default 'America/New_York',

  -- Submission window, group-local. ISO day of week: 1 = Mon ... 7 = Sun.
  -- Default: Saturday 06:00 -> Saturday 12:00. Everyone screenshots at the
  -- same point in the week, so everyone's Daily Average covers the same
  -- complete Sun-Fri set. Consistency is the whole point of the window.
  opens_dow   smallint not null default 6 check (opens_dow between 1 and 7),
  opens_hour  smallint not null default 6 check (opens_hour between 0 and 23),
  closes_dow  smallint not null default 6 check (closes_dow between 1 and 7),
  closes_hour smallint not null default 12 check (closes_hour between 0 and 23),

  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now(),

  -- The window may not wrap past Saturday midnight into the next competition
  -- week. Enforcing it here removes a whole class of week-math edge cases.
  constraint window_must_not_wrap check (
    (closes_dow % 7) * 1440 + closes_hour * 60
    > (opens_dow % 7) * 1440 + opens_hour * 60
  )
);

create table group_members (
  group_id  uuid not null references groups on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  role      text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index on group_members (user_id);

-- One row per group per competition week. Sunday -> Saturday, matching the
-- week boundary Apple uses in the iOS Screen Time report.
create table weeks (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups on delete cascade,
  starts_on date not null,
  ends_on   date not null,
  status    text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  unique (group_id, starts_on),
  check (ends_on = starts_on + 6)
);

create unique index one_open_week_per_group
  on weeks (group_id) where status = 'open';

-- One screenshot and one confirmed number, per person, per week.
create table submissions (
  id               uuid primary key default gen_random_uuid(),
  week_id          uuid not null references weeks on delete cascade,
  user_id          uuid not null references profiles on delete cascade,

  minutes          int not null check (minutes between 0 and 1440),
  detected_minutes int check (detected_minutes between 0 and 1440),
  was_corrected    boolean generated always as
                     (detected_minutes is distinct from minutes) stored,

  screenshot_path  text not null,
  extraction       jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (week_id, user_id)
);

create index on submissions (user_id);
