## 2026-05-21 - [Parallelize DB queries in analytics endpoints]
**Learning:** Sequential database queries in dashboard/analytics endpoints can cause significant N+1 delays.
**Action:** Always group independent, read-only analytics queries using Promise.all to fetch them concurrently and reduce network round-trips.

## 2026-05-22 - [Parallelize DB queries in analytics endpoints]
**Learning:** Found an endpoint (`/analytics/merchant`) making 7 sequential database queries. Sequential queries block the main thread and add unnecessary round-trip latency.
**Action:** Used `Promise.all()` to fetch independent data sources concurrently, reducing 7 sequential round trips to 2 (dependent on tenantRow).
## 2026-05-23 - [Test execution requires explicit environment setup]
**Learning:** Some test suites in the `api-server` may fail if the NOUR_TEST_DATABASE_OK environment variable is missing, since the environment safeguards prevent tests from executing on production/development databases.
**Action:** Make sure to append NOUR_TEST_DATABASE_OK=true to the vitest execution command for safety and testing correctness.

## 2026-05-28 - Removed Unsafe Cast in Audit Routes
**Learning:** Found an `as any` cast that could lead to unexpected or unsafe values in database query generation if external query input happens to be malformed. Using explicit allowed enum values prevents unexpected SQL queries.
**Action:** Replaced the `as any` cast with an enum value validation check before adding condition to the query array, checking if the string is among valid eventType enums using `auditEventTypeEnum.enumValues`.

## 2026-05-28 - [Replace 'as any' casts with available domain variables]
**Learning:** Resorting to 'as any' with complex external library configurations like i18next can mask runtime errors. Instead, examine the domain objects directly; they often already contain the required localized strings or strictly-typed formats.
**Action:** Prefer extracting strings directly from pre-translated domain objects (e.g., `section.label`) rather than dynamically concatenating translation keys with `as any` casts.

## 2024-06-25 - Fix SSRF Vulnerability in Facebook Moderator
**Learning:** `new URL(base + "/" + path)` can be manipulated by an attacker who controls `path` to navigate up directories (`../../`) or even switch origins (e.g. `//evil.com` or `http://evil.com`), leading to SSRF if the URL is then passed to `fetch`.
**Action:** Always parse the generated URL and assert that `url.origin` matches the expected base origin and `url.pathname` strictly begins with the expected API base path prefix.

## 2026-05-29 - [Batch insert for products samples to fix N+1 issue]
**Learning:** Seeding multiple items in a loop using `await db.insert(...)` causes N+1 query execution, which significantly increases network round trip time and API latency.
**Action:** Replace `for` loops containing multiple DB inserts with a single batched `await db.insert(...).values([...])` operation using an array of elements.

## 2026-06-03 - [Fix N+1 query problem with batching and in-memory map]
**Learning:** Using `Promise.all` in a map to execute queries per item can lead to N+1 database queries, significantly slowing down list endpoints. Drizzle ORM's `inArray` can fail if passed an empty array.
**Action:** Replace `Promise.all` loops with a single batch query using `inArray` and `groupBy`. Always check if the array is non-empty (`categories.length > 0`) before constructing the `inArray` condition to prevent SQL syntax errors. Use a JavaScript `Map` to efficiently attach the queried counts back to the items in $O(1)$ time.

## 2026-06-03 - [Fix N+1 query in checkout API]
**Learning:** Checking out items fetching variants one-by-one via `.map(async () => tx.select())` creates an N+1 problem inside a transaction.
**Action:** Use `inArray` to fetch all products and variants upfront, map them by ID into Maps, and access them locally (O(1)) inside the checkout validation map loop.

## 2026-06-04 - [Parallelize DB queries in platform admin routes]
**Learning:** Missed opportunities to parallelize independent database queries within `.map()` iterations (e.g., in `/platform/provider-health` mapping over `providers`).
**Action:** When optimizing endpoints that fetch data inside an array mapping, search carefully for independent sub-queries and group them using nested `Promise.all` instead of executing them sequentially per iteration.

