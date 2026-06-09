-- Keep workflow status changes admin-only while preserving author text edits
-- through edit_authored_submission(). Prevent accidental loss of the final admin.

drop policy if exists bug_reports_update_own_or_admin on public.bug_reports;
create policy bug_reports_update_admin
on public.bug_reports for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists feature_requests_update_own_or_admin on public.feature_requests;
create policy feature_requests_update_admin
on public.feature_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists contact_messages_update_own_or_admin on public.contact_messages;
create policy contact_messages_update_admin
on public.contact_messages for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.protect_final_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role is distinct from 'admin')
     and (select count(*) from public.users where role = 'admin') <= 1 then
    raise exception 'SailAway must retain at least one admin';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists protect_final_admin_update on public.users;
create trigger protect_final_admin_update
before update of role on public.users
for each row execute function public.protect_final_admin();

drop trigger if exists protect_final_admin_delete on public.users;
create trigger protect_final_admin_delete
before delete on public.users
for each row execute function public.protect_final_admin();
