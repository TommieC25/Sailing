-- Storage setup for bug report screenshots.
-- Screenshots are uploaded into the existing public `profiles` bucket under:
-- bug-reports/<user-id>/<timestamp>.<ext>

insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do update set public = true;

drop policy if exists profiles_bug_report_screenshots_insert_own on storage.objects;
create policy profiles_bug_report_screenshots_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profiles'
  and (storage.foldername(name))[1] = 'bug-reports'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists profiles_bug_report_screenshots_select_public on storage.objects;
create policy profiles_bug_report_screenshots_select_public
on storage.objects
for select
to public
using (
  bucket_id = 'profiles'
  and (storage.foldername(name))[1] = 'bug-reports'
);