## 2024-05-28 - Parallelize stock restoral on order cancellation
**Learning:** Sequential DB updates in a loop (N+1 queries) inside a transaction can block the event loop and add significant RTT latency. Using `Promise.all` with a map pushes these updates concurrently to the DB connection pool.
**Action:** Always prefer array mapping to `Promise.all` over `for...of` loops when executing independent database updates or inserts within a Drizzle transaction to improve performance without breaking consistency.

## 2024-05-28 - N+1 Webhook DB Update Fix
**Learning:** Sequential database updates inside loops (e.g. `await tx.update()` in `for...of` loops for restocking items) create unnecessary Node.js-to-PostgreSQL round trips, slowing down webhook execution linearly with the order item count.
**Action:** Use `.flatMap` to gather an array of Promise updates for Drizzle ORM queries, and then execute them using a single `Promise.all()`, ensuring concurrent execution over the same PG pool connection/transaction without blocking.

## 2026-06-05 - [Fix N+1 query loops using conditional aggregations]
**Learning:** Using `Promise.all` mapping over entities to fetch aggregates triggers sequential N+1 query waterfalls. Separate sequential queries to compute statistics (e.g., `getCodScore`) further exacerbate this problem.
**Action:** Replace `Promise.all` loop mapping with a single batched Drizzle query using `inArray` and `groupBy`. Map the results in-memory using a JavaScript `Map` for O(1) lookups. Additionally, replace multiple separate counting queries with a single query utilizing `sql<number>\`count(*) filter (...)\`` to calculate all conditions in one pass.

## 2025-05-15 - [N+1 query in category listing]
**Learning:** Found an N+1 query pattern where `GET /categories` was fetching product counts in a loop after retrieving the category list. This results in 1 + N database roundtrips.
**Action:** Use `LEFT JOIN` with `GROUP BY` and `count(table.id)` to fetch related aggregate data in a single query. Always use `getTableColumns(table)` when selecting from the primary table to ensure all schema fields are returned and prevent API regressions.

## 2024-06-07 - Database connection failures in tests
**Learning:** API server tests requiring a database throw `DATABASE_URL must be set` if `NOUR_TEST_DATABASE_OK` is set but `DATABASE_URL` is omitted, and the root `package.json` does not have a single `test` script.
**Action:** When running the full test suite from the root, provide the DB variables and use the recursive filter command: `NOUR_TEST_DATABASE_OK=true DATABASE_URL="postgres://postgres:postgres@localhost:5432/nour_test" REDIS_URL="redis://localhost:6379" pnpm -r --filter "./artifacts/**" --if-present run test`. If the test DB is uninitialized, provision it via standard PostgreSQL tools and use Drizzle's `push-force` to rapidly generate the test schema.

## 2024-06-07 - Avoid manual edits of pnpm-lock.yaml
**Learning:** Hand-editing lockfiles to add dependencies creates non-existent and hallucinated dependency version states that fail builds workspace-wide.
**Action:** Always use the package manager CLI (e.g., `pnpm add -D vitest --filter @workspace/db`) to add dependencies so it correctly populates both `package.json` and `pnpm-lock.yaml` simultaneously.

## 2026-06-07 - [Testing improvement for catch blocks]
**Learning:** Testing error handling (catch blocks) for code executed synchronously inside Express endpoints requires mocking internal dependencies using Vitest's `vi.spyOn`.
**Action:** Use `vi.spyOn(module, "method").mockRejectedValueOnce(error)` to intentionally trigger errors in internal services and verify proper status logging, error responses, and database updates for job management inside catch blocks.

