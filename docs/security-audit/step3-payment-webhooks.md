# Security Audit - Step 3: Payment & Webhook Security

## Context for the LLM
You are working on a multi-tenant SaaS e-commerce platform built with Node.js, Express, and Drizzle ORM.
The system integrates with **Paymob** for payments and **WhatsApp/Meta** for notifications. 
Currently, there is a severe architectural flaw: the system allows merchants to input their own Paymob credentials in the DB (`paymobProvidersTable`), but the payment execution logic completely ignores the DB and uses the platform's global `.env` variables. Furthermore, the WhatsApp webhook is mistakenly protected by a session-cookie middleware, guaranteeing that Meta's requests will fail.

## Tasks & Implementation Instructions

### Task 1: Fix Paymob Multi-Tenant Execution Flaw (High Severity)
- **Target Files**: `artifacts/api-server/src/lib/paymob.ts` and `artifacts/api-server/src/routes/paymob.ts`
- **Current State**: `initPayment` in `lib/paymob.ts` is hardcoded to use `process.env.PAYMOB_API_KEY` and `process.env.PAYMOB_INTEGRATION_ID`. The webhook `POST /paymob/webhook` uses `process.env.PAYMOB_HMAC_SECRET`.
- **Action**:
  1. Modify `lib/paymob.ts`: Update `initPayment` to accept the merchant's `apiKey`, `integrationId`, and `iframeId` as arguments, rather than reading them from `process.env`.
  2. Modify `POST /paymob/initiate`: Fetch the tenant's `apiKey`, `integrationId`, and `iframeId` from `paymobProvidersTable` and pass them to `initPayment`.
  3. Modify `POST /paymob/webhook`: 
     - Remove the global HMAC check at the very top of the function.
     - First, look up the `paymentRecord` in the database using the incoming `transaction_id` or `order_id`.
     - Once the `paymentRecord` and its `tenantId` are identified, fetch the specific tenant's `hmacSecret` from `paymobProvidersTable`.
     - Perform the HMAC SHA-512 verification using the *tenant's* secret. Reject if it fails.

### Task 2: Fix WhatsApp Callback Authentication Bug (High Severity)
- **Target File**: `artifacts/api-server/src/routes/whatsapp.ts`
- **Current State**: `POST /whatsapp/messages/:id/callback` uses the `requirePlatformAdmin` middleware. This middleware expects an active cookie session. Meta's webhook does not send cookies, resulting in a `401 Unauthorized`.
- **Action**:
  1. Remove `requirePlatformAdmin` from the callback endpoint.
  2. Implement an API Key or Webhook Secret verification logic (e.g., checking a `Bearer` token or custom header against the `webhookSecret` stored in the database for that tenant/provider).

## Exit Criteria
1. `initPayment` no longer uses `process.env.PAYMOB_API_KEY`. It strictly uses credentials passed as function arguments.
2. The Paymob webhook handler (`POST /paymob/webhook`) verifies signatures using the per-tenant `hmacSecret` retrieved from the database.
3. The WhatsApp callback endpoint (`POST /whatsapp/messages/:id/callback`) does NOT use `requirePlatformAdmin` and successfully authenticates incoming requests via a stateless token or webhook secret.
