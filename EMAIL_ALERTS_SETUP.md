# SailAway Email Alerts

This repo currently has Phase 1 and Phase 2 scaffolding for email alerts.

## Current status

- Phase 1 is live in Supabase: `email_alert_queue` receives queued rows for approved alert events.
- No real email is sent by the database.
- `supabase/functions/send-email-alerts` is a disabled-by-default Edge Function scaffold.
- Sender.net credentials are not stored in the repo.

## Alert events

The queue currently covers:

- new admin announcement to all confirmed users
- new outing to all confirmed users
- new crew request to the outing skipper
- crew request status update to the requesting user
- new direct message to the recipient

Group outing chat and Club Rendezvous chat do not send email alerts in the initial phase.

## Sender.net domain status

Sender.net account setup is under the SailAway/Sender account.

The intended sender identity is:

- From name: `CGSC Rendezvous`
- From email: `cgscclubcontact@cgsc.org`

Do not send broad production alerts until CGSC authorizes DNS changes and Sender shows domain authentication passing.

Known DNS guidance from Sender.net:

- Add DKIM CNAME:
  - Type: `CNAME`
  - Name/Host: `sender._domainkey`
  - Value/Target: `dkim.sendersrv.com`
- SPF must be merged into the existing `cgsc.org` SPF TXT record. Do not create a second SPF record.
- Existing DMARC should not be replaced without approval from the CGSC DNS/mail administrator.
- Do not change MX records.

## Edge Function environment variables

The function defaults to dry-run. It only sends email when explicitly enabled.

Required for any run:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for real sending:

- `SENDER_API_TOKEN`
- `EMAIL_ALERTS_ENABLED=true`

Recommended test controls:

- `EMAIL_ALERT_TEST_RECIPIENTS=tom@example.com,second@example.com`
- `EMAIL_ALERT_MAX_BATCH=5`
- `EMAIL_ALERT_FROM_EMAIL=cgscclubcontact@cgsc.org`
- `EMAIL_ALERT_FROM_NAME=CGSC Rendezvous`

If `EMAIL_ALERTS_ENABLED` is not `true`, the function returns `dry_run` results and does not mark queue rows sent.

If `EMAIL_ALERT_TEST_RECIPIENTS` is set, non-matching recipients are skipped.

If `EMAIL_ALERTS_ENABLED=true`, the function refuses to send unless either:

- `EMAIL_ALERT_TEST_RECIPIENTS` is set, or
- `EMAIL_ALERT_ALLOW_BROADCAST=true` is explicitly set.

## Next deployment steps

1. Wait for CGSC authorization before making DNS changes for `cgsc.org`.
2. Complete Sender.net DKIM/SPF authentication after DNS owner approval.
3. Store `SENDER_API_TOKEN` as a Supabase Edge Function secret.
4. Deploy `send-email-alerts`.
5. Invoke it first with `EMAIL_ALERTS_ENABLED` unset or false to confirm dry-run output.
6. Enable sending only for designated test recipients.
7. After successful tests, decide whether to enable all queued alerts.
