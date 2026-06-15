# CGSC Sailing Admin User Operations

This app uses Supabase, which means each real person has two different records:

1. `auth.users`
   The Supabase login account. This controls email, password, confirmation status, and whether the person can sign in.

2. `public.users`
   The app profile. This controls full name, phone, photo, bio, boat/crew type, and app role such as `user` or `admin`.

Deleting only the row in `public.users` does not delete the login account. The email can still be tied up in Supabase Auth, which can make fresh signup testing confusing.

## Fully Remove A Test User

For repeatable local administration, create the git-ignored `.env.admin.local`
from `.env.admin.example` and add the direct Supabase Postgres connection URL.

Inspect an exact email without changing anything:

```sh
npm run admin:user-status -- user@example.com
```

## Recover An Unconfirmed Account

If a member completed signup but did not receive the confirmation email:

1. Verify the exact email address and the member's identity directly.
2. Inspect the account and confirm `email_confirmed_at` is null:

```sh
npm run admin:user-status -- user@example.com
```

3. Request one resend from the app's Check Your Email screen.
4. If delivery still fails, confirm the existing account without deleting it:

```sh
npm run admin:user-confirm -- user@example.com --confirm user@example.com
```

This operation requires the exact email twice and refuses to act unless exactly
one matching Auth user exists. Do not diagnose a system-wide email outage from
one failed recipient. First compare recent confirmation history and state what
the available evidence can and cannot prove.

Delete an exact test account only after reviewing the status output:

```sh
npm run admin:user-delete -- user@example.com --confirm user@example.com
```

The matching confirmation is required to reduce accidental deletion risk. The
helper deletes the matching Auth identity and Auth user in one transaction,
then verifies Auth, identity, and profile state. If related data prevents
deletion, the transaction rolls back without partially deleting the account.

The fallback manual method remains:

1. In Supabase, go to Authentication > Users.
2. Find the person by email.
3. Delete the Auth user there.
4. Verify both `auth.users` and `auth.identities` no longer contain the email.

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
