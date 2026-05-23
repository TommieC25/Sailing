# Admin Setup

CGSC Sailing uses one admin model:

- Admin status lives in `public.users.role`.
- `role = 'admin'` means the user sees admin menus and can access admin pages.
- `role = 'user'` means the user sees the normal member menu.
- Do not use a separate `admins` table for this app.
- Do not use Supabase Auth metadata for admin checks.

## Current Intended Admin

Tom should be the only admin initially:

```text
sailortommie09@gmail.com
```

## Set Tom As The Only Admin

Run this in Supabase SQL Editor:

```sql
update public.users
set role = 'user'
where role = 'admin';

update public.users
set role = 'admin'
where email = 'sailortommie09@gmail.com';
```

After this, only Tom should see:

- the gold admin gear
- Admin Dashboard
- Admin Inbox
- inbox counts for bug reports, feature requests, and contact messages
- admin controls for announcements and user roles

## Add Another Admin Later

Preferred method:

1. Sign in as Tom.
2. Open Admin Dashboard.
3. Go to Community.
4. Click `Make Admin` next to the person.

That updates their `public.users.role` to `admin`.

Manual SQL fallback:

```sql
update public.users
set role = 'admin'
where email = 'person@example.com';
```

## Remove An Admin

Preferred method:

1. Sign in as Tom.
2. Open Admin Dashboard.
3. Go to Admins.
4. Click `Remove` next to the admin.

That updates their `public.users.role` back to `user`.

Manual SQL fallback:

```sql
update public.users
set role = 'user'
where email = 'person@example.com';
```

## Important Supabase User Deletion Note

Supabase has two user records:

- `auth.users`: login account, email, password, confirmation status
- `public.users`: app profile, role, bio, phone, photo, owner/crew type

Deleting only `public.users` does not delete the login account. To fully remove a test user and reuse the same email, delete the user from Supabase Authentication first, then clean up app table rows.
