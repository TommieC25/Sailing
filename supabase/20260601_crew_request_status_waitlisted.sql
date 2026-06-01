-- Allow waitlisted crew request status.
alter table public.crew_requests
  drop constraint if exists crew_requests_status_check;

alter table public.crew_requests
  add constraint crew_requests_status_check
  check (status in ('pending', 'approved', 'declined', 'waitlisted'));
