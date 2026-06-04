-- Keep approval capacity guarded by default, but allow a skipper/admin to make
-- an explicit override when they intentionally approve beyond listed capacity.

drop function if exists public.approve_crew_request(uuid);

create or replace function public.approve_crew_request(
  p_request_id uuid,
  p_override_capacity boolean default false
)
returns public.crew_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.crew_requests;
  target_outing public.outings;
  approved_count integer;
  crew_limit integer;
begin
  select *
  into target_request
  from public.crew_requests
  where id = p_request_id
  for update;

  if target_request.id is null then
    raise exception 'Crew request not found';
  end if;

  select *
  into target_outing
  from public.outings
  where id = target_request.outing_id
  for update;

  if target_outing.id is null then
    raise exception 'Outing not found';
  end if;

  if not (
    public.is_admin()
    or target_outing.skipper_id = auth.uid()
  ) then
    raise exception 'Only the skipper or an admin can approve this request';
  end if;

  if target_request.status = 'approved' then
    return target_request;
  end if;

  if target_request.status not in ('pending', 'waitlisted') then
    raise exception 'Only pending or waitlisted requests can be approved';
  end if;

  crew_limit := coalesce(target_outing.capacity_available, 0);

  if crew_limit > 0 and not p_override_capacity then
    select count(*)
    into approved_count
    from public.crew_requests
    where outing_id = target_request.outing_id
      and status = 'approved';

    if approved_count >= crew_limit then
      raise exception 'This outing is already full. Decline the request, keep the member waitlisted, or approve again with a capacity override.';
    end if;
  end if;

  update public.crew_requests
  set status = 'approved',
      responded_at = now(),
      status_changed_at = now(),
      status_seen_at = null
  where id = p_request_id
  returning * into target_request;

  return target_request;
end;
$$;

revoke all on function public.approve_crew_request(uuid, boolean) from public;
grant execute on function public.approve_crew_request(uuid, boolean) to authenticated;
