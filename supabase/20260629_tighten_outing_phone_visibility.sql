-- Keep skipper phone numbers scoped to actual outing participation.
-- Approved crew can see the skipper, while skippers/admins can see outing contacts.

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
    and outing.id = any(p_outing_ids)
    and (
      public.is_admin()
      or outing.skipper_id = auth.uid()
      or exists (
        select 1
        from public.crew_requests request
        where request.outing_id = outing.id
          and request.crew_id = auth.uid()
          and request.status = 'approved'
      )
    );
$$;

revoke all on function public.outing_skipper_contacts(uuid[]) from public;
grant execute on function public.outing_skipper_contacts(uuid[]) to authenticated;
