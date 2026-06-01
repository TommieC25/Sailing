-- Expose aggregate approved-crew counts without exposing request details.

create or replace function public.outing_approved_counts(p_outing_ids uuid[])
returns table (
  outing_id uuid,
  approved_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    request.outing_id,
    count(*)::integer as approved_count
  from public.crew_requests request
  where request.outing_id = any(p_outing_ids)
    and request.status = 'approved'
  group by request.outing_id;
$$;

revoke all on function public.outing_approved_counts(uuid[]) from public;
grant execute on function public.outing_approved_counts(uuid[]) to authenticated;
