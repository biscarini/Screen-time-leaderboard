-- Compete on a finished week, not a week in progress.
--
-- iOS's Screen Time report lets you page back to the previous week, where all
-- seven days are complete and the Daily Average is a true 7-day average. That
-- removes the reason the window had to be narrow: submissions were previously
-- comparable only because everyone screenshotted a partial week at roughly the
-- same moment. Reading a finished week instead, the numbers are comparable by
-- construction, so the window can be generous.
--
-- What changes: the week a group competes on is now the calendar week BEFORE
-- the one containing today. The submission window lives in the days right
-- after that week ends — Sunday 06:00 to Monday 22:00, group-local — and is
-- still measured as minutes since Sunday 00:00, so the clock arithmetic in
-- group_clock_at is untouched.

alter table groups
  alter column opens_dow   set default 7,   -- Sunday
  alter column opens_hour  set default 6,
  alter column closes_dow  set default 1,   -- Monday
  alter column closes_hour set default 22;

-- Existing groups were configured for the old Saturday-morning window, which
-- points at a week that is no longer the one being scored.
update groups
   set opens_dow = 7, opens_hour = 6, closes_dow = 1, closes_hour = 22
 where (opens_dow, opens_hour, closes_dow, closes_hour) = (6, 6, 6, 12);

comment on column groups.opens_dow is
  'Day the upload window opens, in the calendar week AFTER the week being scored. ISO: 1 = Mon … 7 = Sun.';

create or replace function public.roll_weeks_at(p_group_id uuid, p_now timestamptz)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c record;
  active_start date;
  wid uuid;
begin
  select * into c from group_clock_at(p_group_id, p_now);
  if not found then
    return null;
  end if;

  -- The week being competed on is the one that has already finished: the
  -- calendar week before the one containing today.
  active_start := c.week_start - 7;

  -- Any other open week is done, whatever the cron did or didn't do. `<>`
  -- rather than `<` so a week ahead of this one — reachable when an admin moves
  -- the group to a timezone that is behind — cannot sit open forever and block
  -- the insert below on one_open_week_per_group.
  update weeks set status = 'closed', closed_at = coalesce(closed_at, p_now)
   where group_id = p_group_id and status = 'open' and starts_on <> active_start;

  insert into weeks (group_id, starts_on, ends_on)
  values (p_group_id, active_start, active_start + 6)
  on conflict (group_id, starts_on) do nothing;

  -- The clock decides the active week's status outright, so the function is
  -- authoritative rather than insert-or-ignore. Uploads run from the window
  -- opening on Sunday until it closes; outside that, the week is final.
  update weeks
     set status    = case when c.now_min < c.close_min then 'open' else 'closed' end,
         closed_at = case when c.now_min < c.close_min
                          then null else coalesce(closed_at, p_now) end
   where group_id = p_group_id and starts_on = active_start;

  select id into wid
    from weeks where group_id = p_group_id and starts_on = active_start;
  return wid;
end $$;
