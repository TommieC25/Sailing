-- Let signed-in members message visible public profiles.
--
-- The previous insert policy checked the recipient against public.users. That
-- table is intentionally private, so ordinary members could not "see" an
-- admin recipient row during the RLS check even when the app showed the
-- admin's safe public profile.

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
);
