## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.

## 2026-05-22 - [Parallelize DB queries in analytics endpoints]
**Learning:** Found an endpoint (`/analytics/merchant`) making 7 sequential database queries. Sequential queries block the main thread and add unnecessary round-trip latency.
**Action:** Used `Promise.all()` to fetch independent data sources concurrently, reducing 7 sequential round trips to 2 (dependent on tenantRow).

## 2026-05-28 - [Drizzle migration failure due to duplicated column addition]
**Learning:** Duplicate migrations modifying the same column without \`IF NOT EXISTS\` across different files causes \`drizzle-kit migrate\` to fail. In this case, \`store_config\` was added in both 0004 and 0005 migrations.
**Action:** When manually fixing migrations or merging branches, always check if a column was already added in an earlier migration file and remove the redundant addition to avoid \`error: column "store_config" of relation "tenants" already exists\`.
