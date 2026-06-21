-- Let admins move a Rendezvous message and its private photo attachments.

alter table public.club_event_messages
  drop constraint if exists club_event_message_image_path_matches_message;
alter table public.club_event_messages
  add constraint club_event_message_image_path_matches_message check (
    image_path is null
    or image_path like 'rendezvous/' || event_id::text || '/%'
  );

alter table public.club_event_messages
  drop constraint if exists club_event_message_image_arrays_valid;
alter table public.club_event_messages
  add constraint club_event_message_image_arrays_valid check (
    cardinality(image_paths) <= 5
    and cardinality(image_names) = cardinality(image_paths)
    and array_position(image_paths, null) is null
    and public.chat_image_paths_match(
      image_paths,
      'rendezvous/' || event_id::text || '/'
    )
  );

create or replace function public.move_club_event_message(
  p_message_id uuid,
  p_target_event_id uuid,
  p_image_paths text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  source_event_id uuid;
  expected_image_count integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if not exists (
    select 1
    from public.club_events event
    where event.id = p_target_event_id
      and event.status = 'active'
  ) then
    raise exception 'Destination Rendezvous is unavailable';
  end if;

  select
    message.event_id,
    case
      when cardinality(message.image_paths) > 0 then cardinality(message.image_paths)
      when message.image_path is not null then 1
      else 0
    end
  into source_event_id, expected_image_count
  from public.club_event_messages message
  where message.id = p_message_id
  for update;

  if source_event_id is null then
    raise exception 'Message not found';
  end if;
  if source_event_id = p_target_event_id then
    raise exception 'Choose a different Rendezvous';
  end if;
  if cardinality(coalesce(p_image_paths, '{}'::text[])) <> expected_image_count then
    raise exception 'Every attached photo must be moved with the message';
  end if;
  if cardinality(coalesce(p_image_paths, '{}'::text[])) > 5
    or not public.chat_image_paths_match(
      coalesce(p_image_paths, '{}'::text[]),
      'rendezvous/' || p_target_event_id::text || '/'
    ) then
    raise exception 'Invalid destination photo path';
  end if;

  update public.club_event_messages
  set event_id = p_target_event_id,
      image_paths = coalesce(p_image_paths, '{}'::text[]),
      image_path = p_image_paths[1]
  where id = p_message_id;
end;
$$;

revoke all on function public.move_club_event_message(uuid, uuid, text[]) from public;
grant execute on function public.move_club_event_message(uuid, uuid, text[]) to authenticated;
