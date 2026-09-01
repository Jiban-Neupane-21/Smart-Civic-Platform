-- 1. Create the buckets with limits + allowed MIME types
-- 5 MB for documents, 2 MB for images; enforce allowed types at the bucket level
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('identity-documents', 'identity-documents', true, 5242880,
    array['image/png','image/jpeg','image/jpg','application/pdf']),
  ('complaint-media',    'complaint-media',    true, 5242880,
    array['image/png','image/jpeg','image/jpg','image/webp']),
  ('avatars',            'avatars',            true, 2097152,
    array['image/png','image/jpeg','image/jpg']),
  ('logos',              'logos',              true, 2097152,
    array['image/png','image/jpeg','image/jpg','image/svg+xml'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage RLS policies
-- Public read on all four buckets
create policy "objects_read_public" on storage.objects
  for select using (bucket_id in ('identity-documents','complaint-media','avatars','logos'));

-- avatars: users may manage only their own avatar
create policy "avatars_write_own" on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- logos: superadmin all; municipality head only their own municipality's logo
create policy "logos_write_municipality" on storage.objects for all
  using (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'municipalities'
    and (storage.foldername(name))[2] = auth_municipality_id()::text)
  with check (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'municipalities'
    and (storage.foldername(name))[2] = auth_municipality_id()::text);

create policy "logos_write_department" on storage.objects for all
  using (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'departments'
    and (storage.foldername(name))[2] = auth_department_id()::text)
  with check (bucket_id = 'logos'
    and (storage.foldername(name))[1] = 'departments'
    and (storage.foldername(name))[2] = auth_department_id()::text);

create policy "logos_write_superadmin" on storage.objects for all
  using (bucket_id = 'logos' and auth_role() = 'superadmin')
  with check (bucket_id = 'logos' and auth_role() = 'superadmin');

-- identity-documents + complaint-media: users manage files under their own folder
create policy "docs_write_own" on storage.objects for all
  using (bucket_id in ('identity-documents','complaint-media')
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('identity-documents','complaint-media')
    and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Add the missing avatar column for admin/staff/muni profiles
alter table profiles add column if not exists profile_picture text;
