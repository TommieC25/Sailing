-- Authors may edit the text or delete their own original submissions.
-- Workflow status and ownership remain outside these functions.

create or replace function public.edit_authored_submission(
  p_kind text,
  p_id uuid,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_title text := btrim(p_title);
  cleaned_body text := btrim(p_body);
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if cleaned_title = '' or cleaned_body = '' then raise exception 'Title and message are required'; end if;

  case p_kind
    when 'bug_report' then
      update public.bug_reports
      set title = cleaned_title, description = cleaned_body, updated_at = now()
      where id = p_id and user_id = auth.uid();
    when 'feature_request' then
      update public.feature_requests
      set title = cleaned_title, description = cleaned_body, updated_at = now()
      where id = p_id and user_id = auth.uid();
    when 'contact_message' then
      update public.contact_messages
      set subject = cleaned_title, message = cleaned_body, updated_at = now()
      where id = p_id and user_id = auth.uid();
    else
      raise exception 'Unsupported submission type';
  end case;

  if not found then raise exception 'Submission not found or not authored by current user'; end if;
end;
$$;

create or replace function public.delete_authored_submission(
  p_kind text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;

  case p_kind
    when 'bug_report' then
      delete from public.bug_reports where id = p_id and user_id = auth.uid();
    when 'feature_request' then
      delete from public.feature_requests where id = p_id and user_id = auth.uid();
    when 'contact_message' then
      delete from public.contact_messages where id = p_id and user_id = auth.uid();
    else
      raise exception 'Unsupported submission type';
  end case;

  if not found then raise exception 'Submission not found or not authored by current user'; end if;
end;
$$;

revoke all on function public.edit_authored_submission(text, uuid, text, text) from public;
revoke all on function public.delete_authored_submission(text, uuid) from public;
grant execute on function public.edit_authored_submission(text, uuid, text, text) to authenticated;
grant execute on function public.delete_authored_submission(text, uuid) to authenticated;
