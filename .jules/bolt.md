## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.

## 2026-05-22 - [Parallelize DB queries in analytics endpoints]
**Learning:** Found an endpoint (`/analytics/merchant`) making 7 sequential database queries. Sequential queries block the main thread and add unnecessary round-trip latency.
**Action:** Used `Promise.all()` to fetch independent data sources concurrently, reducing 7 sequential round trips to 2 (dependent on tenantRow).
## 2024-05-28 - Parallelize stock restoral on order cancellation
**Learning:** Sequential DB updates in a loop (N+1 queries) inside a transaction can block the event loop and add significant RTT latency. Using `Promise.all` with a map pushes these updates concurrently to the DB connection pool.
**Action:** Always prefer array mapping to `Promise.all` over `for...of` loops when executing independent database updates or inserts within a Drizzle transaction to improve performance without breaking consistency.
