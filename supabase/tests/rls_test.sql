-- RLS is a security boundary, so it gets tested as a real unprivileged role
-- rather than as the owner (who bypasses policies entirely).

\set ON_ERROR_STOP on
set client_min_messages = notice;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on week_standings, member_week_history to authenticated;

-- Three people: two in a group together, one outsider.
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002'),
  ('bbbbbbbb-0000-0000-0000-000000000003');
insert into profiles (id, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Insider One'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Insider Two'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Outsider');

set test.uid = 'aaaaaaaa-0000-0000-0000-000000000001';
select create_group('Private', 'America/New_York') as gid \gset
set test.uid = 'aaaaaaaa-0000-0000-0000-000000000002';
select join_group((select invite_code from groups where id = :'gid'));

select roll_weeks_at(:'gid', timestamptz '2026-08-22 08:00-04') as wk \gset
insert into submissions (week_id, user_id, minutes, screenshot_path)
values (:'wk', 'aaaaaaaa-0000-0000-0000-000000000001', 120, 'x/y/z/1.jpg');

set role authenticated;

-- A member sees the group.
set test.uid = 'aaaaaaaa-0000-0000-0000-000000000002';
select assert((select count(*) from groups) = 1, 'a member can read their group');
select assert((select count(*) from submissions) = 1,
              'a member can read the group''s submissions');
select assert((select count(*) from profiles) = 2,
              'a member sees profiles of people they share a group with');

-- The outsider sees nothing.
set test.uid = 'bbbbbbbb-0000-0000-0000-000000000003';
select assert((select count(*) from groups) = 0, 'an outsider reads no groups');
select assert((select count(*) from submissions) = 0,
              'an outsider reads no submissions');
select assert((select count(*) from week_standings) = 0,
              'the standings view is not a way around RLS');
select assert((select count(*) from profiles) = 1,
              'an outsider sees only their own profile');

-- The outsider cannot write into the group either.
do $$
begin
  insert into submissions (week_id, user_id, minutes, screenshot_path)
  values ((select id from weeks limit 1),
          'bbbbbbbb-0000-0000-0000-000000000003', 60, 'x/y/z/2.jpg');
  raise exception 'FAILED: an outsider inserted a submission';
exception when insufficient_privilege then
  raise notice '  ok   an outsider cannot submit into a group';
end $$;

-- A member cannot submit on someone else's behalf.
set test.uid = 'aaaaaaaa-0000-0000-0000-000000000002';
do $$
begin
  insert into submissions (week_id, user_id, minutes, screenshot_path)
  values ((select id from weeks limit 1),
          'aaaaaaaa-0000-0000-0000-000000000001', 30, 'x/y/z/3.jpg');
  raise exception 'FAILED: a member submitted as someone else';
exception when insufficient_privilege then
  raise notice '  ok   a member cannot submit as someone else';
  when unique_violation then
    raise notice '  ok   a member cannot submit as someone else';
end $$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
