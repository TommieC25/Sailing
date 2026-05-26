-- Let signed-in members open safe profile pages throughout the app.
-- Private fields such as email, phone, and role remain available only through
-- admin-only users queries, not this public profile view.

create or replace function public.visible_public_profiles()
returns table (
  id uuid,
  full_name text,
  photo_url text,
  bio text,
  sailing_experience text,
  user_type text,
  gender text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    visible_user.id,
    visible_user.full_name::text,
    visible_user.photo_url::text,
    visible_user.bio::text,
    visible_user.sailing_experience::text,
    visible_user.user_type::text,
    visible_user.gender::text,
    visible_user.created_at
  from public.users visible_user
  where auth.uid() is not null;
$$;

revoke all on function public.visible_public_profiles() from public;
grant execute on function public.visible_public_profiles() to authenticated;

create or replace view public.public_profiles
with (security_invoker = true)
as
select * from public.visible_public_profiles();

grant select on public.public_profiles to authenticated;
