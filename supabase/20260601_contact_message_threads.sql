-- Keep replies to Admin Inbox contact messages separate from generic
-- one-on-one direct messages.

alter table public.direct_messages
add column if not exists contact_message_id uuid references public.contact_messages(id) on delete cascade;

create index if not exists direct_messages_contact_message_created_idx
on public.direct_messages (contact_message_id, created_at)
where contact_message_id is not null;

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
    from public.public_profiles recipient
    where recipient.id = direct_messages.recipient_id
  )
  and (
    contact_message_id is null
    or exists (
      select 1
      from public.contact_messages contact
      where contact.id = direct_messages.contact_message_id
        and contact.user_id in (direct_messages.sender_id, direct_messages.recipient_id)
        and (auth.uid() = contact.user_id or public.is_admin())
    )
  )
);
