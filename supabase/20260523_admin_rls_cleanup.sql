-- CGSC Sailing admin and privacy cleanup.
-- This migration makes public.users the only source of admin status, keeps
-- role/email/phone out of public member browsing, and replaces older policies
-- that relied on auth metadata or exposed all support messages.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_role_change on public.users;
create trigger prevent_non_admin_role_change
before update on public.users
for each row
execute function public.prevent_non_admin_role_change();

create or replace function public.validate_required_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(new.full_name), '') is null then
    raise exception 'Full name is required';
  end if;

  if nullif(trim(coalesce(new.photo_url, '')), '') is null then
    raise exception 'Profile photo is required';
  end if;

  if nullif(trim(coalesce(new.gender, '')), '') is null then
    raise exception 'Gender is required';
  end if;

  if coalesce(new.user_type, '') not in ('owner', 'crew') then
    raise exception 'Account type must be owner or crew';
  end if;

  if coalesce(new.sailing_experience, '') not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Sailing experience is required';
  end if;

  if nullif(regexp_replace(coalesce(new.phone_number, new.phone, ''), '\D', '', 'g'), '') is null
     or length(regexp_replace(coalesce(new.phone_number, new.phone, ''), '\D', '', 'g')) <> 10 then
    raise exception 'A valid 10-digit phone number is required';
  end if;

  new.phone_number := regexp_replace(coalesce(new.phone_number, new.phone, ''), '\D', '', 'g');

  return new;
end;
$$;

drop trigger if exists validate_required_user_profile on public.users;
create trigger validate_required_user_profile
before insert or update of full_name, photo_url, gender, user_type, sailing_experience, phone, phone_number
on public.users
for each row
execute function public.validate_required_user_profile();

create or replace view public.public_profiles as
select
  id,
  full_name,
  photo_url,
  bio,
  sailing_experience,
  user_type,
  gender,
  created_at
from public.users visible_user
where
  auth.uid() = visible_user.id
  or public.is_admin()
  or exists (
    select 1
    from public.outings outing
    where outing.skipper_id = visible_user.id
  )
  or exists (
    select 1
    from public.crew_requests request
    join public.outings outing on outing.id = request.outing_id
    where outing.skipper_id = auth.uid()
      and request.crew_id = visible_user.id
  )
  or exists (
    select 1
    from public.crew_requests viewer_request
    join public.crew_requests visible_request
      on visible_request.outing_id = viewer_request.outing_id
    where viewer_request.crew_id = auth.uid()
      and viewer_request.status = 'approved'
      and visible_request.status = 'approved'
      and visible_request.crew_id = visible_user.id
  );

grant select on public.public_profiles to authenticated;

alter table public.users enable row level security;
alter table public.bug_reports enable row level security;
alter table public.feature_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_views enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users',
        'bug_reports',
        'feature_requests',
        'contact_messages',
        'announcements',
        'announcement_views'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy users_select_self_or_admin
on public.users
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy users_insert_own_profile
on public.users
for insert
to authenticated
with check (auth.uid() = id and coalesce(role, 'user') = 'user');

create policy users_update_own_profile
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy users_admin_update_any_profile
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy users_admin_delete_profiles
on public.users
for delete
to authenticated
using (public.is_admin());

create policy bug_reports_select_own_or_admin
on public.bug_reports
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy bug_reports_insert_own
on public.bug_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy bug_reports_update_own_or_admin
on public.bug_reports
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy bug_reports_delete_admin
on public.bug_reports
for delete
to authenticated
using (public.is_admin());

create policy feature_requests_select_own_or_admin
on public.feature_requests
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy feature_requests_insert_own
on public.feature_requests
for insert
to authenticated
with check (auth.uid() = user_id);

create policy feature_requests_update_own_or_admin
on public.feature_requests
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy feature_requests_delete_admin
on public.feature_requests
for delete
to authenticated
using (public.is_admin());

create policy contact_messages_select_own_or_admin
on public.contact_messages
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy contact_messages_insert_own
on public.contact_messages
for insert
to authenticated
with check (auth.uid() = user_id);

create policy contact_messages_update_own_or_admin
on public.contact_messages
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy contact_messages_delete_admin
on public.contact_messages
for delete
to authenticated
using (public.is_admin());

create policy announcements_select_authenticated
on public.announcements
for select
to authenticated
using (true);

create policy announcements_insert_admin
on public.announcements
for insert
to authenticated
with check (public.is_admin());

create policy announcements_update_admin
on public.announcements
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy announcements_delete_admin
on public.announcements
for delete
to authenticated
using (public.is_admin());

create policy announcement_views_select_own_or_admin
on public.announcement_views
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy announcement_views_insert_own
on public.announcement_views
for insert
to authenticated
with check (auth.uid() = user_id);

create policy announcement_views_update_own
on public.announcement_views
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy announcement_views_delete_own_or_admin
on public.announcement_views
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

update public.users
set role = 'user'
where role = 'admin';

update public.users
set role = 'admin'
where lower(email) = lower('sailortommie09@gmail.com');
