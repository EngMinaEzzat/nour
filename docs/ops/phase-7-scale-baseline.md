# Phase 7: Scale Baseline

## Setup and Seed
To measure the performance baseline before indexing and caching, we run the seed and smoke test scripts on a dedicated test database.

**IMPORTANT:** Destructive seed scripts must only be run with `NODE_ENV=test` or `NOUR_TEST_DATABASE_OK=true`. They will permanently wipe data if used against a real database.

```powershell
$env:NOUR_TEST_DATABASE_OK="true"
node scripts/phase7-seed-scale-data.mjs
```

Dataset details:
- **1 Tenant**
- **50 Categories**
- **1,000 Products**
- **2,000 Orders**

## Measurement Methodology
We use the `phase7-load-smoke.mjs` script to hit common hot paths and record their response times.

```powershell
node scripts/phase7-load-smoke.mjs <store-slug>
```

## Baseline Results

| Endpoint | Scenario | Avg Duration (ms) | Notes |
|----------|----------|-------------------|-------|
| `/api/healthz` | System liveness | ~163ms | Fast, no DB check |
| `/api/store/:slug` | Public Storefront Home | ~2134ms | Unbounded category product count query causing severe N+1 latency |
| `/api/orders` | Admin Order Queue | ~5ms | (Auth rejection) Real loaded time TBD, unpaginated |
| `/api/exports` | CSV Generation | N/A | Blocks the main thread, synchronous |

## Identified Problems
1. **Storefront Category Counts**: `GET /api/store/:slug` performs per-category product count queries (N+1 issue).
2. **Order Queue**: `GET /api/orders` lacks pagination and does in-memory search across potentially thousands of orders.
3. **Exports**: `POST /exports` runs synchronously, tying up the event loop and memory for large datasets.
4. **Missing Cache**: Public storefront payloads are generated dynamically for every request without cache headers or intermediate storage.