-- Derived reads. A group is 5-15 people over ~52 weeks, so ranks, deltas,
-- records and streaks are computed on read rather than stored — nothing to
-- keep in sync when someone corrects a submission.

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
  s.was_corrected,
  s.created_at  as submitted_at,
  rank() over (partition by s.week_id order by s.minutes) as rank
from submissions s
join weeks w on w.id = s.week_id;

-- Same rows plus each member's previous week, for the "down 18m" deltas.
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
