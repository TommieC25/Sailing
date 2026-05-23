# RLS Security Test Checklist

Use this checklist when verifying the Supabase policies.

## Admin Visibility

- A normal user cannot open `/admin/dashboard`.
- A normal user cannot open `/admin/inbox`.
- A normal user does not see the gold admin gear.
- A normal user does not see the Admin Dashboard or Admin Inbox menu items.
- A normal user cannot identify admins through normal app screens.

## Admin Role Source

- Admin access is granted only by `public.users.role = 'admin'`.
- The app does not query a separate `admins` table.
- The app does not use Supabase Auth metadata for admin access.

## Initial Admin State

- `sailortommie09@gmail.com` has `role = 'admin'`.
- All other users initially have `role = 'user'`.

## User Forms

- Normal users can submit bug reports.
- Normal users can submit feature requests.
- Normal users can submit contact admin messages.
- Normal users can only see their own submitted records if the app exposes history later.
- Admins can see all submitted records in the admin inbox/dashboard.

## User Deletion / Retesting

- Deleting a row from `public.users` alone does not delete the login account.
- To fully remove a test user, delete the account from Supabase Authentication first.
- Then clean up related app rows as needed.
