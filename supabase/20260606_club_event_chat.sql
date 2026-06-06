-- One active, club-wide Event Chat. Boat outing chats remain private and separate.

create table if not exists public.club_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists club_events_one_active
on public.club_events ((status))
where status = 'active';

create table if not exists public.club_event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.club_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  linked_outing_id uuid references public.outings(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.club_event_reads (
  event_id uuid not null references public.club_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.club_events enable row level security;
alter table public.club_event_messages enable row level security;
alter table public.club_event_reads enable row level security;

drop policy if exists club_events_select_authenticated on public.club_events;
create policy club_events_select_authenticated
on public.club_events for select to authenticated
using (true);

drop policy if exists club_events_admin_insert on public.club_events;
create policy club_events_admin_insert
on public.club_events for insert to authenticated
with check (public.is_admin() and auth.uid() = created_by);

drop policy if exists club_events_admin_update on public.club_events;
create policy club_events_admin_update
on public.club_events for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists club_event_messages_select_authenticated on public.club_event_messages;
create policy club_event_messages_select_authenticated
on public.club_event_messages for select to authenticated
using (true);

drop policy if exists club_event_messages_insert_active on public.club_event_messages;
create policy club_event_messages_insert_active
on public.club_event_messages for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.club_events event
    where event.id = event_id and event.status = 'active'
  )
  and (
    linked_outing_id is null
    or public.is_admin()
    or exists (
      select 1 from public.outings outing
      where outing.id = linked_outing_id
        and outing.skipper_id = auth.uid()
        and outing.outing_date >= current_date
    )
  )
);

drop policy if exists club_event_reads_select_own on public.club_event_reads;
create policy club_event_reads_select_own
on public.club_event_reads for select to authenticated
using (auth.uid() = user_id);

drop policy if exists club_event_reads_insert_own on public.club_event_reads;
create policy club_event_reads_insert_own
on public.club_event_reads for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists club_event_reads_update_own on public.club_event_reads;
create policy club_event_reads_update_own
on public.club_event_reads for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select on public.club_events to authenticated;
grant insert, update on public.club_events to authenticated;
grant select, insert on public.club_event_messages to authenticated;
grant select, insert, update on public.club_event_reads to authenticated;

create or replace function public.active_club_event_chat()
returns table (
  event_id uuid,
  event_title text,
  event_date date,
  event_location text,
  event_description text,
  event_status text,
  message_id uuid,
  message_text text,
  message_created_at timestamptz,
  sender_id uuid,
  sender_name text,
  sender_photo_url text,
  linked_outing_id uuid,
  linked_outing_title text,
  linked_outing_date date,
  linked_outing_time time,
  linked_outing_capacity integer,
  linked_outing_approved_count bigint,
  linked_boat_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    event.id,
    event.title,
    event.event_date,
    event.location,
    event.description,
    event.status,
    message.id,
    message.message,
    message.created_at,
    sender.id,
    sender.full_name,
    sender.photo_url,
    outing.id,
    outing.title,
    outing.outing_date,
    outing.outing_time,
    outing.capacity_available,
    coalesce(approved.approved_count, 0),
    boat.name
  from public.club_events event
  left join public.club_event_messages message on message.event_id = event.id
  left join public.users sender on sender.id = message.user_id
  left join public.outings outing on outing.id = message.linked_outing_id
  left join public.boats boat on boat.id = outing.boat_id
  left join lateral (
    select count(*)::bigint as approved_count
    from public.crew_requests request
    where request.outing_id = outing.id and request.status = 'approved'
  ) approved on true
  where event.status = 'active'
  order by message.created_at asc nulls first;
$$;

revoke all on function public.active_club_event_chat() from public;
grant execute on function public.active_club_event_chat() to authenticated;

create or replace function public.mark_club_event_seen(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_event_reads (event_id, user_id, last_read_at)
  values (p_event_id, auth.uid(), now())
  on conflict (event_id, user_id)
  do update set last_read_at = excluded.last_read_at;
end;
$$;

revoke all on function public.mark_club_event_seen(uuid) from public;
grant execute on function public.mark_club_event_seen(uuid) to authenticated;

create or replace function public.my_unread_club_event_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::bigint
  from public.club_event_messages message
  join public.club_events event on event.id = message.event_id and event.status = 'active'
  left join public.club_event_reads read_state
    on read_state.event_id = event.id and read_state.user_id = auth.uid()
  where message.user_id <> auth.uid()
    and message.created_at > coalesce(read_state.last_read_at, 'epoch'::timestamptz);
$$;

revoke all on function public.my_unread_club_event_count() from public;
grant execute on function public.my_unread_club_event_count() to authenticated;
