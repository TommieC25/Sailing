-- Ensure the app role has table privileges for feature request workflow.
-- RLS policies still decide which rows can be read/changed.

grant select, insert, update on public.feature_requests to authenticated;
grant delete on public.feature_requests to authenticated;
