-- Align feature request statuses with the Admin Inbox workflow:
-- Pending -> In Development -> Implemented.

alter table public.feature_requests
drop constraint if exists feature_requests_status_check;

update public.feature_requests
set status = case
  when status in ('open', 'pending') then 'pending'
  when status in ('in_progress', 'planned', 'in_development') then 'in_development'
  when status in ('resolved', 'completed', 'implemented') then 'implemented'
  else 'pending'
end;

alter table public.feature_requests
alter column status set default 'pending';

alter table public.feature_requests
add constraint feature_requests_status_check
check (status in ('pending', 'in_development', 'implemented'));
