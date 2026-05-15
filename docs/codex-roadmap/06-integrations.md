# Phase 6: Integrations

## Purpose Of This Document

This is the implementation handoff for the next model working on Phase 6. It should be treated as a product/engineering brief, not just a checklist.

Codex has already reviewed the recent integration work on branch `add_basic_features`. The branch is much closer than the old roadmap implied, but Phase 6 is not complete yet. The next implementer should finish the remaining production gaps below, then Codex should review the final diff before merging into `main`.

## Goal

Make payments, messaging, shipping, email, and exports reliable enough for pilot merchants.

Reliable means:

- Provider access is tenant-scoped and role-gated.
- Provider credentials are never exposed to the frontend or logs.
- Mocks/demo mode cannot be used accidentally in production.
- Webhooks are reachable in production, authenticated by provider-specific signatures or secrets, idempotent, and logged.
- Failed provider calls leave local order/payment/shipping state consistent.
- Operators can diagnose provider issues from logs, DB records, and admin views.

## Current Branch Context

Branch under review: `add_basic_features`.

Important recent commits after the previous review point:

- `b626658 codex hardening`
- `e259de3 codex hardening : fix signup issue`
- `03dabca codex hardening : fix sending mail issue`
- `aa436db codex hardening : sending emails`
- `980b825 gemini hardening : sending emails v2`

Additional local merge-readiness patch applied after review:

- Removed the production `DELETE /auth/self-destruct` testing route.
- Escaped user-controlled values in welcome/admin notification emails.
- Bounded signup email waits with `AUTH_EMAIL_TIMEOUT_MS`, default `3000`.
- Added email escaping tests.

Current uncommitted files from that patch:

- `artifacts/api-server/src/lib/email.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/test/email.test.ts`

Do not reintroduce the `self-destruct` endpoint. A real account deletion feature must be a separate product task with confirmation, audit logging, transactionality, and tests.

## What Is Already Done

### Signup And Transactional Email

Implemented:

- Signup creates tenant/merchant/onboarding/default categories inside a DB transaction.
- Default shipping seed was moved out of the signup transaction and made non-fatal, so shipping seed failures no longer break signup.
- Welcome email is sent through Resend after signup.
- Admin notification email is sent to platform admins after signup.
- `sendEmail` returns structured delivery state:
  - `{ sent: true, id }`
  - `{ sent: false, reason: "missing_api_key" | "provider_error" }`
- Production startup requires `RESEND_API_KEY`.
- Missing `EMAIL_FROM` in production warns that `onboarding@resend.dev` is only suitable for sandbox/testing.
- `APP_BASE_URL` is used for email links.
- Signup waits briefly for email delivery, but does not wait forever.
- User-controlled order, welcome, and admin email fields are escaped in HTML.

Files:

- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/email.ts`
- `artifacts/api-server/src/test/email.test.ts`

Verified:

- `pnpm --filter @workspace/api-server exec vitest run src/test/email.test.ts src/test/auth.test.ts --reporter=dot`
- `pnpm run typecheck`
- `pnpm run build`

Still needed:

- Consider tracking email delivery attempts in DB if support needs searchable history.
- Consider Resend webhook handling for delivered/bounced/complained/suppressed statuses. This is not required for first pilot if runtime logs are enough.

### WhatsApp

Implemented:

- Tenant-level WhatsApp provider table exists.
- Tenant-level WhatsApp message log table exists.
- Provider status/configuration endpoints exist.
- Plan gate exists: WhatsApp is restricted to `pro`.
- Owner can configure provider credentials.
- Staff/manager/owner can list and preview templates.
- Owner/manager can send a WhatsApp template for an order.
- Sends are tenant-scoped by order lookup.
- Sends require an `idempotencyKey`.
- Duplicate send idempotency key returns the existing log instead of sending again.
- Message logs are tenant-scoped on list.
- Legacy `sendWhatsAppMessage` callers can omit `components` for `order_confirmation`; helper builds body parameters.
- Focused WhatsApp tests pass.

Files:

- `artifacts/api-server/src/routes/whatsapp.ts`
- `artifacts/api-server/src/lib/whatsapp.ts`
- `artifacts/api-server/src/routes/notifications.ts`
- `artifacts/api-server/src/routes/payments.ts`
- `artifacts/api-server/src/test/whatsapp.test.ts`
- `lib/db/src/schema/whatsapp.ts`

Known gaps:

- `POST /whatsapp/messages/:id/callback` is public and only takes a log id plus status. It does not verify a webhook secret/signature and does not prove tenant/provider ownership. This is not production-safe.
- WhatsApp access tokens are stored in plaintext. At minimum, mark this as a security debt; ideally encrypt provider secrets before storage.
- `isMockAllowed` exists in DB and tests, but production fail-closed behavior should be explicitly tested.
- Template management is hard-coded in source. That is okay for pilot if templates are fixed, but the doc/UI should not imply merchants can manage real Meta templates yet.
- Opt-in/consent is not implemented. Do not automate marketing/follow-up messages until consent state exists.

### Paymob

Implemented:

- Tenant-level Paymob provider config exists.
- Payment records and Paymob webhook logs exist.
- Plan gate exists: Paymob allowed for `growth` and `pro`.
- Owner configures Paymob provider.
- Merchant can initiate a payment for one of their tenant orders.
- Existing pending payment record is reused when possible.
- Platform Paymob env config is checked before live initiation.
- Mock payment iframe path exists only when provider mock is explicitly allowed and platform live config is absent.
- Production rejects missing live Paymob credentials for payment initiation.
- Webhook route validates HMAC when `PAYMOB_HMAC_SECRET` is configured.
- Production webhook fails closed if `PAYMOB_HMAC_SECRET` is missing.
- Webhook creates an idempotency key from provider transaction id and skips duplicate webhooks.
- Successful webhook marks payment record paid and order payment status paid.
- Failed webhook marks payment failed and restores product/variant stock.
- Payment records list is tenant-scoped and hides payment token/iframe URL.
- Platform reconciliation route uses `requirePlatformAdmin`.
- FK cascade migration exists for order/payment cleanup.

Files:

- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/lib/paymob.ts`
- `artifacts/api-server/src/routes/payments.ts`
- `lib/db/src/schema/payment-records.ts`
- `lib/db/src/schema/orders.ts`
- `lib/db/drizzle/0006_misty_next_avengers.sql`

