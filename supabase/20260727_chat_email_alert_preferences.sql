-- Add user-controlled chat email alert preferences and queue support for chat messages.
-- Daily digest is stored as a preference now; digest delivery should be added as a
-- separate scheduled worker so casual chat does not create surprise broadcast volume.

alter table public.users
add column if not exists chat_email_alert_frequency text not null default 'daily_digest';

alter table public.users
drop constraint if exists users_chat_email_alert_frequency_check;

alter table public.users
add constraint users_chat_email_alert_frequency_check
check (chat_email_alert_frequency in ('immediate', 'daily_digest', 'important_only', 'off'));

update public.users
set chat_email_alert_frequency = 'daily_digest'
where chat_email_alert_frequency is null;

alter table public.email_alert_queue
drop constraint if exists email_alert_queue_alert_type_check;

alter table public.email_alert_queue
add constraint email_alert_queue_alert_type_check
check (
  alert_type in (
    'admin_announcement',
    'new_outing',
    'new_crew_request',
    'crew_request_status',
    'new_direct_message',
    'new_chat_message'
  )
);

create or replace function public.queue_outing_chat_email_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_outing record;
  sender_name text;
  recipient record;
  message_excerpt text;
  has_images boolean;
begin
  select
    outing.id,
    outing.title,
    outing.skipper_id,
    outing.outing_date,
    outing.outing_time
  into target_outing
  from public.outings outing
  where outing.id = new.outing_id;

  if target_outing.id is null then
    return new;
  end if;

  select full_name into sender_name
  from public.users
  where id = new.user_id;

  message_excerpt := nullif(left(regexp_replace(coalesce(new.message, ''), '\s+', ' ', 'g'), 180), '');
  has_images := coalesce(array_length(new.image_paths, 1), 0) > 0 or nullif(new.image_path, '') is not null;

  for recipient in
    select distinct app_user.id, app_user.chat_email_alert_frequency
    from public.users app_user
    join auth.users auth_user on auth_user.id = app_user.id
    where auth_user.email_confirmed_at is not null
      and auth_user.deleted_at is null
      and app_user.email_alerts_enabled is true
      and app_user.chat_email_alert_frequency in ('immediate', 'important_only')
      and app_user.id <> new.user_id
      and (
        app_user.id = target_outing.skipper_id
        or exists (
          select 1
          from public.crew_requests request
          where request.outing_id = new.outing_id
            and request.crew_id = app_user.id
            and request.status = 'approved'
        )
      )
      and (
        app_user.chat_email_alert_frequency = 'immediate'
        or (
          app_user.chat_email_alert_frequency = 'important_only'
          and new.user_id = target_outing.skipper_id
        )
      )
  loop
    perform public.enqueue_email_alert(
      'new_chat_message',
      recipient.id,
      new.user_id,
      'event_chat',
      new.id,
      'outings',
      new.outing_id,
      'New SailAway outing chat message',
      'Open SailAway to read the latest outing chat message.',
      concat('https://tommiec25.github.io/Sailing/outing/', new.outing_id),
      jsonb_build_object(
        'chat_kind', 'outing',
        'chat_title', target_outing.title,
        'outing_id', new.outing_id,
        'message_id', new.id,
        'sender_name', sender_name,
        'message_excerpt', message_excerpt,
        'has_images', has_images,
        'outing_date', target_outing.outing_date,
        'outing_time', target_outing.outing_time
      ),
      concat('new_chat_message:outing:', new.id, ':', recipient.id)
    );
  end loop;

  return new;
end;
$$;

create or replace function public.queue_club_event_chat_email_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event record;
  sender record;
  recipient record;
  message_excerpt text;
  has_images boolean;
  important_sender boolean;
begin
  select
    event.id,
    event.title,
    event.created_by,
    event.event_date,
    event.event_time
  into target_event
  from public.club_events event
  where event.id = new.event_id;

  if target_event.id is null then
    return new;
  end if;

  select full_name, role
  into sender
  from public.users
  where id = new.user_id;

  important_sender := coalesce(sender.role = 'admin', false) or new.user_id = target_event.created_by;
  message_excerpt := nullif(left(regexp_replace(coalesce(new.message, ''), '\s+', ' ', 'g'), 180), '');
  has_images := coalesce(array_length(new.image_paths, 1), 0) > 0 or nullif(new.image_path, '') is not null;

  for recipient in
    select app_user.id, app_user.chat_email_alert_frequency
    from public.users app_user
    join auth.users auth_user on auth_user.id = app_user.id
    where auth_user.email_confirmed_at is not null
      and auth_user.deleted_at is null
      and app_user.email_alerts_enabled is true
      and app_user.chat_email_alert_frequency in ('immediate', 'important_only')
      and app_user.id <> new.user_id
      and (
        app_user.chat_email_alert_frequency = 'immediate'
        or (
          app_user.chat_email_alert_frequency = 'important_only'
          and important_sender
        )
      )
  loop
    perform public.enqueue_email_alert(
      'new_chat_message',
      recipient.id,
      new.user_id,
      'club_event_messages',
      new.id,
      'club_events',
      new.event_id,
      'New SailAway Rendezvous chat message',
      'Open SailAway to read the latest Rendezvous chat message.',
      concat('https://tommiec25.github.io/Sailing/event-chat/', new.event_id),
      jsonb_build_object(
        'chat_kind', 'rendezvous',
        'chat_title', target_event.title,
        'event_id', new.event_id,
        'message_id', new.id,
        'sender_name', sender.full_name,
        'message_excerpt', message_excerpt,
        'has_images', has_images,
        'event_date', target_event.event_date,
        'event_time', target_event.event_time
      ),
      concat('new_chat_message:rendezvous:', new.id, ':', recipient.id)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists queue_outing_chat_email_alerts on public.event_chat;
create trigger queue_outing_chat_email_alerts
after insert on public.event_chat
for each row
execute function public.queue_outing_chat_email_alerts();

drop trigger if exists queue_club_event_chat_email_alerts on public.club_event_messages;
create trigger queue_club_event_chat_email_alerts
after insert on public.club_event_messages
for each row
execute function public.queue_club_event_chat_email_alerts();
