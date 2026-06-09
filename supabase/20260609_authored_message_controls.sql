-- Let authenticated users edit or delete only messages they personally authored.
-- Security-definer RPCs keep read-receipt and relationship fields out of reach.

create or replace function public.edit_authored_message(
  p_kind text,
  p_id uuid,
  p_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_text text := btrim(p_text);
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if cleaned_text = '' then
    raise exception 'Message cannot be empty';
  end if;

  case p_kind
    when 'outing_chat' then
      update public.event_chat set message = cleaned_text
      where id = p_id and user_id = auth.uid();
    when 'club_event_chat' then
      update public.club_event_messages set message = cleaned_text
      where id = p_id and user_id = auth.uid();
    when 'direct_message' then
      update public.direct_messages set body = cleaned_text
      where id = p_id and sender_id = auth.uid();
    when 'bug_reply' then
      update public.bug_report_replies set message = cleaned_text
      where id = p_id and sender_id = auth.uid();
    when 'feature_reply' then
      update public.feature_request_replies set message = cleaned_text
      where id = p_id and sender_id = auth.uid();
    else
      raise exception 'Unsupported message type';
  end case;

  if not found then
    raise exception 'Message not found or not authored by current user';
  end if;
end;
$$;

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
      delete from public.club_event_messages where id = p_id and user_id = auth.uid();
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
    raise exception 'Message not found or not authored by current user';
  end if;
end;
$$;

revoke all on function public.edit_authored_message(text, uuid, text) from public;
revoke all on function public.delete_authored_message(text, uuid) from public;
grant execute on function public.edit_authored_message(text, uuid, text) to authenticated;
grant execute on function public.delete_authored_message(text, uuid) to authenticated;
