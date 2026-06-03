💡 **What:**
Replaced sequential `tx.select().from(productsTable)` database queries inside the cart iteration loop (`checkoutItems.map`) with a batched O(1) bulk fetch using Drizzle ORM's `inArray`. Extracted unique `productIds` and `variantIds` beforehand, executed queries in parallel via `Promise.all()`, and indexed results in a `Map` to perform local validations seamlessly without blocking the Node.js event loop on the database.

🎯 **Why:**
Previously, validating `N` items in a shopping cart required up to `N` `SELECT` queries for the products, `N` queries for variants, and `N` checks for variant counts inside an active SQL transaction block. This led to serious N+1 performance degradation on larger checkouts.

📊 **Measured Improvement:**
Due to local testing isolation in this exact Docker environment blocking the creation of a full PostgreSQL DB container to run integration/benchmark endpoints directly, no direct millisecond benchmark is logged.

However, conceptually:
- **Baseline**: O(N) database queries per checkout transaction (`N * 3` max database round trips).
- **Improved**: O(1) bounded queries (`3` parallel DB round trips) regardless of the size of the shopping cart `N`.
- **Impact**: Extremely significant performance increase since it batches queries efficiently over the network and avoids exhausting concurrent database connections via the connection pool during heavy checkout loads.
