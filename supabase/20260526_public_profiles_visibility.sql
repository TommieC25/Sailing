-- Restore public profile visibility while keeping public.users private.
-- The view exposes only safe profile fields. The SECURITY DEFINER function
-- applies the app's visibility rules without exposing email, phone, or role.

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
  where
    auth.uid() = visible_user.id
    or public.is_admin()
    or exists (
      select 1
      from public.outings outing
      where outing.skipper_id = visible_user.id
    )
    or exists (
      select 1
      from public.crew_requests request
      join public.outings outing on outing.id = request.outing_id
      where outing.skipper_id = auth.uid()
        and request.crew_id = visible_user.id
    )
    or exists (
      select 1
      from public.crew_requests viewer_request
      join public.crew_requests visible_request
        on visible_request.outing_id = viewer_request.outing_id
      where viewer_request.crew_id = auth.uid()
        and viewer_request.status = 'approved'
        and visible_request.status = 'approved'
        and visible_request.crew_id = visible_user.id
    );
$$;

revoke all on function public.visible_public_profiles() from public;
grant execute on function public.visible_public_profiles() to authenticated;

create or replace view public.public_profiles
with (security_invoker = true)
as
select * from public.visible_public_profiles();

grant select on public.public_profiles to authenticated;
