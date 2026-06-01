-- In-app conversations for feature requests.
-- Status updates also write system-style replies so the originator sees
-- progress inside the request thread.

create table if not exists public.feature_request_replies (
  id uuid primary key default gen_random_uuid(),
  feature_request_id uuid not null references public.feature_requests(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists feature_request_replies_feature_request_id_idx
on public.feature_request_replies (feature_request_id, created_at);

create index if not exists feature_request_replies_unread_idx
on public.feature_request_replies (read_at)
where read_at is null;

alter table public.feature_request_replies enable row level security;

drop policy if exists feature_request_replies_select_related on public.feature_request_replies;
create policy feature_request_replies_select_related
on public.feature_request_replies
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.feature_requests request
    where request.id = feature_request_replies.feature_request_id
      and request.user_id = auth.uid()
  )
);

drop policy if exists feature_request_replies_insert_related on public.feature_request_replies;
create policy feature_request_replies_insert_related
on public.feature_request_replies
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.feature_requests request
      where request.id = feature_request_replies.feature_request_id
        and request.user_id = auth.uid()
    )
  )
);

drop policy if exists feature_request_replies_update_related on public.feature_request_replies;
create policy feature_request_replies_update_related
on public.feature_request_replies
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.feature_requests request
    where request.id = feature_request_replies.feature_request_id
      and request.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.feature_requests request
    where request.id = feature_request_replies.feature_request_id
      and request.user_id = auth.uid()
  )
);

grant select, insert, update on public.feature_request_replies to authenticated;
