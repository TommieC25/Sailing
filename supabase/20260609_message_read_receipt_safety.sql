-- Read receipts must not grant permission to alter another person's message.

create or replace function public.mark_direct_messages_read(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.direct_messages
  set read_at = now()
  where id = any(p_ids)
    and recipient_id = auth.uid()
    and read_at is null;
$$;

create or replace function public.mark_bug_report_replies_read(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.bug_report_replies reply
  set read_at = now()
  where reply.id = any(p_ids)
    and reply.sender_id <> auth.uid()
    and reply.read_at is null
    and (
      public.is_admin()
      or exists (
        select 1 from public.bug_reports report
        where report.id = reply.bug_report_id and report.user_id = auth.uid()
      )
    );
$$;

create or replace function public.mark_feature_request_replies_read(p_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.feature_request_replies reply
  set read_at = now()
  where reply.id = any(p_ids)
    and reply.sender_id <> auth.uid()
    and reply.read_at is null
    and (
      public.is_admin()
      or exists (
        select 1 from public.feature_requests request
        where request.id = reply.feature_request_id and request.user_id = auth.uid()
      )
    );
$$;

revoke all on function public.mark_direct_messages_read(uuid[]) from public;
revoke all on function public.mark_bug_report_replies_read(uuid[]) from public;
revoke all on function public.mark_feature_request_replies_read(uuid[]) from public;
grant execute on function public.mark_direct_messages_read(uuid[]) to authenticated;
grant execute on function public.mark_bug_report_replies_read(uuid[]) to authenticated;
grant execute on function public.mark_feature_request_replies_read(uuid[]) to authenticated;

drop policy if exists direct_messages_mark_read_recipient on public.direct_messages;
drop policy if exists bug_report_replies_update_related on public.bug_report_replies;
drop policy if exists feature_request_replies_update_related on public.feature_request_replies;

revoke update on public.direct_messages from authenticated;
revoke update on public.bug_report_replies from authenticated;
revoke update on public.feature_request_replies from authenticated;