Known gaps:

- Production CSRF exemption must be proven for the actual mounted route. The Paymob router is mounted under `/api`, and the public webhook path is `/api/paymob/webhook`. `artifacts/api-server/src/lib/csrf.ts` must include this exact path, and a production-mode test must prove the request reaches HMAC validation rather than failing CSRF first.
- HMAC tests are insufficient. Add tests for missing HMAC, invalid HMAC, valid HMAC, duplicate replay, and production missing secret.
- Webhook tenant trust must be reviewed. A webhook can currently find records by Paymob provider order id or merchant order id. Ensure it never updates another tenant's order/payment by ambiguous ids.
- Payment success path updates order `paymentStatus` but does not clearly move order `status` to `confirmed`. Decide expected behavior and test it.
- Failed-payment stock restore must be covered by a DB-backed regression test including variant stock.
- Paymob provider secrets are stored as hash/secret fields, but live API key handling should be reviewed. If a tenant-specific API key is needed for live calls, do not store only an irreversible hash. If platform-level Paymob credentials are intended, remove/clarify tenant API key fields.
- Paymob webhook event log stores limited fields. Add raw payload hash/summary and error details if support needs diagnostics, but do not store full sensitive payloads blindly.

### Shipping Rules

Implemented:

- Tenant shipping zones CRUD exists.
- Tenant shipping settings upsert exists.
- Public shipping calculation endpoint exists.
- Signup seeds default shipping rules best-effort after merchant creation.
- Checkout can use shipping cost/governorate/city fields.
- Shipping rules tests pass.

Files:

- `artifacts/api-server/src/routes/shipping-rules.ts`
- `artifacts/fashion-store/src/pages/shipping-rules.tsx`
- `artifacts/api-server/src/test/shipping-rules.test.ts`
- `lib/db/src/schema/shipping-rules.ts`

Known gaps:

- Public `POST /shipping/calculate` accepts raw `tenantId`. This is acceptable for checkout, but validate tenant exists and is active before returning shipping rules.
- Add tests for disabled shipping, free shipping threshold, city-specific override, governorate fallback, default fallback, and cross-tenant zone isolation if not already complete.
- Decide whether default seeded shipping zones should be visible/editable in onboarding UI.

### Bosta / Logistics Provider

Implemented:

- `POST /shipping/bosta/create` exists.
- `GET /shipping/track/:trackingNumber` exists.
- API client schemas/hooks exist.
- Bosta helper exists.

Files:

- `artifacts/api-server/src/routes/shipping.ts`
- `artifacts/api-server/src/lib/bosta.ts`
- generated API client files under `lib/api-client-react/src/generated`

Known gaps and likely blockers:

- `POST /shipping/bosta/create` uses `requireAuth`, but it does not scope the order lookup by `req.merchantTenantId`. It selects by `orderId` only. This is a cross-tenant shipment creation risk and must be fixed before merge.
- Bosta create currently accepts `customerPhone` from the request body instead of deriving it from the tenant-scoped order/customer data. Derive phone from order/customer unless an explicit override is required and authorized.
- No Bosta shipment table/event log exists. The order row stores `bostaShipmentId` and `trackingNumber`, but provider attempts/errors are not auditable.
- No idempotency key for Bosta create. Repeated clicks can create duplicate shipments.
- No Bosta webhook route for delivery status updates.
- No signature/secret verification for logistics callbacks because callbacks do not exist yet.
- No manual fallback/admin retry path besides editing order state manually.
- No tests found for Bosta route tenant isolation, provider not configured, provider failure, duplicate create, or tracking behavior.

