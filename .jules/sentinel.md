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
