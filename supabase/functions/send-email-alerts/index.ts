const SENDER_API_URL = 'https://api.sender.net/v2/message/send';
const APP_BASE_URL = 'https://tommiec25.github.io/Sailing';

type QueueRow = {
  id: string;
  alert_type: string;
  recipient_user_id: string;
  recipient_email: string;
  recipient_name: string | null;
  actor_user_id: string | null;
  source_table: string;
  source_id: string;
  related_table: string | null;
  related_id: string | null;
  subject: string;
  preview: string;
  action_url: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type SendResult = {
  id: string;
  recipient: string;
  status: 'dry_run' | 'sent' | 'skipped' | 'failed';
  alertType: string;
  subject: string;
  error?: string;
};

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const env = (key: string, fallback = '') => Deno.env.get(key) || fallback;

const getIntEnv = (key: string, fallback: number) => {
  const value = Number.parseInt(env(key), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const htmlEscape = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const textForPayload = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const alertDetail = (row: QueueRow) => {
  const payload = row.payload || {};

  if (row.alert_type === 'admin_announcement') {
    return textForPayload(payload.title)
      ? `Announcement: ${payload.title}`
      : 'A new SailAway announcement has been posted.';
  }

  if (row.alert_type === 'new_outing') {
    const title = textForPayload(payload.title);
    const date = textForPayload(payload.outing_date);
    const time = textForPayload(payload.outing_time);
    return [title ? `Outing: ${title}` : 'A new SailAway outing has been posted', [date, time].filter(Boolean).join(' at ')].filter(Boolean).join(' · ');
  }

  if (row.alert_type === 'new_crew_request') {
    const crewName = textForPayload(payload.crew_name) || 'A SailAway member';
    const outingTitle = textForPayload(payload.outing_title) || 'your outing';
    return `${crewName} requested to join ${outingTitle}.`;
  }

  if (row.alert_type === 'crew_request_status') {
    const outingTitle = textForPayload(payload.outing_title) || 'an outing';
    return `The skipper updated your request for ${outingTitle}.`;
  }

  if (row.alert_type === 'new_direct_message') {
    const senderName = textForPayload(payload.sender_name) || 'a SailAway member';
    return `You have a new message from ${senderName}.`;
  }

  return row.preview;
};

const renderEmail = (row: QueueRow) => {
  const detail = alertDetail(row);
  const safeActionUrl = row.action_url.startsWith(APP_BASE_URL) ? row.action_url : APP_BASE_URL;
  const greeting = row.recipient_name ? `Hello, ${row.recipient_name.split(' ')[0]}!` : 'Hello, Sailor!';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5; max-width: 620px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 22px; margin: 0 0 16px; color: #0c2340;">${htmlEscape(greeting)}</h1>
      <p style="font-size: 16px; margin: 0 0 12px;">${htmlEscape(row.preview)}</p>
      <p style="font-size: 16px; margin: 0 0 20px; font-weight: 700;">${htmlEscape(detail)}</p>
      <p style="margin: 0 0 22px;">
        <a href="${htmlEscape(safeActionUrl)}" style="display: inline-block; background: #0369a1; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Open SailAway</a>
      </p>
      <p style="font-size: 14px; color: #475569; margin: 0 0 12px;">SailAway email alerts are brief notices only. Please open SailAway to read, reply, or take action.</p>
      <p style="font-size: 14px; color: #475569; margin: 0;">- Tom Cobin<br />CGSC Rendezvous Coordinator</p>
    </div>
  `;

  const text = [
    greeting,
    '',
    row.preview,
    detail,
    '',
    `Open SailAway: ${safeActionUrl}`,
    '',
    'SailAway email alerts are brief notices only. Please open SailAway to read, reply, or take action.',
    '',
    '- Tom Cobin',
    'CGSC Rendezvous Coordinator',
  ].join('\n');

  return { html, text, actionUrl: safeActionUrl };
};

const supabaseFetch = async (path: string, init: RequestInit = {}) => {
  const supabaseUrl = env('SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const loadPendingAlerts = async (limit: number): Promise<QueueRow[]> => {
  const query = new URLSearchParams({
    select: 'id,alert_type,recipient_user_id,recipient_email,recipient_name,actor_user_id,source_table,source_id,related_table,related_id,subject,preview,action_url,payload,attempts',
    status: 'eq.pending',
    available_at: `lte.${new Date().toISOString()}`,
    order: 'created_at.asc',
    limit: String(limit),
  });
  return await supabaseFetch(`email_alert_queue?${query.toString()}`) as QueueRow[];
};

const callRpc = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
  return await supabaseFetch(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }) as T;
};

const claimAlert = async (id: string): Promise<QueueRow | null> => {
  const rows = await callRpc<QueueRow[]>('claim_email_alert_queue_row', { p_alert_id: id });
  return rows[0] || null;
};

const markSent = async (id: string) => {
  await callRpc('mark_email_alert_sent', { p_alert_id: id });
};

const markFailed = async (id: string, error: string) => {
  await callRpc('mark_email_alert_failed', {
    p_alert_id: id,
    p_error: error,
    p_retry_after_seconds: 900,
  });
};

const sendViaSender = async (row: QueueRow) => {
  const token = env('SENDER_API_TOKEN');
  if (!token) throw new Error('Missing SENDER_API_TOKEN.');

  const fromEmail = env('EMAIL_ALERT_FROM_EMAIL', 'cgscclubcontact@cgsc.org');
  const fromName = env('EMAIL_ALERT_FROM_NAME', 'CGSC Rendezvous');
  const { html, text } = renderEmail(row);

  const response = await fetch(SENDER_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: [{ email: row.recipient_email, name: row.recipient_name || '' }],
      subject: row.subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sender API ${response.status}: ${body}`);
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders });
  }

  try {
    const enabled = env('EMAIL_ALERTS_ENABLED') === 'true';
    const testRecipients = env('EMAIL_ALERT_TEST_RECIPIENTS')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const allowBroadcast = env('EMAIL_ALERT_ALLOW_BROADCAST') === 'true';
    const maxBatch = Math.min(getIntEnv('EMAIL_ALERT_MAX_BATCH', 5), 25);

    if (enabled && testRecipients.length === 0 && !allowBroadcast) {
      return new Response(JSON.stringify({
        error: 'Refusing to send without EMAIL_ALERT_TEST_RECIPIENTS or EMAIL_ALERT_ALLOW_BROADCAST=true.',
      }, null, 2), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const rows = await loadPendingAlerts(maxBatch);
    const results: SendResult[] = [];

    for (const row of rows) {
      const recipient = row.recipient_email.toLowerCase();
      const isAllowedTestRecipient = allowBroadcast || testRecipients.includes(recipient) || !enabled;

      if (!isAllowedTestRecipient) {
        results.push({
          id: row.id,
          recipient: row.recipient_email,
          status: 'skipped',
          alertType: row.alert_type,
          subject: row.subject,
          error: 'Recipient is not in EMAIL_ALERT_TEST_RECIPIENTS.',
        });
        continue;
      }

      if (!enabled) {
        results.push({
          id: row.id,
          recipient: row.recipient_email,
          status: 'dry_run',
          alertType: row.alert_type,
          subject: row.subject,
        });
        continue;
      }

      try {
        const claimed = await claimAlert(row.id);
        if (!claimed) {
          results.push({
            id: row.id,
            recipient: row.recipient_email,
            status: 'skipped',
            alertType: row.alert_type,
            subject: row.subject,
            error: 'Queue row was already claimed or is no longer pending.',
          });
          continue;
        }
        await sendViaSender(claimed);
        await markSent(claimed.id);
        results.push({ id: claimed.id, recipient: claimed.recipient_email, status: 'sent', alertType: claimed.alert_type, subject: claimed.subject });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markFailed(row.id, message);
        results.push({ id: row.id, recipient: row.recipient_email, status: 'failed', alertType: row.alert_type, subject: row.subject, error: message });
      }
    }

    return new Response(JSON.stringify({ enabled, allowBroadcast, maxBatch, processed: results.length, results }, null, 2), {
      headers: jsonHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }, null, 2), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
