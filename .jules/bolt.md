## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.

## 2026-05-22 - [Parallelize DB queries in analytics endpoints]
**Learning:** Found an endpoint (`/analytics/merchant`) making 7 sequential database queries. Sequential queries block the main thread and add unnecessary round-trip latency.
**Action:** Used `Promise.all()` to fetch independent data sources concurrently, reducing 7 sequential round trips to 2 (dependent on tenantRow).
## 2026-05-28 - [Replace 'as any' casts with available domain variables]
**Learning:** Resorting to 'as any' with complex external library configurations like i18next can mask runtime errors. Instead, examine the domain objects directly; they often already contain the required localized strings or strictly-typed formats.
**Action:** Prefer extracting strings directly from pre-translated domain objects (e.g., `section.label`) rather than dynamically concatenating translation keys with `as any` casts.
