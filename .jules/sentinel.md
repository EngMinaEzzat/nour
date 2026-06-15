# Sentinel Journal

## 2026-06-04 - [Fix Path Traversal in Image Resizing Endpoint]
**Vulnerability:** The `/api/images/resize` endpoint used `path.join(uploadsDir, filename)` which allowed path traversal (e.g., `../../../etc/passwd`) to escape the uploads directory.
**Learning:** `path.join` does not resolve absolute boundaries, allowing `..` segments to traverse up the filesystem. Additionally, when testing Express routing with Vitest and Supertest, missing or mismatched route prefixes (like `router.get('/api/images/resize')` mounted via `app.use('/api', router)`) cause requests to fall through to a catch-all Dev Vite proxy, unexpectedly throwing 502 Bad Gateway instead of 404 Not Found.
**Prevention:** Always use `path.resolve()` on both the base directory and the user-provided path. Verify the safety by ensuring the resolved user path strictly starts with the resolved base directory + `path.sep` to prevent partial prefix attacks.

## 2026-05-20 - Prevented SQL Injection Pattern in Customers Route
**Vulnerability:** Unsafe `sql.raw` usage with string concatenation in Drizzle queries.
**Learning:** Even when inputs are hardcoded constants, using `sql.raw` with manual concatenation is a security red flag and can lead to vulnerabilities if the constants are ever moved or influenced by external input.
**Prevention:** Always use Drizzle's built-in helper functions like `inArray` or properly parameterized `sql` template literals instead of `sql.raw` with concatenation.

## 2026-05-20 - Implemented Timing-Safe HMAC Comparison for Paymob Webhooks
**Vulnerability:** Timing attack vulnerability in HMAC signature verification.
**Learning:** Using standard equality operators (`!==` or `===`) to compare cryptographic signatures allows attackers to potentially deduce the correct signature (and thus the secret) by measuring the time it takes for the comparison to fail.
**Prevention:** Use `crypto.timingSafeEqual` with `Buffer` objects for all cryptographic comparisons. Ensure both buffers have the same length before calling `timingSafeEqual`.

## 2026-05-21 - Prevented Account Takeover via API Token Leakage
**Vulnerability:** Leaking password reset tokens in API responses during email delivery failure.
**Learning:** Returning sensitive tokens in an API fallback response when an external service fails (like email delivery) completely bypasses the intended authentication factor (possession of the email account). Attackers can intentionally trigger or exploit broken email configurations to intercept reset links for any user.
**Prevention:** Always fail securely. If an out-of-band delivery mechanism (like email or SMS) fails, do not expose the sensitive token in the immediate API response or UI. Present a generic success or generic failure message.

