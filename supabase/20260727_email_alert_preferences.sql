-- Add a member-controlled email alert opt-out.
-- Email alerts remain on by default for confirmed users, but anyone can disable
-- them from their profile before future queue rows are created.

alter table public.users
add column if not exists email_alerts_enabled boolean not null default true;

create or replace function public.confirmed_email_recipients()
returns table (
  user_id uuid,
  email text,
  full_name text,
  user_type text
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    app_user.id,
    app_user.email,
    app_user.full_name,
    app_user.user_type
  from public.users app_user
  join auth.users auth_user
    on auth_user.id = app_user.id
  where auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
    and nullif(btrim(app_user.email), '') is not null
    and app_user.email_alerts_enabled is true;
$$;

revoke all on function public.confirmed_email_recipients() from public;

grant select on public.email_alert_queue to service_role;
