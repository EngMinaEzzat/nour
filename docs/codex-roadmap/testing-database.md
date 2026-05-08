# Testing Database Policy

## Current Development Mode

Nour is allowed to run destructive API tests against the configured `.env.test`
database while there are no real merchants, customers, orders, or payment
records in that database.

Use:

```env
NOUR_TEST_DATABASE_OK=true
```

in `.env.test` to explicitly acknowledge this. The test harness refuses to run
against production-looking database URLs unless this flag is present.

Recommended local setup:

```powershell
Copy-Item .env.test.example .env.test
# Edit DATABASE_URL in .env.test
$env:NODE_ENV='test'; pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/api-server exec vitest run src/test/ai-hardening.test.ts --fileParallelism=false
```

## Why This Exists

Many API tests create and delete tenants, merchants, products, carts, orders,
usage records, and provider configuration rows. The guard exists to prevent
accidentally running those tests against a production database.

## Before Real Merchants Or Production Data

Before onboarding real merchants or storing real customer/order/payment data:

1. Create a dedicated test/staging database separate from production.
2. Point `.env.test` at that database only.
3. Prefer a database name or URL containing `_test`, `-test`, `test_`, or
   `localtest`.
4. Remove `NOUR_TEST_DATABASE_OK=true` unless the database is still disposable.
5. Never set `NOUR_TEST_DATABASE_OK=true` in Vercel Production, production
   CI, or any environment connected to real merchant data.
6. If the current shared database ever contained real data while tests were run,
   treat test-created rows as contamination and restore from backup or scrub the
   database before launch.

## Safe Commands

Run migrations against the test database:

```powershell
$env:NODE_ENV='test'; pnpm --filter @workspace/db run migrate
```

Run focused tests serially:

```powershell
pnpm --filter @workspace/api-server exec vitest run src/test/ai-hardening.test.ts --fileParallelism=false
```

Run the full API suite serially when checking broader regressions:

```powershell
pnpm --filter @workspace/api-server exec vitest run --fileParallelism=false
```
