## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.

## 2026-05-22 - [Parallelize DB queries in analytics endpoints]
**Learning:** Found an endpoint (`/analytics/merchant`) making 7 sequential database queries. Sequential queries block the main thread and add unnecessary round-trip latency.
**Action:** Used `Promise.all()` to fetch independent data sources concurrently, reducing 7 sequential round trips to 2 (dependent on tenantRow).
