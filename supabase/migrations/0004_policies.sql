-- Row level security, in two sentences: you can read anything inside a group
-- you belong to, and write only your own rows.

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
create policy "insert your own profile" on profiles
  for insert with check (id = auth.uid());
create policy "update your own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Groups are created through create_group(), never inserted directly.
create policy "read groups you belong to" on groups
  for select using (is_member(id));
create policy "admins can change group settings" on groups
  for update using (
    exists (select 1 from group_members m
            where m.group_id = groups.id and m.user_id = auth.uid()
              and m.role = 'admin')
  );

create policy "read members of your groups" on group_members
  for select using (is_member(group_id));
create policy "leave as yourself" on group_members
  for delete using (user_id = auth.uid());

create policy "read weeks of your groups" on weeks
  for select using (is_member(group_id));

create policy "read submissions in your groups" on submissions
  for select using (
    exists (select 1 from weeks w where w.id = week_id and is_member(w.group_id))
  );
create policy "submit for yourself, inside the window" on submissions
  for insert with check (
    user_id = auth.uid()
    and can_submit(week_id)
    and exists (select 1 from weeks w
                where w.id = week_id and is_member(w.group_id))
  );
create policy "amend your own submission while the window is open" on submissions
  for update using (user_id = auth.uid() and can_submit(week_id))
       with check (user_id = auth.uid() and can_submit(week_id));
