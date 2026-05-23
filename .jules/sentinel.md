## 2024-05-24 - Missing Rate Limits on Authentication Endpoints
**Vulnerability:** The password reset and forgot password endpoints lacked rate limiting, potentially allowing an attacker to brute force password reset tokens or cause a DoS condition by flooding the email system.
**Learning:** Even if a file imports and defines a rate limiter middleware, it must be explicitly applied to *all* sensitive routes within that file. The `authLimiter` was used for `/register` and `/login` but overlooked for password reset flows.
**Prevention:** When reviewing auth/account management routes, always verify that every state-mutating endpoint (especially those triggering emails, SMS, or verifying tokens) is protected by a rate limit middleware.
