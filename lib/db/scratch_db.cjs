const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.edlyexhaquyjxjlblzgz:Mina-nour2026@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
client.connect()
  .then(() => client.query('ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" text;'))
  .then(() => { console.log('success'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
