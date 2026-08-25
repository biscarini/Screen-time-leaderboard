-- Exercises the parts of the schema that are easy to get quietly wrong:
-- the week boundary, the upload window, ranking, and RLS.
-- Run with supabase/tests/run.sh.

\set ON_ERROR_STOP on
set client_min_messages = notice;

-- Two members of one group, timezone America/New_York, default window
-- (Saturday 06:00 -> 12:00).
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

set test.uid = '11111111-1111-1111-1111-111111111111';
insert into profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Jake'),
  ('22222222-2222-2222-2222-222222222222', 'Marco');

select create_group('Sunday League', 'America/New_York') as gid \gset
select assert((select name from groups where id = :'gid') = 'Sunday League',
              'create_group stores the name it was given');
select assert((select count(*) from group_members where group_id = :'gid') = 1,
              'the creator is a member');
select assert((select role from group_members where group_id = :'gid') = 'admin',
              'the creator is an admin');

set test.uid = '22222222-2222-2222-2222-222222222222';
select join_group((select lower(invite_code) from groups where id = :'gid')) as joined \gset
select assert(:'joined' = :'gid', 'join_group is case-insensitive on the code');
select assert((select count(*) from group_members where group_id = :'gid') = 2,
              'the second member joined');

-- ---------------------------------------------------------------------------
-- Weeks and the window. The group competes on the week that has FINISHED, and
-- uploads run Sunday 06:00 -> Monday 22:00 in the group's own timezone.
-- 2026-08-23 is a Sunday. All times are UTC-4, which is New York in August.
-- ---------------------------------------------------------------------------

-- Sunday 10:00: the window is open for the week that ended yesterday.
select roll_weeks_at(:'gid', timestamptz '2026-08-23 10:00-04') as w1 \gset
select assert((select starts_on from weeks where id = :'w1') = date '2026-08-16',
              'the active week is the one that already finished');
select assert((select ends_on from weeks where id = :'w1') = date '2026-08-22',
              'that week ended on the Saturday just gone');
select assert((select status from weeks where id = :'w1') = 'open',
              'during the window the finished week accepts uploads');

select assert(window_open_at(:'gid', timestamptz '2026-08-23 05:59-04') = false,
              'Sunday 05:59 is before the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-23 06:00-04') = true,
              'Sunday 06:00 opens the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-24 21:59-04') = true,
              'Monday 21:59 is still inside the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-24 22:00-04') = false,
              'Monday 22:00 shuts the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-26 12:00-04') = false,
              'midweek there is no window at all');

-- The window is read in the group's timezone, not the server's.
select assert(window_open_at(:'gid', timestamptz '2026-08-23 08:00+00') = false,
              '08:00 UTC is 04:00 in New York — still shut');
select assert(window_open_at(:'gid', timestamptz '2026-08-23 14:00+00') = true,
              '14:00 UTC is 10:00 in New York — open');

-- ---------------------------------------------------------------------------
-- Submissions and ranking, inside the window.
-- ---------------------------------------------------------------------------

set test.uid = '11111111-1111-1111-1111-111111111111';
insert into submissions (week_id, user_id, minutes, detected_minutes, screenshot_path)
values (:'w1', '11111111-1111-1111-1111-111111111111', 102, 102, 'a/b/c/d.jpg');

set test.uid = '22222222-2222-2222-2222-222222222222';
insert into submissions (week_id, user_id, minutes, detected_minutes, screenshot_path)
values (:'w1', '22222222-2222-2222-2222-222222222222', 126, 140, 'a/b/c/e.jpg');

select assert((select rank from week_standings
                where week_id = :'w1'
                  and user_id = '11111111-1111-1111-1111-111111111111') = 1,
              'the lower average ranks first');
select assert((select rank from week_standings
                where week_id = :'w1'
                  and user_id = '22222222-2222-2222-2222-222222222222') = 2,
              'the higher average ranks second');
select assert((select was_corrected from submissions
                where user_id = '11111111-1111-1111-1111-111111111111') = false,
              'an unchanged reading is not marked corrected');
select assert((select was_corrected from submissions
                where user_id = '22222222-2222-2222-2222-222222222222') = true,
              'a corrected reading is marked corrected');

-- ---------------------------------------------------------------------------
-- The breakdown: top apps and pickups. Context, never ranked on.
-- ---------------------------------------------------------------------------

update submissions
   set top_apps = '[{"name":"Instagram","minutes":165},
                    {"name":"Messages","minutes":110},
                    {"name":"Google Maps","minutes":57}]'::jsonb,
       pickups_total = 875,
       pickups_daily_avg = 125,
       pickups_screenshot_path = 'a/b/c/pickups.jpg'
 where user_id = '22222222-2222-2222-2222-222222222222' and week_id = :'w1';

select assert((select jsonb_array_length(top_apps) from submissions
                where user_id = '22222222-2222-2222-2222-222222222222'
                  and week_id = :'w1') = 3,
              'three top apps are stored');
select assert((select top_apps -> 0 ->> 'name' from submissions
                where user_id = '22222222-2222-2222-2222-222222222222'
                  and week_id = :'w1') = 'Instagram',
              'the top app keeps its position');
select assert((select pickups_total from week_standings
                where user_id = '22222222-2222-2222-2222-222222222222'
                  and week_id = :'w1') = 875,
              'pickups reach the standings view');
