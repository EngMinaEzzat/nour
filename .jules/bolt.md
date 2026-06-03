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
