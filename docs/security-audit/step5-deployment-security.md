# Step 5: Deployment & Configuration Security

## Overview
This document covers the deep-dive security review of the infrastructural and configuration layer of the API server (`app.ts`, `csrf.ts`, headers, logging, and package configurations).

## Audit Findings & Action Plan

### 1. Environment Secrets & Fail-Fast Mechanisms (Secure)
- **Target**: `app.ts` (Startup block)
- **Findings**:
  - **Strengths**: The application implements strict fail-fast validation at startup. It mandates `SESSION_SECRET` globally and ensures `DATABASE_URL` and `RESEND_API_KEY` are present in production. 
  - **Critical Protection**: It explicitly crashes if `PAYMOB_ALLOW_MOCKS === "true"` is detected in production. This perfectly mitigates the risk of developers accidentally leaving mock payments enabled on live stores.
  - **Status**: Excellent. No changes needed.

### 2. CSRF Exemption Missing for WhatsApp Webhooks (High Severity)
- **Target**: `artifacts/api-server/src/lib/csrf.ts`
- **Findings**:
  - **Strengths**: The application correctly employs the `doubleCsrf` pattern. In production, it utilizes the highly secure `__Host-` prefix for the CSRF cookie and correctly binds the token to the `req.session.id`.
  - **Weakness (Bug)**: The `CSRF_EXEMPT_PATHS` array explicitly whitelists `/api/paymob/webhook` and related Paymob endpoints so they aren't blocked (since webhooks don't send CSRF tokens). However, the WhatsApp callback endpoint (`/whatsapp/messages/:id/callback`) is completely **missing** from this list!
  - **Impact**: Any incoming webhook from Meta/WhatsApp will immediately be rejected by the CSRF middleware with a `403 Forbidden` error, long before it even reaches the route handler.
  - **Remediation**: Add `/api/whatsapp/messages` (or a regex matcher) to `CSRF_EXEMPT_PATHS` to allow provider callbacks.

### 3. Session & CORS Configurations (Secure)
- **Target**: `app.ts`
- **Findings**:
  - **CORS**: `cors({ origin: allowedOrigins })` strictly validates origins against the `ALLOWED_ORIGINS` environment variable in production, preventing malicious sites from making cross-origin requests with credentials.
  - **Sessions**: The session cookie correctly employs `secure: true` and `httpOnly: true`. Because `sameSite: "none"` is used (which is necessary for cross-domain API setups), the robust CSRF implementation mentioned above is strictly required.

### 4. Logging & Header Defenses (Low Risk / Safe)
- **Target**: `app.ts`
- **Findings**:
  - **Logging**: `pino-http` strips query parameters before logging (`req.url?.split("?")[0]`). This is a highly secure practice that ensures tokens, PII, or sensitive IDs passed in query strings are never inadvertently leaked into the server logs.
  - **Helmet**: Helmet disables `crossOriginEmbedderPolicy` (to permit the Paymob checkout iframe) and `contentSecurityPolicy` (relying on the frontend to manage CSP). This is acceptable since the API strictly returns JSON.
