-- Lock outing group chat to skippers and approved crew.
-- Approved crew can see the full chat history for that outing.

alter table public.event_chat enable row level security;

drop policy if exists event_chat_select_outing_participants on public.event_chat;
create policy event_chat_select_outing_participants
on public.event_chat
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.outings outing
    where outing.id = event_chat.outing_id
      and outing.skipper_id = auth.uid()
  )
  or exists (
    select 1
    from public.crew_requests request
    where request.outing_id = event_chat.outing_id
      and request.crew_id = auth.uid()
      and request.status = 'approved'
  )
);

drop policy if exists event_chat_insert_outing_participants on public.event_chat;
create policy event_chat_insert_outing_participants
on public.event_chat
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    public.is_admin()
    or exists (
      select 1
      from public.outings outing
      where outing.id = event_chat.outing_id
        and outing.skipper_id = auth.uid()
    )
    or exists (
      select 1
      from public.crew_requests request
      where request.outing_id = event_chat.outing_id
        and request.crew_id = auth.uid()
        and request.status = 'approved'
    )
  )
);

grant select, insert on public.event_chat to authenticated;
