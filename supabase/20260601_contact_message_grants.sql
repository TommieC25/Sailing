-- Ensure contact-message thread reads/replies can update message attention state.
-- RLS still limits access to the submitter or admins.

grant select, insert, update, delete on public.contact_messages to authenticated;
