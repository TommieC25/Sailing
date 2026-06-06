-- Record acceptance of the current SailAway / CGSC liability waiver.
-- Existing users remain null and will be prompted on their next authenticated visit.

alter table public.users
  add column if not exists waiver_version text,
  add column if not exists waiver_accepted_at timestamptz;

create table if not exists public.waiver_versions (
  version text primary key,
  waiver_text text not null,
  effective_at timestamptz not null default now()
);

insert into public.waiver_versions (version, waiver_text)
values (
  '2026-06-05',
  'I acknowledge and confirm that I realize that sailing involves some level of risk. I assume full responsibility for any injury, loss, or damage that may come to myself or any other person, boat, equipment, dock or other property as the result of my use, negligence, violation of the rules or other actions which I may take or fail to take in conjunction with this activity / event. I further agree to hold Coconut Grove Sailing Club, its instructors and other personnel, US Sailing, their representatives, and the creators of this platform harmless for injuries to persons or damage to property.'
)
on conflict (version) do update
set waiver_text = excluded.waiver_text;

create table if not exists public.user_waiver_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  waiver_version text not null references public.waiver_versions(version),
  accepted_at timestamptz not null default now(),
  primary key (user_id, waiver_version)
);

alter table public.waiver_versions enable row level security;
alter table public.user_waiver_acceptances enable row level security;

drop policy if exists waiver_versions_select_authenticated
on public.waiver_versions;
create policy waiver_versions_select_authenticated
on public.waiver_versions
for select
to authenticated
using (true);

drop policy if exists user_waiver_acceptances_select_own_or_admin
on public.user_waiver_acceptances;
create policy user_waiver_acceptances_select_own_or_admin
on public.user_waiver_acceptances
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

comment on column public.users.waiver_version is
  'Version of the liability waiver accepted by this user.';

comment on column public.users.waiver_accepted_at is
  'Timestamp when this user accepted the recorded waiver version.';

create or replace function public.populate_signup_waiver_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  signup_metadata jsonb;
begin
  new.waiver_version := null;
  new.waiver_accepted_at := null;

  select raw_user_meta_data
    into signup_metadata
  from auth.users
  where id = new.id;

  if signup_metadata ->> 'waiver_version' is not null
     and signup_metadata ->> 'waiver_accepted_at' is not null
     and exists (
       select 1
       from public.waiver_versions
       where version = signup_metadata ->> 'waiver_version'
     ) then
    new.waiver_version := signup_metadata ->> 'waiver_version';
    new.waiver_accepted_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists populate_signup_waiver_acceptance on public.users;
create trigger populate_signup_waiver_acceptance
before insert on public.users
for each row
execute function public.populate_signup_waiver_acceptance();

create or replace function public.record_inserted_profile_waiver_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.waiver_version is not null and new.waiver_accepted_at is not null then
    insert into public.user_waiver_acceptances (user_id, waiver_version, accepted_at)
    values (new.id, new.waiver_version, new.waiver_accepted_at)
    on conflict (user_id, waiver_version) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists record_inserted_profile_waiver_acceptance on public.users;
create trigger record_inserted_profile_waiver_acceptance
after insert on public.users
for each row
execute function public.record_inserted_profile_waiver_acceptance();

create or replace function public.prevent_direct_waiver_acceptance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.waiver_version is distinct from new.waiver_version
      or old.waiver_accepted_at is distinct from new.waiver_accepted_at)
     and coalesce(current_setting('sailaway.recording_waiver', true), '') <> 'true' then
    raise exception 'Waiver acceptance must be recorded through the acceptance workflow';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_direct_waiver_acceptance_change on public.users;
create trigger prevent_direct_waiver_acceptance_change
before update of waiver_version, waiver_accepted_at on public.users
for each row
execute function public.prevent_direct_waiver_acceptance_change();

create or replace function public.accept_current_waiver(p_waiver_version text)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_profile public.users;
  accepted_time timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept the waiver';
  end if;

  if nullif(trim(p_waiver_version), '') is null then
    raise exception 'Waiver version is required';
  end if;

  if not exists (
    select 1
    from public.waiver_versions
    where version = p_waiver_version
  ) then
    raise exception 'Waiver version is not recognized';
  end if;

  insert into public.user_waiver_acceptances (user_id, waiver_version, accepted_at)
  values (auth.uid(), p_waiver_version, accepted_time)
  on conflict (user_id, waiver_version) do nothing;

  perform set_config('sailaway.recording_waiver', 'true', true);

  update public.users
  set waiver_version = p_waiver_version,
      waiver_accepted_at = accepted_time
  where id = auth.uid()
  returning * into accepted_profile;

  if accepted_profile.id is null then
    raise exception 'User profile not found';
  end if;

  return accepted_profile;
end;
$$;

revoke all on function public.accept_current_waiver(text) from public;
grant execute on function public.accept_current_waiver(text) to authenticated;
