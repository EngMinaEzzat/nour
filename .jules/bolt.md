## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.