### Exports

Implemented:

- Export jobs table exists.
- `POST /exports` creates an export job and returns CSV synchronously for small tenants.
- Export job listing is tenant-scoped.
- Platform admin can list export jobs.
- Export limiter exists.

Files:

- `artifacts/api-server/src/routes/exports.ts`
- `lib/db/src/schema/export-jobs.ts`

Known gaps and likely blockers:

- Customer export currently reads all rows from `customersTable` without tenant scoping. Because customers are global and orders link customers to tenants, customer exports must derive customers through tenant orders or introduce tenant/customer ownership.
- `dateFrom` and `dateTo` are accepted but not applied to the export queries.
- `order_items` is listed as a valid export type but appears not implemented in the export switch.
- Download token is generated but no download endpoint exists.
- Synchronous CSV generation is okay for small pilots, but Phase 7 should move large exports to background jobs/object storage.

## Implementation Tasks For Gemini Pro

Work in small commits. Do not do broad refactors unless needed for the task. Preserve existing API shapes where possible.

### Task 1: Fix Production Webhook Reachability And Tests

Goal: Paymob webhook must be reachable in production without disabling CSRF globally.

Actions:

1. Inspect `artifacts/api-server/src/lib/csrf.ts`.
2. Ensure `CSRF_EXEMPT_PATHS` includes the exact mounted route:
   - `/api/paymob/webhook`
3. Keep exemptions narrow. Do not exempt all `/api/paymob`.
4. Add/extend tests that run with `NODE_ENV=production` or simulate production CSRF behavior:
   - `POST /api/paymob/webhook` with no HMAC and `PAYMOB_HMAC_SECRET` set reaches route and returns `401 Missing HMAC signature`, not CSRF error.
   - invalid HMAC returns `401`.
   - missing `PAYMOB_HMAC_SECRET` in production returns `503`.
   - valid HMAC reaches processing path.

Likely test file:

- `artifacts/api-server/src/test/paymob.test.ts`

Review expectation:

- Codex will look for narrow exemption, no weakening of global CSRF, and deterministic HMAC tests.

### Task 2: Harden Paymob Webhook Idempotency And State Changes

Goal: Duplicate or failed payment callbacks must not corrupt order/payment/stock state.

Actions:

1. Add tests for duplicate webhook transaction id:
   - first callback inserts one `payment_webhooks` row and updates payment/order state.
   - second callback returns duplicate and does not update state twice.
2. Add failed-payment test with product and variant stock:
   - create order with variant.
   - simulate failed Paymob webhook.
   - assert payment record failed.
   - assert order payment status failed.
   - assert product and variant stock restored exactly once.
3. Decide and implement expected order status on successful payment:
   - recommended: paid Paymob order should move from `pending`/`awaiting_confirmation` to `confirmed`, unless COD confirmation flow intentionally differs.
   - document the choice in test name.
4. Ensure all updates are tenant-safe and transactional where multiple records change together.

Files:

- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/test/paymob.test.ts`
- `artifacts/api-server/src/test/orders.test.ts` if shared helpers are needed.

### Task 3: Fix Bosta Tenant Isolation And Idempotency

Goal: A merchant must not create or mutate shipments for another tenant's order.

Actions:

1. Change `POST /shipping/bosta/create` from `requireAuth` to role middleware with tenant context, probably `requireRole("owner", "manager", "staff")`.
2. Lookup order by both:
   - `ordersTable.id = orderId`
   - `ordersTable.tenantId = req.merchantTenantId`
3. Derive customer phone from order/customer data. Only accept request body phone as a fallback if existing API compatibility requires it.
4. If order already has `bostaShipmentId` and `trackingNumber`, return the existing shipment instead of creating a duplicate.
5. Add an idempotency key if the route should support explicit retries. If no new table is added, at least use existing order shipment fields as idempotency guard.
6. Add tests:
   - unauthenticated returns 401.
   - tenant A cannot create shipment for tenant B order.
   - unconfigured Bosta returns safe `configured: false`.
   - duplicate create returns existing shipment and does not call provider twice.
   - provider failure leaves order unchanged.

Files:

- `artifacts/api-server/src/routes/shipping.ts`
- `artifacts/api-server/src/lib/bosta.ts`
- new or existing shipping/Bosta test file.

### Task 4: Add Logistics Event Logging Or Explicitly Defer It

Goal: Provider operations should be diagnosable.

Status: Deferred to Phase 7. Route-level structured logs for create success/failure have been added to `artifacts/api-server/src/routes/shipping.ts`. A full DB table for `shipping_provider_events` will be implemented later.

### Task 5: Fix Export Tenant Data Safety

Goal: Exports must never leak another tenant's customers or data.

Actions:

1. Fix `customers` export:
   - because `customersTable` is global, derive customer ids from `ordersTable` filtered by `tenantId`.
   - export distinct customers for that tenant only.
2. Implement or remove `order_items` export:
   - if implemented, join order items through orders filtered by tenant.
   - if removed, remove from `TYPE_LABELS` and any UI that offers it.
3. Apply `dateFrom`/`dateTo` filters to all export types where the table has date columns.
4. Add tests:
   - tenant A customer export excludes customer used only by tenant B.
   - order items export is tenant-scoped.
   - date range filters work.
   - export jobs list does not expose `downloadToken`.

Files:

- `artifacts/api-server/src/routes/exports.ts`
- `artifacts/api-server/src/test/exports.test.ts` or equivalent.

### Task 6: Harden WhatsApp Callback

Goal: Provider callbacks must not allow unauthenticated status changes by log id.

Actions:

1. If this endpoint is intended for Meta webhook callbacks, redesign it around provider webhook payloads and verify `webhookSecret`.
2. If this endpoint is only an internal/testing callback, remove it from production or protect it with auth/admin role.
3. Do not accept arbitrary `status` updates from public callers.
4. Add tests:
   - public unauthenticated callback cannot update message status.
   - valid provider callback with secret/signature can update only the matching tenant/provider log.
   - invalid secret/signature is rejected.

Files:

- `artifacts/api-server/src/routes/whatsapp.ts`
- `lib/db/src/schema/whatsapp.ts` if more provider event fields are needed.

### Task 7: Production Mock Guardrails

Goal: Mocks must never masquerade as production integrations.

Actions:

1. Search for `isMockAllowed`, `PAYMOB_ALLOW_MOCKS`, `mock`, and provider fallback paths.
2. Ensure production cannot use mock Paymob/WhatsApp/Bosta sends unless the app is explicitly in a safe non-production mode.
3. Add tests for production mode:
   - Paymob mock initiation rejected.
   - WhatsApp mock send rejected.
   - Bosta unconfigured returns safe disabled result and never fake success.
4. Keep test mode ergonomic, but make production fail closed.

Files:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/routes/whatsapp.ts`
- `artifacts/api-server/src/routes/shipping.ts`

### Task 8: Update Docs And Status

After implementation:

1. Update this file with completed items and remaining risks.
2. Update `docs/codex-roadmap/00-status.md`:
   - set Phase 6 to `In progress` or `Complete` only if all exit criteria below pass.
   - add concise session notes with commands run.
3. Do not mark Phase 6 complete if any P1/P2 integration finding remains.

## Test Plan / Commands

Run focused tests first:

```bash
pnpm --filter @workspace/api-server exec vitest run src/test/paymob.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/whatsapp.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/shipping-rules.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/auth.test.ts src/test/email.test.ts --reporter=dot
```

Add these after implementing the missing test files:

```bash
pnpm --filter @workspace/api-server exec vitest run src/test/exports.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/shipping.test.ts --fileParallelism=false
```

Then run merge gates:

```bash
pnpm run typecheck
pnpm run build
git diff --check
```

Known non-blocking build warnings today:

- Vite sourcemap warnings for some shadcn/ui wrapper files.
- Vite chunk-size warning for the fashion-store public bundle.
- API server bundle-size warnings around `dist/index.mjs` and `dist/app.mjs`.

Do not treat those known warnings as Phase 6 blockers unless they become errors or regress significantly.

## Exit Criteria

Phase 6 can be marked complete only when:

- Signup still works and welcome email still sends in the deployed environment.
- Missing or slow email provider does not break signup.
- Paymob webhook is reachable in production and HMAC/idempotency tests pass.
- Paymob payment success/failure state transitions are tenant-safe and stock-safe.
- WhatsApp send/log/list flows are tenant-safe and production mock behavior is fail-closed.
- WhatsApp callback is either secured or removed from production.
- Bosta create is tenant-scoped and idempotent enough to avoid duplicate shipments.
- Export routes cannot leak customers/order items across tenants.
- Provider secrets are not exposed in API responses or logs.
- Focused provider tests and root typecheck/build pass.
- Codex review finds no P1/P2 merge blockers.

## Review Notes For Codex

When Gemini is done, review in this order:

1. Tenant isolation on Bosta, exports, WhatsApp logs/callbacks, and Paymob records.
2. Production provider guardrails and CSRF/webhook reachability.
3. Idempotency and state consistency under duplicate provider events.
4. Secret handling and API response redaction.
5. Focused tests and root gates.

Any cross-tenant leak, public unauthenticated provider state mutation, production mock success, or payment/stock double mutation should block merge.
