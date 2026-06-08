import fs from 'node:fs';
import pg from 'pg';

const { Client } = pg;
const [, , action, emailArg, ...args] = process.argv;
const email = emailArg?.trim().toLowerCase();
const confirmIndex = args.indexOf('--confirm');
const confirmation = confirmIndex >= 0 ? args[confirmIndex + 1]?.trim().toLowerCase() : '';

function readAdminEnv() {
  const path = '.env.admin.local';
  if (!fs.existsSync(path)) {
    throw new Error(`Missing ${path}. Copy .env.admin.example to ${path} and add the database URL.`);
  }

  return Object.fromEntries(
    fs.readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function validateArguments() {
  if (!['status', 'delete'].includes(action) || !email) {
    throw new Error(
      'Usage:\n'
      + '  npm run admin:user-status -- user@example.com\n'
      + '  npm run admin:user-delete -- user@example.com --confirm user@example.com',
    );
  }

  if (action === 'delete' && confirmation !== email) {
    throw new Error('Deletion requires --confirm followed by the exact same email address.');
  }
}

async function findAccount(client) {
  const authUsers = await client.query(
    `select id, email, email_confirmed_at, created_at, deleted_at
     from auth.users
     where lower(email) = $1
     order by created_at`,
    [email],
  );
  const identities = await client.query(
    `select id, user_id, provider, created_at
     from auth.identities
     where lower(identity_data->>'email') = $1
     order by created_at`,
    [email],
  );
  const profiles = await client.query(
    `select id, email, full_name, role, created_at
     from public.users
     where lower(email) = $1
     order by created_at`,
    [email],
  );

  return {
    authUsers: authUsers.rows,
    identities: identities.rows,
    profiles: profiles.rows,
  };
}

async function deleteAccount(client, account) {
  if (account.authUsers.length !== 1) {
    throw new Error(`Expected exactly one Auth user for ${email}; found ${account.authUsers.length}. No deletion performed.`);
  }

  const userId = account.authUsers[0].id;
  await client.query('begin');
  try {
    const identities = await client.query('delete from auth.identities where user_id = $1', [userId]);
    const authUsers = await client.query('delete from auth.users where id = $1 and lower(email) = $2', [userId, email]);
    await client.query('commit');
    return { userId, deletedIdentities: identities.rowCount, deletedAuthUsers: authUsers.rowCount };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

validateArguments();
const env = readAdminEnv();
if (!env.SUPABASE_DATABASE_URL) {
  throw new Error('SUPABASE_DATABASE_URL is missing from .env.admin.local.');
}

const databaseUrl = new URL(env.SUPABASE_DATABASE_URL);
databaseUrl.searchParams.delete('sslmode');

const client = new Client({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const before = await findAccount(client);
  console.log(JSON.stringify({ email, before }, null, 2));

  if (action === 'delete') {
    const deleted = await deleteAccount(client, before);
    const after = await findAccount(client);
    console.log(JSON.stringify({ email, deleted, after }, null, 2));
  }
} finally {
  await client.end();
}
