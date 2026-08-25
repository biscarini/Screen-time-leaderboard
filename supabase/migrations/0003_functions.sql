-- Week math and the two membership writes.
--
-- All week logic lives here rather than in the app so it stays correct no
-- matter who asks: the hourly cron, a page load, or psql.
--
-- The time-taking functions come in pairs — an internal `_at(…, timestamptz)`
-- that does the work, and a public wrapper that supplies now(). Only the
-- wrappers are granted to clients, so nobody can roll a group's weeks at a
-- time of their choosing; the internal pair is what makes the logic testable.

create or replace function public.is_member(gid uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Where a group sits in its week, in its own timezone, as minutes since
-- Sunday 00:00 local. Sunday is index 0, matching Postgres `extract(dow)`;
-- ISO day-of-week columns convert with `% 7` (7 = Sun -> 0, 6 = Sat -> 6).
create or replace function public.group_clock_at(p_group_id uuid, p_now timestamptz)
returns table (
  local_now  timestamp,
  week_start date,
  now_min    int,
  open_min   int,
  close_min  int
)
language sql stable security definer set search_path = public as $$
  select
    t.lnow,
    (t.lnow::date - extract(dow from t.lnow)::int)::date,
    extract(dow from t.lnow)::int * 1440
      + extract(hour from t.lnow)::int * 60
      + extract(minute from t.lnow)::int,
    (g.opens_dow % 7) * 1440 + g.opens_hour * 60,
    (g.closes_dow % 7) * 1440 + g.closes_hour * 60
  from groups g
  cross join lateral (select (p_now at time zone g.timezone) as lnow) t
  where g.id = p_group_id;
$$;

-- Close what should be closed, open what should be open, and return the id of
-- the week the group is currently living in.
--
-- The rule: the current week is always the calendar week containing today.
-- It stays open until the upload window closes, is closed for the rest of
-- Saturday, and a fresh week opens at Sunday 00:00 local.
--
-- Idempotent by design, so every entry point can call it — if the cron misses
-- an hour, the next page view repairs the group.
create or replace function public.roll_weeks_at(p_group_id uuid, p_now timestamptz)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c record;
  wid uuid;
begin
  select * into c from group_clock_at(p_group_id, p_now);
  if not found then
    return null;
  end if;

  -- Any other open week is finished, whatever the cron did or didn't do.
  -- `<>` rather than `<`: a week ahead of this one can exist if an admin moves
  -- the group to a timezone that is behind, and it would otherwise sit open
  -- forever and block the insert below on one_open_week_per_group.
  update weeks set status = 'closed', closed_at = coalesce(closed_at, p_now)
   where group_id = p_group_id and status = 'open' and starts_on <> c.week_start;

  insert into weeks (group_id, starts_on, ends_on)
  values (p_group_id, c.week_start, c.week_start + 6)
  on conflict (group_id, starts_on) do nothing;

  -- The clock decides the current week's status outright, so the function is
  -- authoritative rather than insert-or-ignore. (Extending closes_hour on the
  -- day therefore reopens the current week — the one intended way back in.)
  update weeks
     set status    = case when c.now_min < c.close_min then 'open' else 'closed' end,
         closed_at = case when c.now_min < c.close_min
                          then null else coalesce(closed_at, p_now) end
   where group_id = p_group_id and starts_on = c.week_start;

  select id into wid
    from weeks where group_id = p_group_id and starts_on = c.week_start;
  return wid;
end $$;

create or replace function public.roll_group_weeks(p_group_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not (auth.role() = 'service_role' or is_member(p_group_id)) then
    raise exception 'not a member of this group';
  end if;
  return roll_weeks_at(p_group_id, now());
end $$;

create or replace function public.roll_all_weeks()
returns int
language plpgsql security definer set search_path = public as $$
declare g uuid; n int := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role only';
  end if;
  for g in select id from groups loop
    perform roll_weeks_at(g, now());
    n := n + 1;
  end loop;
  return n;
end $$;

-- Is the group inside its upload window right now?
create or replace function public.window_open_at(p_group_id uuid, p_now timestamptz)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.now_min >= c.open_min and c.now_min < c.close_min
       from group_clock_at(p_group_id, p_now) c),
    false
  );
$$;

create or replace function public.submission_window_open(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select window_open_at(p_group_id, now());
$$;

-- Used by the submissions RLS policy: the week must be open *and* the group
-- must be inside its window.
create or replace function public.can_submit(p_week_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from weeks w
    where w.id = p_week_id
      and w.status = 'open'
      and submission_window_open(w.group_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Joining and creating
-- Both are security definer because an invite code has to be resolvable by
-- someone who is not yet a member — which RLS, correctly, would forbid.
-- ---------------------------------------------------------------------------

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  select id into gid from groups
   where upper(invite_code) = upper(btrim(p_code));

  if gid is null then
    raise exception 'no group with that code';
  end if;

  insert into group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  perform roll_weeks_at(gid, now());
  return gid;
end $$;

create or replace function public.create_group(p_name text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid; code text; tries int := 0;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  loop
    -- readable, unambiguous alphabet: no O/0, no I/1
    code := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                               1 + floor(random() * 32)::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from groups where invite_code = code);
    tries := tries + 1;
    if tries > 20 then raise exception 'could not allocate an invite code'; end if;
  end loop;

  insert into groups (name, invite_code, timezone, created_by)
  values (btrim(p_name), code, coalesce(p_timezone, 'America/New_York'), auth.uid())
  returning id into gid;

  insert into group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'admin');

  perform roll_weeks_at(gid, now());
  return gid;
end $$;

-- Functions are executable by PUBLIC unless told otherwise. Lock the internals
-- down, then hand out only the entry points clients are meant to call.
revoke execute on function public.group_clock_at(uuid, timestamptz) from public;
revoke execute on function public.roll_weeks_at(uuid, timestamptz)  from public;
revoke execute on function public.window_open_at(uuid, timestamptz) from public;
revoke execute on function public.roll_all_weeks()                  from public;

grant execute on function public.roll_group_weeks(uuid)             to authenticated;
grant execute on function public.submission_window_open(uuid)       to authenticated;
grant execute on function public.join_group(text)                   to authenticated;
grant execute on function public.create_group(text, text)           to authenticated;
