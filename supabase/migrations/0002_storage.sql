-- Screenshot bucket. Private; served through signed URLs to group members only.
-- Path convention: {group_id}/{week_id}/{user_id}/{uuid}.jpg
-- (user_id is its own folder so the policy below can match it, and so a
--  re-upload during an open week doesn't collide with the first attempt.)

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

create policy "group members can view screenshots" on storage.objects
  for select using (
    bucket_id = 'screenshots'
    and is_member((storage.foldername(name))[1]::uuid)
  );

create policy "upload your own screenshot" on storage.objects
  for insert with check (
    bucket_id = 'screenshots'
    and is_member((storage.foldername(name))[1]::uuid)
    and (storage.foldername(name))[3] = auth.uid()::text
  );
