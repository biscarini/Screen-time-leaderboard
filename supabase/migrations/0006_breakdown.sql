-- Where the time went, and how often the phone was picked up.
--
-- Both are context, not competition: ranking stays on `minutes` alone. Adding
-- a second ranked metric would mean two leaderboards and an argument about
-- which one counts.

alter table submissions
  -- Top three apps from the "Most Used" list: [{"name": "Instagram", "minutes": 165}]
  -- Capped at three and stored as one document because it is display data
  -- attached to a submission, never something to join against.
  add column top_apps jsonb not null default '[]'::jsonb
    constraint top_apps_is_short_array check (
      jsonb_typeof(top_apps) = 'array' and jsonb_array_length(top_apps) <= 3
    ),

  -- From the Pickups card. Total is the number people quote; the daily average
  -- is the one that survives a partial week, so both are kept.
  add column pickups_total     int check (pickups_total     between 0 and 20000),
  add column pickups_daily_avg int check (pickups_daily_avg between 0 and 5000),

  -- The Pickups card lives further down the report than the Screen Time card,
  -- so it takes a second screenshot. Optional — a submission is valid without it.
  add column pickups_screenshot_path text;

comment on column submissions.top_apps is
  'Top three "Most Used" apps, descending by minutes. Display only — never ranked on.';
comment on column submissions.pickups_screenshot_path is
  'Second screenshot, showing the Pickups card. Null when the member skipped it.';

-- The views were defined in 0002, before these columns existed. `create or
-- replace view` can only append columns, and these belong beside the ones they
-- relate to — so both views are rebuilt.
drop view if exists member_week_history;
drop view if exists week_standings;

create view week_standings
with (security_invoker = true) as
select
  w.group_id,
  w.id          as week_id,
  w.starts_on,
  w.ends_on,
  w.status,
  s.user_id,
  s.minutes,
  s.screenshot_path,
  s.pickups_screenshot_path,
  s.top_apps,
  s.pickups_total,
  s.pickups_daily_avg,
  s.was_corrected,
  s.created_at  as submitted_at,
  rank() over (partition by s.week_id order by s.minutes) as rank
from submissions s
join weeks w on w.id = s.week_id;

create view member_week_history
with (security_invoker = true) as
select
  ws.*,
  lag(ws.minutes) over (
    partition by ws.group_id, ws.user_id order by ws.starts_on
  ) as prev_minutes,
  ws.minutes - lag(ws.minutes) over (
    partition by ws.group_id, ws.user_id order by ws.starts_on
  ) as delta_minutes
from week_standings ws;
