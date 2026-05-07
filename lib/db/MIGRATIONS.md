# Drizzle Migration Workflow

Use these commands from the repo root.

```powershell
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/db run check
```

`generate` creates SQL under `lib/db/drizzle/`. `migrate` applies pending migrations to the PostgreSQL database in `DATABASE_URL`.

## Existing Databases

`0000_busy_mentallo.sql` is the first baseline migration for fresh databases. Existing databases that were created with `drizzle-kit push` need a one-time baseline plan before running `migrate`; do not apply the baseline blindly to a populated database with the same tables.

For the Phase 2 order tracking columns on an existing database, use this forward SQL during the baseline window:

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token text;

UPDATE orders
SET public_code = 'NO-' || upper(substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 10))
WHERE public_code IS NULL;

UPDATE orders
SET tracking_token = md5(random()::text || clock_timestamp()::text || id::text) ||
  md5(id::text || clock_timestamp()::text || random()::text)
WHERE tracking_token IS NULL;

ALTER TABLE orders ALTER COLUMN public_code SET NOT NULL;
ALTER TABLE orders ALTER COLUMN tracking_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_public_code ON orders(public_code);
```

Rollback for the Phase 2 order tracking columns:

```sql
DROP INDEX IF EXISTS idx_orders_public_code;
ALTER TABLE orders DROP COLUMN IF EXISTS tracking_token;
ALTER TABLE orders DROP COLUMN IF EXISTS public_code;
```
