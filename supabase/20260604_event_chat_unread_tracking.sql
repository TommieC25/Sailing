-- Track unread outing group chat messages per participant.
-- Existing messages are marked seen for current skippers and approved crew so
-- this feature does not create stale unread badges when first deployed.

create table if not exists public.event_chat_reads (
  outing_id uuid not null references public.outings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (outing_id, user_id)
);

alter table public.event_chat_reads enable row level security;

drop policy if exists event_chat_reads_select_own on public.event_chat_reads;
create policy event_chat_reads_select_own
on public.event_chat_reads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists event_chat_reads_insert_own_participant on public.event_chat_reads;
create policy event_chat_reads_insert_own_participant
on public.event_chat_reads
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1
      from public.outings outing
      where outing.id = event_chat_reads.outing_id
        and outing.skipper_id = auth.uid()
    )
    or exists (
      select 1
      from public.crew_requests request
      where request.outing_id = event_chat_reads.outing_id
        and request.crew_id = auth.uid()
        and request.status = 'approved'
    )
  )
);

drop policy if exists event_chat_reads_update_own on public.event_chat_reads;
create policy event_chat_reads_update_own
on public.event_chat_reads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.event_chat_reads to authenticated;

insert into public.event_chat_reads (outing_id, user_id, last_read_at)
select participant.outing_id, participant.user_id, coalesce(max(chat.created_at), now())
from (
  select id as outing_id, skipper_id as user_id
  from public.outings
  where skipper_id is not null
  union
  select outing_id, crew_id as user_id
  from public.crew_requests
  where status = 'approved'
) participant
left join public.event_chat chat
  on chat.outing_id = participant.outing_id
group by participant.outing_id, participant.user_id
on conflict (outing_id, user_id) do nothing;

create or replace function public.can_use_event_chat(p_outing_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1
      from public.outings outing
      where outing.id = p_outing_id
        and outing.skipper_id = auth.uid()
    )
    or exists (
      select 1
      from public.crew_requests request
      where request.outing_id = p_outing_id
        and request.crew_id = auth.uid()
        and request.status = 'approved'
    );
$$;

revoke all on function public.can_use_event_chat(uuid) from public;
grant execute on function public.can_use_event_chat(uuid) to authenticated;

create or replace function public.mark_event_chat_seen(p_outing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_use_event_chat(p_outing_id) then
    raise exception 'You do not have access to this outing chat';
  end if;

  insert into public.event_chat_reads (outing_id, user_id, last_read_at)
  values (p_outing_id, auth.uid(), now())
  on conflict (outing_id, user_id)
  do update set last_read_at = excluded.last_read_at;
end;
$$;

revoke all on function public.mark_event_chat_seen(uuid) from public;
grant execute on function public.mark_event_chat_seen(uuid) to authenticated;

create or replace function public.my_unread_event_chat_counts()
returns table (
  outing_id uuid,
  unread_count bigint,
  latest_message_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with participant_outings as (
    select outing.id as outing_id
    from public.outings outing
    where outing.skipper_id = auth.uid()
    union
    select request.outing_id
    from public.crew_requests request
    where request.crew_id = auth.uid()
      and request.status = 'approved'
  )
  select
    chat.outing_id,
    count(*)::bigint as unread_count,
    max(chat.created_at) as latest_message_at
  from public.event_chat chat
  join participant_outings participant
    on participant.outing_id = chat.outing_id
  left join public.event_chat_reads read_state
    on read_state.outing_id = chat.outing_id
   and read_state.user_id = auth.uid()
  where chat.user_id <> auth.uid()
    and chat.created_at > coalesce(read_state.last_read_at, 'epoch'::timestamptz)
  group by chat.outing_id
  order by latest_message_at desc;
$$;

revoke all on function public.my_unread_event_chat_counts() from public;
grant execute on function public.my_unread_event_chat_counts() to authenticated;