select assert((select top_apps from member_week_history
                where user_id = '22222222-2222-2222-2222-222222222222'
                  and week_id = :'w1') is not null,
              'top apps reach the history view');

select assert((select top_apps from submissions
                where user_id = '11111111-1111-1111-1111-111111111111') = '[]'::jsonb,
              'a submission without a breakdown defaults to an empty list');
select assert((select pickups_total is null from submissions
                where user_id = '11111111-1111-1111-1111-111111111111'),
              'pickups stay null when nobody added the second screenshot');

-- Ranking must ignore everything except minutes.
select assert((select rank from week_standings
                where week_id = :'w1'
                  and user_id = '11111111-1111-1111-1111-111111111111') = 1,
              'a member with no breakdown still ranks on screen time alone');

do $$
begin
  update submissions set top_apps = '[{"a":1},{"b":2},{"c":3},{"d":4}]'::jsonb
   where user_id = '22222222-2222-2222-2222-222222222222';
  raise exception 'FAILED: a fourth top app was accepted';
exception when check_violation then
  raise notice '  ok   more than three top apps is rejected';
end $$;

do $$
begin
  update submissions set top_apps = '{"not":"an array"}'::jsonb
   where user_id = '22222222-2222-2222-2222-222222222222';
  raise exception 'FAILED: a non-array top_apps was accepted';
exception when check_violation then
  raise notice '  ok   top_apps must be an array';
end $$;

-- ---------------------------------------------------------------------------
-- Rolling over. Monday 22:00 finalises the week; the next Sunday opens the one
-- after it, and the week in between is never competed on while it is running.
-- ---------------------------------------------------------------------------

select roll_weeks_at(:'gid', timestamptz '2026-08-24 22:30-04') as w1b \gset
select assert(:'w1b' = :'w1', 'after the window the group is still on the same week');
select assert((select status from weeks where id = :'w1') = 'closed',
              'the week finalises when the window shuts');
select assert((select closed_at is not null from weeks where id = :'w1'),
              'closing stamps closed_at');

-- Thursday: still the same finished week, still final. Nothing is open.
select roll_weeks_at(:'gid', timestamptz '2026-08-27 09:00-04') as w1c \gset
select assert(:'w1c' = :'w1', 'midweek the board still shows the last finished week');
select assert((select count(*) from weeks
                where group_id = :'gid' and status = 'open') = 0,
              'midweek nothing is open — there is nothing to submit yet');

select roll_weeks_at(:'gid', timestamptz '2026-08-30 08:00-04') as w2 \gset
-- (the next Sunday)
select assert(:'w2' <> :'w1', 'the next Sunday moves to the next finished week');
select assert((select starts_on from weeks where id = :'w2') = date '2026-08-23',
              'which is the week that ended the day before');
select assert((select status from weeks where id = :'w2') = 'open',
              'and it is open for uploads');
select assert((select count(*) from weeks
                where group_id = :'gid' and status = 'open') = 1,
              'only one week is open at a time');

-- A gap in the cron must not leave a stale week open.
select roll_weeks_at(:'gid', timestamptz '2026-09-13 08:00-04') as w4 \gset
select assert((select count(*) from weeks
                where group_id = :'gid' and status = 'open') = 1,
              'a two-week cron outage still leaves exactly one week open');
select assert((select status from weeks where id = :'w2') = 'closed',
              'the skipped week was closed, not left hanging');

-- Deltas carry across weeks for the same person.
insert into submissions (week_id, user_id, minutes, screenshot_path)
values (:'w4', '22222222-2222-2222-2222-222222222222', 96, 'a/b/f/g.jpg');
select assert((select delta_minutes from member_week_history
                where week_id = :'w4'
                  and user_id = '22222222-2222-2222-2222-222222222222') = -30,
              'the week-over-week delta is 126 -> 96 = -30');

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

select assert(
  (select count(*) from pg_constraint
    where conname = 'window_must_not_wrap') = 1,
  'the no-wrap window constraint exists');

-- Sunday 18:00 -> Monday 06:00 is a perfectly good window under the new model.
update groups set opens_dow = 7, opens_hour = 18, closes_dow = 1, closes_hour = 6;
select assert(true, 'a window may span Sunday evening into Monday morning');
update groups set opens_dow = 7, opens_hour = 6, closes_dow = 1, closes_hour = 22;

-- Monday -> Sunday would wrap past the week boundary, which is not allowed.
do $$
begin
  update groups set opens_dow = 1, opens_hour = 6, closes_dow = 7, closes_hour = 22;
  raise exception 'FAILED: a wrapping window was accepted';
exception when check_violation then
  raise notice '  ok   a window that wraps past the week boundary is rejected';
end $$;

select assert(roll_group_weeks(:'gid') is not null,
              'a member may roll their own group');

set test.uid = '';
do $$
begin
  perform roll_group_weeks((select id from groups limit 1));
  raise exception 'FAILED: a non-member rolled a group';
exception
  when sqlstate 'P0001' then
    if sqlerrm like 'FAILED%' then raise; end if;
    raise notice '  ok   a non-member cannot roll a group';
end $$;

select 'ALL SCHEMA TESTS PASSED' as result;
