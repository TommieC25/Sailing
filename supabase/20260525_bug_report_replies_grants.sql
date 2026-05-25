-- Grants for in-app bug report replies.
-- RLS policies decide which rows each signed-in user can access.

grant select, insert, update on public.bug_report_replies to authenticated;
