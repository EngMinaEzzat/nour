# Sentinel Journal

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
