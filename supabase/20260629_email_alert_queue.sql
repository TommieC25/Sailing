-- Phase 1 email alerts: queue only, no external email sending.
-- The queue lets us verify who would receive app-generated email alerts before
-- wiring Sender.net or any other delivery provider.

create table if not exists public.email_alert_queue (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null check (
    alert_type in (
      'admin_announcement',
      'new_outing',
      'new_crew_request',
      'crew_request_status',
      'new_direct_message'
    )
  ),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  actor_user_id uuid references public.users(id) on delete set null,
  source_table text not null,
  source_id uuid not null,
  related_table text,
  related_id uuid,
  subject text not null,
  preview text not null,
  action_url text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  dedupe_key text not null unique
);

create index if not exists email_alert_queue_status_available_idx
on public.email_alert_queue (status, available_at, created_at);

create index if not exists email_alert_queue_recipient_created_idx
on public.email_alert_queue (recipient_user_id, created_at desc);

alter table public.email_alert_queue enable row level security;

drop policy if exists email_alert_queue_no_client_access on public.email_alert_queue;
create policy email_alert_queue_no_client_access
on public.email_alert_queue
for all
to authenticated
using (false)
with check (false);

revoke all on public.email_alert_queue from anon, authenticated;

create or replace function public.confirmed_email_recipients()
returns table (
  user_id uuid,
  email text,
  full_name text,
  user_type text
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    app_user.id,
    app_user.email,
    app_user.full_name,
    app_user.user_type
  from public.users app_user
  join auth.users auth_user
    on auth_user.id = app_user.id
  where auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
    and nullif(btrim(app_user.email), '') is not null;
$$;

revoke all on function public.confirmed_email_recipients() from public;

create or replace function public.enqueue_email_alert(
  p_alert_type text,
  p_recipient_user_id uuid,
  p_actor_user_id uuid,
  p_source_table text,
  p_source_id uuid,
  p_related_table text,
  p_related_id uuid,
  p_subject text,
  p_preview text,
  p_action_url text,
  p_payload jsonb,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  select *
  into recipient
  from public.confirmed_email_recipients()
  where user_id = p_recipient_user_id;

  if recipient.user_id is null then
    return;
  end if;

  insert into public.email_alert_queue (
    alert_type,
    recipient_user_id,
    recipient_email,
    recipient_name,
    actor_user_id,
    source_table,
    source_id,
    related_table,
    related_id,
    subject,
    preview,
    action_url,
    payload,
    dedupe_key
  )
  values (
    p_alert_type,
    recipient.user_id,
    recipient.email,
    recipient.full_name,
    p_actor_user_id,
    p_source_table,
    p_source_id,
    p_related_table,
    p_related_id,
    p_subject,
    p_preview,
    p_action_url,
    coalesce(p_payload, '{}'::jsonb),
    p_dedupe_key
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

revoke all on function public.enqueue_email_alert(text, uuid, uuid, text, uuid, text, uuid, text, text, text, jsonb, text) from public;

create or replace function public.queue_admin_announcement_email_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  for recipient in select * from public.confirmed_email_recipients()
  loop
    perform public.enqueue_email_alert(
      'admin_announcement',
      recipient.user_id,
      new.admin_id,
      'announcements',
      new.id,
      null,
      null,
      'New CGSC Rendezvous announcement',
      'Open SailAway to read the latest announcement.',
      'https://tommiec25.github.io/Sailing/announcements',
      jsonb_build_object(
        'announcement_id', new.id,
        'title', new.title
      ),
      concat('admin_announcement:', new.id, ':', recipient.user_id)
    );
  end loop;

  return new;
end;
$$;

create or replace function public.queue_new_outing_email_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  if new.status <> 'open' then
    return new;
  end if;

  for recipient in select * from public.confirmed_email_recipients()
  loop
    perform public.enqueue_email_alert(
      'new_outing',
      recipient.user_id,
      new.skipper_id,
      'outings',
      new.id,
      null,
      null,
      'New SailAway outing posted',
      'Open SailAway to view the new outing.',
      concat('https://tommiec25.github.io/Sailing/outing/', new.id),
      jsonb_build_object(
        'outing_id', new.id,
        'title', new.title,
        'outing_date', new.outing_date,
        'outing_time', new.outing_time,
        'location', new.location
      ),
      concat('new_outing:', new.id, ':', recipient.user_id)
    );
  end loop;

  return new;
end;
$$;

create or replace function public.queue_new_crew_request_email_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_outing record;
  crew_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select outing.id, outing.title, outing.skipper_id
  into target_outing
  from public.outings outing
  where outing.id = new.outing_id;

  if target_outing.id is null then
    return new;
  end if;

  select full_name into crew_name
  from public.users
  where id = new.crew_id;

  perform public.enqueue_email_alert(
    'new_crew_request',
    target_outing.skipper_id,
    new.crew_id,
    'crew_requests',
    new.id,
    'outings',
    new.outing_id,
    'New SailAway crew request',
    'Open SailAway to review a request to join your outing.',
    concat('https://tommiec25.github.io/Sailing/outing/', new.outing_id),
    jsonb_build_object(
      'crew_request_id', new.id,
      'outing_id', new.outing_id,
      'outing_title', target_outing.title,
      'crew_name', crew_name
    ),
    concat('new_crew_request:', new.id, ':', target_outing.skipper_id)
  );

  return new;
end;
$$;

create or replace function public.queue_crew_request_status_email_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_outing record;
  status_label text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status not in ('approved', 'declined', 'waitlisted') then
    return new;
  end if;

  select outing.id, outing.title, outing.skipper_id
  into target_outing
  from public.outings outing
  where outing.id = new.outing_id;

  if target_outing.id is null then
    return new;
  end if;

  status_label := case new.status
    when 'approved' then 'approved'
    when 'waitlisted' then 'waitlisted'
    else 'updated'
  end;

  perform public.enqueue_email_alert(
    'crew_request_status',
    new.crew_id,
    target_outing.skipper_id,
    'crew_requests',
    new.id,
    'outings',
    new.outing_id,
    concat('Your SailAway outing request was ', status_label),
    'Open SailAway to see the skipper response to your outing request.',
    concat('https://tommiec25.github.io/Sailing/outing/', new.outing_id),
    jsonb_build_object(
      'crew_request_id', new.id,
      'outing_id', new.outing_id,
      'outing_title', target_outing.title,
      'status', new.status
    ),
    concat('crew_request_status:', new.id, ':', new.status, ':', coalesce(new.status_changed_at::text, new.responded_at::text, now()::text), ':', new.crew_id)
  );

  return new;
end;
$$;

create or replace function public.queue_direct_message_email_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select full_name into sender_name
  from public.users
  where id = new.sender_id;

  perform public.enqueue_email_alert(
    'new_direct_message',
    new.recipient_id,
    new.sender_id,
    'direct_messages',
    new.id,
    'direct_messages',
    new.id,
    'New SailAway message',
    'Open SailAway to read your new message.',
    concat('https://tommiec25.github.io/Sailing/messages/', new.sender_id),
    jsonb_build_object(
      'direct_message_id', new.id,
      'sender_name', sender_name,
      'contact_message_id', new.contact_message_id
    ),
    concat('new_direct_message:', new.id, ':', new.recipient_id)
  );

  return new;
end;
$$;

drop trigger if exists queue_admin_announcement_email_alerts on public.announcements;
create trigger queue_admin_announcement_email_alerts
after insert on public.announcements
for each row
execute function public.queue_admin_announcement_email_alerts();

drop trigger if exists queue_new_outing_email_alerts on public.outings;
create trigger queue_new_outing_email_alerts
after insert on public.outings
for each row
execute function public.queue_new_outing_email_alerts();

drop trigger if exists queue_new_crew_request_email_alert on public.crew_requests;
create trigger queue_new_crew_request_email_alert
after insert on public.crew_requests
for each row
execute function public.queue_new_crew_request_email_alert();

drop trigger if exists queue_crew_request_status_email_alert on public.crew_requests;
create trigger queue_crew_request_status_email_alert
after update of status on public.crew_requests
for each row
execute function public.queue_crew_request_status_email_alert();

drop trigger if exists queue_direct_message_email_alert on public.direct_messages;
create trigger queue_direct_message_email_alert
after insert on public.direct_messages
for each row
execute function public.queue_direct_message_email_alert();
