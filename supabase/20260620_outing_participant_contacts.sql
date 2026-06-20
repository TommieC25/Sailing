-- Expose phone numbers only within an outing relationship:
-- - approved crew see the skipper and other approved crew;
-- - the skipper and admins see the skipper and everyone who requested;
-- - unrelated members receive no rows.

create or replace function public.outing_participant_contacts(p_outing_id uuid)
returns table (
  user_id uuid,
  phone_number text
)
language sql
security definer
stable
set search_path = public
as $$
  with target_outing as (
    select outing.id, outing.skipper_id
    from public.outings outing
    where outing.id = p_outing_id
  ), authorized_viewer as (
    select exists (
      select 1
      from target_outing outing
      where public.is_admin()
        or outing.skipper_id = auth.uid()
        or exists (
          select 1
          from public.crew_requests request
          where request.outing_id = outing.id
            and request.crew_id = auth.uid()
            and request.status = 'approved'
        )
    ) as allowed
  )
  select
    participant.id,
    coalesce(participant.phone_number, participant.phone)
  from public.users participant
  cross join target_outing outing
  cross join authorized_viewer viewer
  where auth.uid() is not null
    and viewer.allowed
    and (
      participant.id = outing.skipper_id
      or exists (
        select 1
        from public.crew_requests request
        where request.outing_id = outing.id
          and request.crew_id = participant.id
          and (
            request.status = 'approved'
            or public.is_admin()
            or outing.skipper_id = auth.uid()
          )
      )
    );
$$;

revoke all on function public.outing_participant_contacts(uuid) from public;
grant execute on function public.outing_participant_contacts(uuid) to authenticated;

create or replace function public.require_crew_request_phone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phone_digits text;
begin
  select regexp_replace(coalesce(member.phone_number, member.phone, ''), '\D', '', 'g')
  into phone_digits
  from public.users member
  where member.id = new.crew_id;

  if coalesce(length(phone_digits), 0) <> 10 then
    raise exception 'Add a valid 10-digit mobile phone number to your profile before requesting an outing';
  end if;

  return new;
end;
$$;

drop trigger if exists require_crew_request_phone on public.crew_requests;
create trigger require_crew_request_phone
before insert on public.crew_requests
for each row
execute function public.require_crew_request_phone();
