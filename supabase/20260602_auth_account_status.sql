-- Distinguish no account, unconfirmed account, and confirmed account for
-- signup/onboarding messaging without exposing Auth user details.

create or replace function public.auth_account_status(p_email text)
returns text
language sql
security definer
set search_path = auth, public
as $$
  select coalesce((
    select
      case
        when email_confirmed_at is null then 'unconfirmed'
        else 'confirmed'
      end
    from auth.users
    where lower(email) = lower(trim(p_email))
      and deleted_at is null
    order by created_at desc
    limit 1
  ), 'none');
$$;

revoke all on function public.auth_account_status(text) from public;
grant execute on function public.auth_account_status(text) to anon, authenticated;
