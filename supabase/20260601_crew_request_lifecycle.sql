-- Crew request lifecycle support: member-visible status notifications,
-- waitlist conversion, and optional skipper response notes.

alter table public.crew_requests
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_seen_at timestamptz,
  add column if not exists waitlisted_at timestamptz,
  add column if not exists skipper_response_note text;

update public.crew_requests
set status_changed_at = coalesce(responded_at, requested_at, now())
where status_changed_at is null;

create index if not exists crew_requests_member_status_idx
on public.crew_requests (crew_id, status, status_changed_at, status_seen_at);

create or replace function public.mark_my_crew_requests_seen()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.crew_requests
  set status_seen_at = now()
  where crew_id = auth.uid()
    and status in ('approved', 'declined', 'waitlisted')
    and status_changed_at is not null
    and (status_seen_at is null or status_seen_at < status_changed_at);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_my_crew_requests_seen() from public;
grant execute on function public.mark_my_crew_requests_seen() to authenticated;

create or replace function public.join_crew_request_waitlist(p_request_id uuid)
returns public.crew_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.crew_requests;
begin
  select *
  into updated_request
  from public.crew_requests
  where id = p_request_id
    and crew_id = auth.uid();

  if updated_request.id is null then
    raise exception 'Could not find this outing request for your account';
  end if;

  if updated_request.status = 'waitlisted' then
    return updated_request;
  end if;

  if updated_request.status <> 'declined' then
    raise exception 'Only declined outing requests can be added to the waitlist';
  end if;

  update public.crew_requests
  set status = 'waitlisted',
      waitlisted_at = now(),
      status_changed_at = now(),
      status_seen_at = null
  where id = p_request_id
    and crew_id = auth.uid()
  returning * into updated_request;

  return updated_request;
end;
$$;

revoke all on function public.join_crew_request_waitlist(uuid) from public;
grant execute on function public.join_crew_request_waitlist(uuid) to authenticated;
