-- Keep one crew request per person per outing.

delete from public.crew_requests old_request
using public.crew_requests newer_request
where old_request.outing_id = newer_request.outing_id
  and old_request.crew_id = newer_request.crew_id
  and old_request.requested_at < newer_request.requested_at;

create unique index if not exists crew_requests_one_per_crew_per_outing
on public.crew_requests (outing_id, crew_id);
