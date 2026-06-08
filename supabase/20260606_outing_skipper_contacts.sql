-- Expose a skipper's mobile number only in the context of an actual outing.
-- This avoids broadly adding private phone numbers to public_profiles.

create or replace function public.outing_skipper_contacts(p_outing_ids uuid[])
returns table (
  outing_id uuid,
  phone_number text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    outing.id,
    coalesce(skipper.phone_number, skipper.phone)
  from public.outings outing
  join public.users skipper on skipper.id = outing.skipper_id
  where auth.uid() is not null
    and outing.id = any(p_outing_ids);
$$;

revoke all on function public.outing_skipper_contacts(uuid[]) from public;
grant execute on function public.outing_skipper_contacts(uuid[]) to authenticated;
