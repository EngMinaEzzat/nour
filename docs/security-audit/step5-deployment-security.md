# Security Audit - Step 5: Deployment & Configuration Security

## Context for the LLM
You are working on a multi-tenant SaaS e-commerce platform built with Node.js, Express, and Drizzle ORM.
This step focuses on infrastructural security, specifically Cross-Site Request Forgery (CSRF) protections, Cross-Origin Resource Sharing (CORS), and application initialization secrets.

## Tasks & Implementation Instructions

### Task 1: Fix CSRF Blocking WhatsApp Webhooks (High Severity)
- **Target File**: `artifacts/api-server/src/lib/csrf.ts`
- **Current State**: The application uses `doubleCsrf` protection, which is globally applied to all state-mutating requests in production. Webhooks (which do not carry CSRF cookies) must be explicitly whitelisted in `CSRF_EXEMPT_PATHS`. Paymob is currently whitelisted, but WhatsApp is completely missing.
- **Action**: Add `/api/whatsapp/messages/` (or the exact path `/api/whatsapp/messages/:id/callback` pattern) to the `CSRF_EXEMPT_PATHS` array or ensure the `isCsrfExempt` function correctly identifies and allows incoming WhatsApp webhooks.

### Task 2: Verify CORS & Secure Cookies
- **Target File**: `artifacts/api-server/src/app.ts`
- **Current State**: The app configures CORS and session cookies.
- **Action**: Verify that:
  1. `cors({ origin: allowedOrigins })` is strictly applied when `NODE_ENV === "production"`.
  2. The session cookie is configured with `secure: true` and `sameSite: "none"` (if cross-domain) or `"lax"`. (Note: If `sameSite: "none"` is used, the CSRF protection audited in Task 1 is absolutely vital).

### Task 3: Verify Secrets Fail-Fast
- **Target File**: `artifacts/api-server/src/app.ts`
- **Action**: Ensure the startup code explicitly throws an error and crashes the server if `SESSION_SECRET`, `DATABASE_URL`, or `RESEND_API_KEY` are missing in production. Ensure `PAYMOB_ALLOW_MOCKS` is strictly prohibited in production. (Initial audits show this is already implemented, so just verify).

## Exit Criteria
1. The `CSRF_EXEMPT_PATHS` array in `lib/csrf.ts` explicitly includes the WhatsApp webhook callback route.
2. The application crashes immediately upon startup if critical production secrets are missing.
3. CSRF and CORS configurations are confirmed to be strictly enforced in production environments.
