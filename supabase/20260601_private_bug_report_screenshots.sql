-- Store new bug report screenshots in a private bucket.
-- Existing public screenshot URLs still work in the app; new uploads should
-- store object paths and be displayed through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'bug-report-screenshots',
  'bug-report-screenshots',
  false,
  12582912
)
on conflict (id) do update
set public = false,
    file_size_limit = 12582912,
    allowed_mime_types = null;

drop policy if exists bug_report_screenshots_insert_own on storage.objects;
create policy bug_report_screenshots_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bug-report-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists bug_report_screenshots_select_related on storage.objects;
create policy bug_report_screenshots_select_related
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bug-report-screenshots'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists bug_report_screenshots_delete_related on storage.objects;
create policy bug_report_screenshots_delete_related
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bug-report-screenshots'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);
