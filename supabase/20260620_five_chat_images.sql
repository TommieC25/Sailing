-- Allow up to five private image attachments on one chat message.

alter table public.event_chat
  add column if not exists image_paths text[] not null default '{}'::text[],
  add column if not exists image_names text[] not null default '{}'::text[];

alter table public.club_event_messages
  add column if not exists image_paths text[] not null default '{}'::text[],
  add column if not exists image_names text[] not null default '{}'::text[];

update public.event_chat
set image_paths = array[image_path],
    image_names = array[image_name]
where image_path is not null
  and cardinality(image_paths) = 0;

update public.club_event_messages
set image_paths = array[image_path],
    image_names = array[image_name]
where image_path is not null
  and cardinality(image_paths) = 0;

create or replace function public.chat_image_paths_match(paths text[], required_prefix text)
returns boolean
language sql
immutable
strict
as $$
  select coalesce(bool_and(path like required_prefix || '%'), true)
  from unnest(paths) as path;
$$;

alter table public.event_chat drop constraint if exists event_chat_has_content;
alter table public.event_chat add constraint event_chat_has_content check (
  nullif(btrim(message), '') is not null
  or image_path is not null
  or cardinality(image_paths) > 0
);

alter table public.event_chat drop constraint if exists event_chat_image_arrays_valid;
alter table public.event_chat add constraint event_chat_image_arrays_valid check (
  cardinality(image_paths) <= 5
  and cardinality(image_names) = cardinality(image_paths)
  and array_position(image_paths, null) is null
  and public.chat_image_paths_match(
    image_paths,
    'outing/' || outing_id::text || '/' || user_id::text || '/'
  )
);

alter table public.club_event_messages drop constraint if exists club_event_messages_has_content;
alter table public.club_event_messages add constraint club_event_messages_has_content check (
  nullif(btrim(message), '') is not null
  or image_path is not null
  or cardinality(image_paths) > 0
);

alter table public.club_event_messages drop constraint if exists club_event_message_image_arrays_valid;
alter table public.club_event_messages add constraint club_event_message_image_arrays_valid check (
  cardinality(image_paths) <= 5
  and cardinality(image_names) = cardinality(image_paths)
  and array_position(image_paths, null) is null
  and public.chat_image_paths_match(
    image_paths,
    'rendezvous/' || event_id::text || '/' || user_id::text || '/'
  )
);

drop function if exists public.active_club_event_chat();
drop function if exists public.club_event_chat(uuid);

create function public.club_event_chat(p_event_id uuid)
returns table (
  event_id uuid,
  event_title text,
  event_date date,
  event_time time,
  event_location text,
  event_description text,
  event_status text,
  message_id uuid,
  message_text text,
  message_image_path text,
  message_image_name text,
  message_image_paths text[],
  message_image_names text[],
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
    event.event_time,
    event.location,
    event.description,
    event.status,
    message.id,
    message.message,
    message.image_path,
    message.image_name,
    message.image_paths,
    message.image_names,
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
  where event.id = p_event_id
    and event.status = 'active'
  order by message.created_at asc nulls first;
$$;

revoke all on function public.club_event_chat(uuid) from public;
grant execute on function public.club_event_chat(uuid) to authenticated;

create function public.active_club_event_chat()
returns table (
  event_id uuid,
  event_title text,
  event_date date,
  event_time time,
  event_location text,
  event_description text,
  event_status text,
  message_id uuid,
  message_text text,
  message_image_path text,
  message_image_name text,
  message_image_paths text[],
  message_image_names text[],
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
  select *
  from public.club_event_chat((
    select event.id
    from public.club_events event
    where event.status = 'active'
    order by event.event_date asc, event.event_time asc nulls last, event.created_at asc
    limit 1
  ));
$$;

revoke all on function public.active_club_event_chat() from public;
grant execute on function public.active_club_event_chat() to authenticated;
