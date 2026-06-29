-- Controlled service-side operations for the email alert sender Edge Function.
-- These functions do not send email. They only let a privileged function claim
-- and mark queue rows without granting client access to email_alert_queue.

create or replace function public.claim_email_alert_queue_row(p_alert_id uuid)
returns table (
  id uuid,
  alert_type text,
  recipient_user_id uuid,
  recipient_email text,
  recipient_name text,
  actor_user_id uuid,
  source_table text,
  source_id uuid,
  related_table text,
  related_id uuid,
  subject text,
  preview text,
  action_url text,
  payload jsonb,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.email_alert_queue queue
  set status = 'sending',
      attempts = queue.attempts + 1,
      last_error = null
  where queue.id = p_alert_id
    and queue.status = 'pending'
    and queue.available_at <= now()
  returning
    queue.id,
    queue.alert_type,
    queue.recipient_user_id,
    queue.recipient_email,
    queue.recipient_name,
    queue.actor_user_id,
    queue.source_table,
    queue.source_id,
    queue.related_table,
    queue.related_id,
    queue.subject,
    queue.preview,
    queue.action_url,
    queue.payload,
    queue.attempts;
end;
$$;

create or replace function public.mark_email_alert_sent(p_alert_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.email_alert_queue
  set status = 'sent',
      sent_at = now(),
      last_error = null
  where id = p_alert_id
    and status = 'sending';
$$;

create or replace function public.mark_email_alert_failed(
  p_alert_id uuid,
  p_error text,
  p_retry_after_seconds integer default 900
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.email_alert_queue
  set status = 'failed',
      last_error = left(coalesce(p_error, 'Unknown email sending error'), 2000),
      available_at = now() + make_interval(secs => greatest(coalesce(p_retry_after_seconds, 900), 60))
  where id = p_alert_id
    and status = 'sending';
$$;

revoke all on function public.claim_email_alert_queue_row(uuid) from public;
revoke all on function public.mark_email_alert_sent(uuid) from public;
revoke all on function public.mark_email_alert_failed(uuid, text, integer) from public;

grant execute on function public.claim_email_alert_queue_row(uuid) to service_role;
grant execute on function public.mark_email_alert_sent(uuid) to service_role;
grant execute on function public.mark_email_alert_failed(uuid, text, integer) to service_role;
