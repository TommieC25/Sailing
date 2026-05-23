# RLS / Access-Control Notes

This document reflects the intended current admin model for CGSC Sailing.

## Admin Model

Admin status must be based on:

```sql
public.users.role = 'admin'
```

The app should not use:

- a separate `admins` table
- Supabase Auth metadata such as `app_metadata.role`

## Required Behavior

- Normal users can create bug reports, feature requests, and contact admin messages.
- Normal users should not see the admin menu, admin inbox, admin dashboard, or the list of admins.
- Admin users can see inbox items, resolve/open reports, manage announcements, and promote/remove other admins.
- Tom should be the only initial admin.

## Supabase Setup

To reset admin access so only Tom is admin:

```sql
update public.users
set role = 'user'
where role = 'admin';

update public.users
set role = 'admin'
where email = 'sailortommie09@gmail.com';
```

## Important Security Note

If `public.users` has a policy that lets every signed-in user run `select * from public.users`, then regular users may be able to see the `role` column by inspecting network/API calls, even if the app UI hides it.

The safer long-term design is:

1. Keep `public.users.role` private to the current user and admins.
2. Use a public profile view, or carefully limited profile queries, for community/member browsing.
3. Never expose admin-only fields in public profile lists.

## User Deletion Note

Supabase has two user records:

- `auth.users`: login account
- `public.users`: app profile

Deleting only `public.users` does not fully remove the account. To reuse an email for testing, delete the user from Supabase Authentication first.
