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
-- Week boundaries. 2026-08-22 is a Saturday; that week runs Sun 16 -> Sat 22.
-- All times below are UTC, and New York is UTC-4 in August.
-- ---------------------------------------------------------------------------

select roll_weeks_at(:'gid', timestamptz '2026-08-19 15:00-04') as w1 \gset
-- (Wednesday)
select assert((select starts_on from weeks where id = :'w1') = date '2026-08-16',
              'midweek sits in the Sunday-start week');
select assert((select ends_on   from weeks where id = :'w1') = date '2026-08-22',
              'the week ends on the Saturday');
select assert((select status from weeks where id = :'w1') = 'open',
              'midweek, the week is open');
select assert(window_open_at(:'gid', timestamptz '2026-08-19 15:00-04') = false,
              'midweek, the upload window is shut');

select assert(window_open_at(:'gid', timestamptz '2026-08-22 05:59-04') = false,
              'Saturday 05:59 is before the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-22 06:00-04') = true,
              'Saturday 06:00 opens the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-22 11:59-04') = true,
              'Saturday 11:59 is still inside the window');
select assert(window_open_at(:'gid', timestamptz '2026-08-22 12:00-04') = false,
              'Saturday 12:00 shuts the window');

-- The window is read in the group's timezone, not the server's.
select assert(window_open_at(:'gid', timestamptz '2026-08-22 08:00+00') = false,
              '08:00 UTC is 04:00 in New York — still shut');
select assert(window_open_at(:'gid', timestamptz '2026-08-22 14:00+00') = true,
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
-- Rolling over. Saturday 12:30 closes the week; Sunday opens the next.
-- ---------------------------------------------------------------------------

select roll_weeks_at(:'gid', timestamptz '2026-08-22 12:30-04') as w1b \gset
select assert(:'w1b' = :'w1', 'after the window, the group is still in the same week');
select assert((select status from weeks where id = :'w1') = 'closed',
              'the week closes when the window shuts');
select assert((select closed_at is not null from weeks where id = :'w1'),
              'closing stamps closed_at');

select roll_weeks_at(:'gid', timestamptz '2026-08-23 00:30-04') as w2 \gset
-- (Sunday)
select assert(:'w2' <> :'w1', 'Sunday starts a new week');
select assert((select starts_on from weeks where id = :'w2') = date '2026-08-23',
              'the new week starts on the Sunday');
select assert((select status from weeks where id = :'w2') = 'open',
              'the new week is open');
select assert((select count(*) from weeks
                where group_id = :'gid' and status = 'open') = 1,
              'only one week is open at a time');

-- A gap in the cron must not leave a stale week open.
select roll_weeks_at(:'gid', timestamptz '2026-09-09 10:00-04') as w4 \gset
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

do $$
begin
  update groups set opens_hour = 18, closes_hour = 6;
  raise exception 'FAILED: a wrapping window was accepted';
exception when check_violation then
  raise notice '  ok   a window that closes before it opens is rejected';
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
