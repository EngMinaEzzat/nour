## 2024-05-28 - N+1 Webhook DB Update Fix
**Learning:** Sequential database updates inside loops (e.g. `await tx.update()` in `for...of` loops for restocking items) create unnecessary Node.js-to-PostgreSQL round trips, slowing down webhook execution linearly with the order item count.
**Action:** Use `.flatMap` to gather an array of Promise updates for Drizzle ORM queries, and then execute them using a single `Promise.all()`, ensuring concurrent execution over the same PG pool connection/transaction without blocking.
