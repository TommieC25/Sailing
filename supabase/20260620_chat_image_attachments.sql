-- Private image attachments for outing and Club Rendezvous chats.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

alter table public.event_chat
  add column if not exists image_path text,
  add column if not exists image_name text;

alter table public.club_event_messages
  add column if not exists image_path text,
  add column if not exists image_name text;

alter table public.event_chat alter column message drop not null;
alter table public.club_event_messages alter column message drop not null;

alter table public.event_chat drop constraint if exists event_chat_has_content;
alter table public.event_chat add constraint event_chat_has_content check (
  nullif(btrim(message), '') is not null or image_path is not null
);

alter table public.event_chat drop constraint if exists event_chat_image_path_matches_message;
alter table public.event_chat add constraint event_chat_image_path_matches_message check (
  image_path is null
  or image_path like 'outing/' || outing_id::text || '/' || user_id::text || '/%'
);

alter table public.club_event_messages drop constraint if exists club_event_messages_has_content;
alter table public.club_event_messages add constraint club_event_messages_has_content check (
  nullif(btrim(message), '') is not null or image_path is not null
);

alter table public.club_event_messages drop constraint if exists club_event_message_image_path_matches_message;
alter table public.club_event_messages add constraint club_event_message_image_path_matches_message check (
  image_path is null
  or image_path like 'rendezvous/' || event_id::text || '/' || user_id::text || '/%'
);

drop policy if exists chat_images_insert_participant on storage.objects;
create policy chat_images_insert_participant
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[3] = auth.uid()::text
  and (
    (
      (storage.foldername(name))[1] = 'outing'
      and (
        public.is_admin()
        or exists (
          select 1
          from public.outings outing
          where outing.id::text = (storage.foldername(name))[2]
            and outing.skipper_id = auth.uid()
        )
        or exists (
          select 1
          from public.crew_requests request
          where request.outing_id::text = (storage.foldername(name))[2]
            and request.crew_id = auth.uid()
            and request.status = 'approved'
        )
      )
    )
    or (
      (storage.foldername(name))[1] = 'rendezvous'
      and exists (
        select 1
        from public.club_events event
        where event.id::text = (storage.foldername(name))[2]
          and event.status = 'active'
      )
    )
  )
);

drop policy if exists chat_images_select_participant on storage.objects;
create policy chat_images_select_participant
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-images'
  and (
    (
      (storage.foldername(name))[1] = 'outing'
      and (
        public.is_admin()
        or exists (
          select 1
          from public.outings outing
          where outing.id::text = (storage.foldername(name))[2]
            and outing.skipper_id = auth.uid()
        )
        or exists (
          select 1
          from public.crew_requests request
          where request.outing_id::text = (storage.foldername(name))[2]
            and request.crew_id = auth.uid()
            and request.status = 'approved'
        )
      )
    )
    or (
      (storage.foldername(name))[1] = 'rendezvous'
      and exists (
        select 1
        from public.club_events event
        where event.id::text = (storage.foldername(name))[2]
      )
    )
  )
);

drop policy if exists chat_images_delete_author_or_admin on storage.objects;
create policy chat_images_delete_author_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (
    (storage.foldername(name))[3] = auth.uid()::text
    or public.is_admin()
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
