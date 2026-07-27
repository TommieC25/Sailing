-- Include announcement body text in future admin announcement email alerts.

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
        'title', new.title,
        'message', new.message
      ),
      concat('admin_announcement:', new.id, ':', recipient.user_id)
    );
  end loop;

  return new;
end;
$$;
