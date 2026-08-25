-- Screenshots. Private bucket, read through signed URLs by group members only.
-- Path: {group_id}/{week_id}/{user_id}/{uuid}.jpg
-- user_id is its own folder so the policy can match it, and so a re-upload
-- during an open window doesn't collide with the first attempt.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "group members can read screenshots" on storage.objects
  for select using (
    bucket_id = 'screenshots'
    and is_member(((storage.foldername(name))[1])::uuid)
  );

create policy "upload your own screenshot" on storage.objects
  for insert with check (
    bucket_id = 'screenshots'
    and is_member(((storage.foldername(name))[1])::uuid)
    and (storage.foldername(name))[3] = auth.uid()::text
  );

create policy "replace your own screenshot" on storage.objects
  for update using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[3] = auth.uid()::text
  );

-- Avatars. Public read (they're just faces, and public URLs keep the
-- leaderboard a single round trip); write-your-own-folder.
-- Path: {user_id}/{uuid}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "anyone can read avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "write your own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "update your own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
