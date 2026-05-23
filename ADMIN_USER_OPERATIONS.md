# CGSC Sailing Admin User Operations

This app uses Supabase, which means each real person has two different records:

1. `auth.users`
   The Supabase login account. This controls email, password, confirmation status, and whether the person can sign in.

2. `public.users`
   The app profile. This controls full name, phone, photo, bio, boat/crew type, and app role such as `user` or `admin`.

Deleting only the row in `public.users` does not delete the login account. The email can still be tied up in Supabase Auth, which can make fresh signup testing confusing.

## Fully Remove A Test User

Use this order:

1. In Supabase, go to Authentication > Users.
2. Find the person by email.
3. Delete the Auth user there.
4. Then remove related rows in app tables if needed, such as:
   - `public.users`
   - `public.boats`
   - `public.outings`
   - `public.crew_requests`
   - `public.bug_reports`
   - `public.feature_requests`
   - `public.contact_messages`
   - `public.announcement_views`

## Admin Model

The intended admin model is:

- Admin status lives in `public.users.role`.
- Your account should have `role = 'admin'`.
- Normal members should have `role = 'user'`.
- The app should not use a separate `admins` table.
- The app should not use Supabase Auth metadata to decide who is an admin.

## Set Tom As The Only Admin

Run this in Supabase SQL Editor after replacing the email if needed:

```sql
update public.users
set role = 'user'
where role = 'admin';

update public.users
set role = 'admin'
where email = 'sailortommie09@gmail.com';
```

After that, only Tom should see the admin menu. Tom can promote another person later from the Admin Dashboard, which updates that person's `public.users.role` to `admin`.

## What Not To Do

Do not delete only the `public.users` row when trying to retest signup with the same email. That leaves the login account behind in `auth.users`.

Do not add admin users to a separate `admins` table unless the app is intentionally redesigned around that table. The current target design uses `public.users.role`.
