-- Panyor Hall storage buckets + policies.
-- Run ONCE in the Supabase Dashboard → SQL Editor (project fyuffchwmkpvvwzsrwan).
-- Safe to re-run: every statement is idempotent.

-- 1. Buckets (public read, authenticated write) -----------------------------
insert into storage.buckets (id, name, public)
values
  ('student-avatars', 'student-avatars', true),
  ('complaint-attachments', 'complaint-attachments', true),
  ('notice-attachments', 'notice-attachments', true),
  ('equipment-images', 'equipment-images', true)
on conflict (id) do update set public = true;

-- 2. Public read for all four buckets ---------------------------------------
drop policy if exists "Public read hostel files" on storage.objects;
create policy "Public read hostel files"
on storage.objects for select
using (bucket_id in ('student-avatars', 'complaint-attachments', 'notice-attachments', 'equipment-images'));

-- 3. Authenticated users may upload ------------------------------------------
drop policy if exists "Authenticated upload hostel files" on storage.objects;
create policy "Authenticated upload hostel files"
on storage.objects for insert
to authenticated
with check (bucket_id in ('student-avatars', 'complaint-attachments', 'notice-attachments', 'equipment-images'));

-- 4. Authenticated users may overwrite their own pending uploads -------------
drop policy if exists "Authenticated update hostel files" on storage.objects;
create policy "Authenticated update hostel files"
on storage.objects for update
to authenticated
using (bucket_id in ('student-avatars', 'complaint-attachments', 'notice-attachments', 'equipment-images'));