## 2026-05-22 - Prevented CSV Injection in Data Exports
**Vulnerability:** CSV/Formula Injection vulnerability in the toCsv function.
**Learning:** Malicious inputs that start with formula prefix characters (=, +, -, @) can be interpreted as formulas in spreadsheet applications (like Excel) when a user exports data. This could lead to arbitrary command execution on the admin's machine.
**Prevention:** When exporting data to CSV, always escape cells that begin with =, +, -, or @ by prepending a single quote (') or tab character to them so they are treated as literal text.

## 2026-05-23 - Missing Rate Limits on Authentication Endpoints
**Vulnerability:** The password reset and forgot password endpoints lacked rate limiting, potentially allowing an attacker to brute force password reset tokens or cause a DoS condition by flooding the email system.
**Learning:** Even if a file imports and defines a rate limiter middleware, it must be explicitly applied to *all* sensitive routes within that file. The `authLimiter` was used for `/register` and `/login` but overlooked for password reset flows.
**Prevention:** When reviewing auth/account management routes, always verify that every state-mutating endpoint (especially those triggering emails, SMS, or verifying tokens) is protected by a rate limit middleware.

## 2024-05-24 - Enforcing Tenant Boundaries and Preventing Mass Assignment
**Learning:** We discovered high-severity Broken Access Control (IDOR) vulnerabilities where analytics endpoints extracted `tenantId` from client-provided query parameters instead of securely populated session data. Additionally, `PUT` endpoints were blindly spreading request payloads into database update queries, creating mass assignment risks allowing merchants to arbitrarily upgrade their own billing status. Public endpoints were also indiscriminately fetching catalog data without checking if the parent tenant was actively suspended.
**Action:**
1. Never trust `req.query.tenantId` for accessing scoped data in merchant-facing endpoints. Always use `req.merchantTenantId` injected by `requireRole` middleware.
2. Explicitly sanitize and strip administrative or billing fields (`planCode`, `status`, `subscriptionStatus`) from incoming payload objects before executing `db.update().set(...)`.
3. When querying public multi-tenant entities (e.g. products), join the `tenantsTable` and strictly enforce `.where(eq(tenantsTable.status, "active"))` unless the request originates from the owner.

## 2026-05-10 - PII Harvesting Vulnerability in Guest Checkout
**Vulnerability:** The `POST /api/customers` endpoint, used for guest checkout, leaked full customer PII (phone number, city) if an email already existed in the system. This allowed unauthenticated actors to harvest data by iterating over a list of emails.
**Learning:** Returning full database records (`...c`) in public endpoints is dangerous. Even if the data was just provided by the user, a lookup path for *existing* data must be strictly limited to the absolute minimum required for the next step of the flow.
**Prevention:** Always use explicit allow-lists for API responses, especially on unauthenticated routes. In this codebase, the pattern of `serializeTenant` with an `includePrivate` flag has been established as a reusable security pattern for multi-tenant data isolation.

## 2025-06-05 - Missing Cache Eviction in Lockout Maps
**Vulnerability:** In-memory maps for security features (like login lockout attempts) that don't evict expired entries.
**Learning:** If a `Map` tracking failures only grows and never cleans up entries unless a legitimate login occurs, attackers can cause an Out-of-Memory (OOM) Denial of Service (DoS) by spamming the endpoint with random emails.
**Prevention:** Always pair unbounded in-memory caches or tracking maps with a `setInterval(..., interval).unref()` eviction loop to prune stale data.

## 2025-02-27 - Missing Rate Limiting on Public Customer API
**Vulnerability:** The public POST `/api/customers` endpoint lacked rate limiting. It could be hit continuously by unauthenticated requests.
**Learning:** This endpoint creates or retrieves a customer record before submitting an order. Without limits, an attacker could create dummy customers rapidly, causing denial of service or filling up the database.
**Prevention:** Apply `checkoutLimiter` to endpoints used in the public checkout flow, not just the actual `/orders` endpoint, to ensure the entire flow is protected against automated abuse.

## $(date +%Y-%m-%d) - Incomplete SSRF IP blocklist & IPv4-mapped IPv6 evaluation
**Vulnerability:** The `isPrivateIp` validation function for SSRF protection failed to adequately check the IPv4 payload within IPv4-mapped IPv6 addresses (e.g., `::ffff:`) relying on string prefixes, and lacked blocking rules for several reserved/internal subnets (Carrier-Grade NAT, Multicast, Benchmark).
**Learning:** IPv4-mapped IPv6 strings must be parsed back to IPv4 before validation to ensure consistent logic. Attempting to match subnets using string prefixes against `.startsWith` creates false positives or false negatives. Additionally, Node `dns.lookup` alone is vulnerable to TOCTOU DNS rebinding issues when paired with `fetch`.
**Prevention:** Always extract and delegate IPv4 payloads in IPv6-mapped addresses recursively to the primary parser. Include complete IANA special-purpose address registry subsets when defining custom `isPrivateIp` blocks. Ensure robust network architecture (or customized undici dispatchers) to mitigate DNS rebinding fully.
<<<<<<< HEAD
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
## 2025-05-15 - [Accessible Icon-Only Buttons and Localized Feedback]
**Learning:** In an RTL (Right-to-Left) and localized (Arabic) storefront, icon-only buttons (like Wishlist hearts or Star ratings) are frequently used for visual cleanliness, but they are completely invisible to screen readers without explicit `aria-label` attributes. Furthermore, silent state changes (like adding to a bag) need prominent, localized feedback (Success Toasts) to confirm the action, especially when the cart drawer is not automatically opened.
**Action:** Always provide `aria-label` for icon-only buttons and use success toasts for critical async actions like "Add to Bag" to ensure accessibility and clear user feedback.
## 2024-06-06 - Add ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only buttons (like scroll arrows, clear filter tags, and scroll-to-top buttons) that lacked accessible names (`aria-label`), making them invisible or confusing to screen reader users. The application also relies on `react-i18next` for translations.
**Action:** When adding or modifying icon-only buttons, always include an `aria-label` attribute. If the application uses `react-i18next` (`useTranslation`), use the `t()` function to provide a translated, accessible label.

## 2024-06-07 - Add missing ARIA labels to AiAssistant icon buttons
**Learning:** Found an accessibility issue pattern in custom UI components where `Button`s configured as icons (`size="icon"`) sometimes lack descriptive `aria-label`s. In the `AiAssistant` component, interactive elements like 'Open', 'Clear History', 'Close', and 'Send' relied purely on visual icons or surrounding context, which is insufficient for screen readers.
**Action:** Always ensure that `Button` components using `size="icon"` include a translated `aria-label` prop utilizing `t()`, mapping to an appropriate key in the internationalization files. If the exact term isn't there, fallback to a well-known `common.buttons.*` key or standard tooltip keys.

## 2024-06-08 - Password Visibility Toggles ARIA Labels
**Learning:** Found multiple instances where the "Toggle Password Visibility" buttons in authentication flows lacked accessibility labels, rendering them difficult to use for screen readers. Added a translated `aria-label` utilizing `react-i18next`.
**Action:** Always ensure that icon-only interactive elements in reusable or standalone components include translated `aria-label` attributes.
## 2024-06-11 - React suspiciouslySetInnerHTML vulnerability
**Vulnerability:** React components were using `dangerouslySetInnerHTML` with template literals that incorporated unsanitized user input in style tags, allowing structural CSS injection and XSS.
**Learning:** `dangerouslySetInnerHTML` is not automatically sanitized by React and can be exploited.
**Prevention:** Avoid `dangerouslySetInnerHTML` whenever possible and instead use React's built-in `{}` interpolation which automatically escapes strings. When injecting colors, sanitize the string by removing structural CSS characters (`;`, `}`, `</style>`) to prevent injection.

## 2024-06-25 - Fix Timing Attack in Webhook Secret Validation
**Vulnerability:** A timing attack vulnerability was identified in `artifacts/api-server/src/services/WhatsappService.ts` where a sensitive webhook secret was being compared using a standard string inequality operator (`!==`).
**Learning:** Standard string comparisons evaluate character by character and return as soon as a mismatch is found, allowing attackers to measure response times and progressively guess the secret.
**Prevention:** Always convert sensitive strings to `Buffer`s and compare them using `crypto.timingSafeEqual`, ensuring you check that the buffer lengths match first to prevent runtime errors from `timingSafeEqual`.
