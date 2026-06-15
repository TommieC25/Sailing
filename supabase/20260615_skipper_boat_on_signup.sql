-- Require the app's skipper signup metadata to create a reusable saved boat.
-- Existing owners without boats are handled by the app's profile-completion gate.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  boat_parts text[];
  boat_name text;
  boat_details text;
  boat_size integer;
  boat_capacity integer;
  boat_location text;
begin
  delete from public.users where email = new.email and id <> new.id;

  insert into public.users (
    id, email, full_name, phone_number, gender, user_type, sailing_experience, photo_url
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'gender',
    coalesce(new.raw_user_meta_data->>'user_type', 'crew'),
    new.raw_user_meta_data->>'sailing_experience',
    new.raw_user_meta_data->>'photo_url'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.users.full_name),
    phone_number = coalesce(excluded.phone_number, public.users.phone_number),
    gender = coalesce(excluded.gender, public.users.gender),
    user_type = coalesce(excluded.user_type, public.users.user_type),
    sailing_experience = coalesce(excluded.sailing_experience, public.users.sailing_experience),
    photo_url = coalesce(excluded.photo_url, public.users.photo_url);

  if new.raw_user_meta_data->>'user_type' = 'owner' then
    boat_name := nullif(trim(new.raw_user_meta_data->>'boat_name'), '');
    boat_details := nullif(trim(new.raw_user_meta_data->>'boat_brand_model_color'), '');
    boat_size := nullif(new.raw_user_meta_data->>'boat_size_ft', '')::integer;
    boat_capacity := nullif(new.raw_user_meta_data->>'boat_capacity', '')::integer;
    boat_location := nullif(trim(new.raw_user_meta_data->>'boat_mooring_location'), '');

    if boat_name is null or boat_details is null or boat_size is null or boat_size < 1
       or boat_capacity is null or boat_capacity < 1 or boat_location is null then
      raise exception 'Boat details are required for Boat Owner / Skipper accounts';
    end if;

    boat_parts := string_to_array(boat_details, '/');

    insert into public.boats (
      owner_id, name, brand, model, color, size_ft, capacity, mooring_location
    ) values (
      new.id,
      boat_name,
      nullif(trim(boat_parts[1]), ''),
      nullif(trim(boat_parts[2]), ''),
      nullif(trim(boat_parts[3]), ''),
      boat_size,
      boat_capacity,
      boat_location
    );
  end if;

  return new;
end;
$$;
