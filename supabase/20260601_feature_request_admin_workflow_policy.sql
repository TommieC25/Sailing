-- Ensure Admin Inbox can manage feature request workflow statuses.
-- This is idempotent and does not delete feature request data.

grant select, insert, update, delete on public.feature_requests to authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists feature_requests_select_own_or_admin on public.feature_requests;
create policy feature_requests_select_own_or_admin
on public.feature_requests
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists feature_requests_insert_own on public.feature_requests;
create policy feature_requests_insert_own
on public.feature_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists feature_requests_update_own_or_admin on public.feature_requests;
create policy feature_requests_update_own_or_admin
on public.feature_requests
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists feature_requests_delete_admin on public.feature_requests;
create policy feature_requests_delete_admin
on public.feature_requests
for delete
to authenticated
using (public.is_admin());
