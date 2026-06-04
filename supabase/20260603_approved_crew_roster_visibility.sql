-- Approved crew should be able to see the confirmed roster for their outing.
-- Pending, declined, and waitlisted users still cannot see the group roster.

create or replace function public.can_view_approved_crew_for_outing(p_outing_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.outings outing
      where outing.id = p_outing_id
        and outing.skipper_id = auth.uid()
    )
    or exists (
      select 1
      from public.crew_requests request
      where request.outing_id = p_outing_id
        and request.crew_id = auth.uid()
        and request.status = 'approved'
    );
$$;

revoke all on function public.can_view_approved_crew_for_outing(uuid) from public;
grant execute on function public.can_view_approved_crew_for_outing(uuid) to authenticated;

drop policy if exists crew_requests_select_roster_participants on public.crew_requests;
create policy crew_requests_select_roster_participants
on public.crew_requests
for select
to authenticated
using (
  auth.uid() = crew_id
  or public.is_admin()
  or exists (
    select 1
    from public.outings outing
    where outing.id = crew_requests.outing_id
      and outing.skipper_id = auth.uid()
  )
  or (
    status = 'approved'
    and public.can_view_approved_crew_for_outing(outing_id)
  )
);

grant select on public.crew_requests to authenticated;