## 2026-06-07 - Follow Up Queue N+1 Optimization
**Learning:** Found an N+1 query issue in the `/api/follow-up/queue` endpoint where the system was querying `contactAttemptsTable` individually for each order in a loop.
**Action:** Replaced the loop-based querying with a single pre-fetching step using `inArray` to fetch all contact attempts for relevant orders at once, and constructed a JavaScript `Map` to assign them to their respective orders in O(1) time. This reduced processing time for 100 orders from ~82ms to ~12ms.
## 2024-06-10 - Bolt Optimization: Fixing N+1 Queries with Drizzle Batching in Platform Endpoint
**Learning:** Found an N+1 query issue in `/platform/provider-health` where two database aggregations (`count(...) filter`) and subqueries were executed in a `Promise.all` `.map` loop for every provider item, generating hundreds of concurrent requests for high tenant loads.
**Action:** Replaced the mapped querying with two single batched Drizzle `inArray` and `groupBy` lookups along with `sql\`row_number()\`` window functions to gather all results in exactly two database queries, then mapped the Javascript array memory via Map data structure. Will apply this structural approach over mapped loop query requests whenever `select ... inArray` can extract keys.

## 2026-06-08 - [Parallelize Frontend API Mutations in Checkout]
**Learning:** Found sequential execution of asynchronous `createOrder.mutateAsync` calls within a `for...of` loop in the frontend checkout logic. This forces the browser to wait for each API request to complete before starting the next one, creating unnecessary round-trip latency.
**Action:** Always replace sequential asynchronous operations within iteration loops on the frontend with `Promise.all` over mapped promises when the operations are independent, ensuring mutations are executed concurrently to minimize total execution time.

## 2024-05-19 - Concurrent API Mutations in React Components
**Learning:** Sequential `await` calls in a `for...of` loop during form submission (e.g., creating multiple variants) can lead to significant network latency accumulation, especially when order does not matter.
**Action:** Replace independent sequential mutations with `await Promise.all(items.map(item => mutation(item)))` to run network requests concurrently, improving submission speed by ~5x.

## 2024-05-18 - Improve SSRF redirect DNS resolution latency
**Learning:** Checking for SSRF manually in a redirect loop can cause redundant synchronous DNS resolution lookups that multiply request latency.
**Action:** When repeatedly resolving hostnames in a manual redirect loop (e.g. up to 5 times), cache the resolved hostnames using a `Set<string>` to ensure each hostname is resolved against the OS/DNS layer exactly once per request.

## 2026-06-08 - Optimize In-Memory Cache Invalidation
**Learning:** In Node.js, iterating over a large `Map` using `.keys()` (an O(N) operation) blocks the event loop and scales poorly. Similarly, using regular expressions to parse keys in hot paths adds significant CPU overhead compared to native string methods.
**Action:** When implementing cache invalidation by prefix or tag, maintain secondary indexes (e.g., a `Map` of tags/tenant IDs to a `Set` of associated keys) to enable O(1) lookups and O(K) iteration (where K is the subset size). Also, prefer `startsWith` and `indexOf` over `RegExp` for simple string prefix matching in hot paths.

## 2024-06-08 - [Add vitest dependencies to library packages]
**Learning:** Some library packages may lack `vitest` dependencies or proper `test` script definitions in their `package.json`, preventing tests from running correctly.
**Action:** When adding tests to a new library, explicitly install `vitest` as a dev dependency via `pnpm add -D vitest --filter <package-name>` and add the `"test": "vitest run"` script. Ensure to configure `vitest.config.ts` if specific environments (like "node") are needed.

## 2024-06-11 - Promise.all loop conversion performance benefit
**Learning:** Sequential `await` calls inside `for...of` loops, specifically when doing external network operations like sending emails (via Resend or similar providers), causes severe performance bottlenecks that scale linearly (O(n)). Converting a loop of 50 mocked tasks showed a ~50x speedup (2500ms -> 50ms) when parallelized.
**Action:** When working on batch processing tasks (like schedulers, notifications, exports), always prefer `Promise.all` combined with `.map()` over `for...of` loops, as long as the underlying API/service handles concurrency. Always ensure individual `.catch()` handlers are attached within the mapped promises so that a single failure does not reject the entire batch.
