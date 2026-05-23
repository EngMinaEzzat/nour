# Step 3: Payment & Webhook Security

## Overview
This document covers the security and functional correctness of third-party system integrations, specifically Paymob for payment processing and WhatsApp/Meta for notifications.

## Critical Vulnerabilities Identified

### 1. Paymob Multi-Tenant Architectural Flaw (High Severity)
- **Target**: `artifacts/api-server/src/routes/paymob.ts` & `artifacts/api-server/src/lib/paymob.ts`
- **Issue**: 
  - The route `PUT /paymob/configure` correctly allows merchants to set up their own Paymob credentials (API Key, Integration ID, Iframe ID, and HMAC Secret), storing them securely in `paymobProvidersTable`.
  - However, `initPayment` in `lib/paymob.ts` is hardcoded to use global variables: `process.env.PAYMOB_API_KEY`, `process.env.PAYMOB_INTEGRATION_ID`, and `process.env.PAYMOB_IFRAME_ID`.
  - Furthermore, `POST /paymob/webhook` uses the global `process.env.PAYMOB_HMAC_SECRET` to verify incoming webhooks.
- **Exploit Vector / Business Impact**: 
  - If a merchant configures their own Paymob account, their transactions will still route through the platform's global Paymob account (if configured). 
  - If Paymob sends a webhook signed with the merchant's HMAC secret, the server will try to verify it using the global `PAYMOB_HMAC_SECRET`. The signature will mismatch, and the webhook will be rejected with a `401 Unauthorized`, leaving the order indefinitely stuck in a `pending` state.
- **Remediation**:
  1. Refactor `initPayment` to accept the merchant's API Key and Integration IDs dynamically from the DB instead of relying on `process.env`.
  2. Refactor `POST /paymob/webhook` to first retrieve the `paymentRecord` by `transactionId` or `orderId`, identify the `tenantId`, load that tenant's `hmacSecret` from `paymobProvidersTable`, and use *that* secret for the HMAC validation.

### 2. WhatsApp Callback Authentication Bug (High Severity)
- **Target**: `artifacts/api-server/src/routes/whatsapp.ts`
- **Issue**: The webhook endpoint `POST /whatsapp/messages/:id/callback` expects status updates (e.g., DELIVERED, FAILED) from the provider (Meta). However, it is protected by the `requirePlatformAdmin` middleware.
- **Exploit Vector / Business Impact**: The `requirePlatformAdmin` middleware requires a valid, authenticated session cookie. Meta's servers do not possess session cookies. Therefore, all delivery callbacks from Meta will be rejected with a `401 Unauthorized`.
- **Remediation**: Replace `requirePlatformAdmin` on this endpoint with a provider-appropriate authentication mechanism, such as verifying a `webhookSecret` (matching the one stored in `whatsappProvidersTable`) sent via headers or query parameters.

### 3. Payment Price Tampering (Safe)
- **Target**: `POST /orders`
- **Finding**: The server securely computes the `totalAmount` by fetching `unitPrice` directly from the database and multiplying by the requested `quantity`. Clients cannot tamper with the payment amount. No action required here.
