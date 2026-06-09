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

create or replace function public.decline_crew_request(
  p_request_id uuid,
  p_note text default null
)
returns public.crew_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  declined_request public.crew_requests;
begin
  update public.crew_requests request
  set status = 'declined',
      responded_at = now(),
      status_changed_at = now(),
      status_seen_at = null,
      skipper_response_note = nullif(btrim(p_note), '')
  where request.id = p_request_id
    and exists (
      select 1 from public.outings outing
      where outing.id = request.outing_id and outing.skipper_id = auth.uid()
    )
  returning request.* into declined_request;

  if declined_request.id is null then
    raise exception 'Crew request not found or not managed by current skipper';
  end if;

  return declined_request;
end;
$$;

revoke all on function public.decline_crew_request(uuid, text) from public;
grant execute on function public.decline_crew_request(uuid, text) to authenticated;

drop policy if exists "Skippers can update requests" on public.crew_requests;
revoke update on public.crew_requests from authenticated;

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
