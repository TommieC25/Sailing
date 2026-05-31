-- One-on-one in-app messages between signed-in members.

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists direct_messages_sender_recipient_created_idx
on public.direct_messages (sender_id, recipient_id, created_at);

create index if not exists direct_messages_recipient_sender_created_idx
on public.direct_messages (recipient_id, sender_id, created_at);

create index if not exists direct_messages_unread_recipient_idx
on public.direct_messages (recipient_id, read_at)
where read_at is null;

alter table public.direct_messages enable row level security;

drop policy if exists direct_messages_select_participants on public.direct_messages;
create policy direct_messages_select_participants
on public.direct_messages
for select
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = recipient_id
);

drop policy if exists direct_messages_insert_sender on public.direct_messages;
create policy direct_messages_insert_sender
on public.direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and recipient_id <> auth.uid()
  and exists (
    select 1
    from public.users recipient
    where recipient.id = direct_messages.recipient_id
  )
);

drop policy if exists direct_messages_mark_read_recipient on public.direct_messages;
create policy direct_messages_mark_read_recipient
on public.direct_messages
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

grant select, insert, update on public.direct_messages to authenticated;
