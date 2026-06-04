🎯 **What:**
Fix the CI failures related to a duplicate column constraint `variant_id` on `order_items` and an invalid import in the smoke test.

1. The CI failed during the workspace database migration due to `variant_id` being added to `order_items` in `0002_variant_images_stock.sql` and then mistakenly added *again* in `0005_kind_colonel_america.sql`.
2. The CI failed running `smoke.mjs` with `Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:fetch` because Node doesn't expose `fetch` under the `node:fetch` specifier, but rather as a global object in Node 18+.
3. The CI failed running `smoke.mjs` because the API server defaulted to enforcing SSL (`requiresSsl` logic uses `NODE_ENV === "production"`) while the local postgres container `postgres:15` did not have SSL configured.

📊 **Coverage:**
What scenarios are now tested:
- Removing the conflicting column additions from `0005_kind_colonel_america.sql` and `0005_snapshot.json` schema.
- Explicitly appending `?sslmode=disable` to `DATABASE_URL` in CI so that the local PostgreSQL connection properly bypasses SSL enforcement.
- Workspace database migrations run smoothly without hitting the schema duplicate constraint error `column "variant_id" of relation "order_items" already exists`.
- The smoke test runs smoothly without throwing the `ERR_UNKNOWN_BUILTIN_MODULE` error.

✨ **Result:**
The database migration and post-build integration smoke tests succeed in fresh environments (like GitHub CI and any new contributor local setups).
