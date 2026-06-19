-- Allow admins to moderate club-wide Rendezvous chat by deleting inappropriate
-- or misplaced messages. Other message types remain author-only.

create or replace function public.delete_authored_message(
  p_kind text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  case p_kind
    when 'outing_chat' then
      delete from public.event_chat where id = p_id and user_id = auth.uid();
    when 'club_event_chat' then
      delete from public.club_event_messages
      where id = p_id
        and (user_id = auth.uid() or public.is_admin());
    when 'direct_message' then
      delete from public.direct_messages where id = p_id and sender_id = auth.uid();
    when 'bug_reply' then
      delete from public.bug_report_replies where id = p_id and sender_id = auth.uid();
    when 'feature_reply' then
      delete from public.feature_request_replies where id = p_id and sender_id = auth.uid();
    else
      raise exception 'Unsupported message type';
  end case;

  if not found then
    raise exception 'Message not found or not authorized for deletion';
  end if;
end;
$$;

revoke all on function public.delete_authored_message(text, uuid) from public;
grant execute on function public.delete_authored_message(text, uuid) to authenticated;
