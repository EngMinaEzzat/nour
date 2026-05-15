# Phase 7: Scale And Compliance

## Purpose Of This Document

This is the implementation handoff for the next model working on Phase 7. Treat it as an engineering/product brief for Gemini Pro, not as a loose checklist.

Phase 6 is marked complete in `docs/codex-roadmap/00-status.md`. Phase 7 should build on that work without weakening the earlier hardening gates: tenant isolation, provider guardrails, Arabic user-facing UX, production mock safety, payment/stock correctness, and focused API tests.

When Gemini finishes this phase, Codex should review the final diff before merge.

## Goal

Prepare Nour for larger merchant volume, stronger operational reliability, and privacy/compliance review.

Done means:

- Hot storefront/admin/order/export paths are measured, indexed, and no longer rely on obvious N+1 or unbounded reads.
- Redis/cache use is explicit, invalidated safely, and never hides checkout/payment/order correctness bugs.
- Long-running exports, provider retries, sitemap generation, and analytics rollups have a background-job path.
- Backup/restore, monitoring, health checks, and incident diagnostics are documented and testable in non-production.
- A compliance data map, retention policy, audit coverage, export/delete workflows, consent/notice model, and provider transfer register exist.
- The app is Dockerized and Kubernetes-ready, but Kubernetes is not forced as the day-one deployment target.

## Current Context

Important existing pieces:

- Redis is already used for sessions when `REDIS_URL` is set; otherwise the API falls back to PostgreSQL sessions.
- `GET /api/healthz` exists but only returns `{ status: "ok" }`.
- Structured logging uses Pino and redacts authorization/cookie headers.
- Export jobs table exists, but `POST /exports` still generates CSV synchronously.
- Tenant audit tables exist, but audit coverage is incomplete across critical mutations.
- Phase 6 fixed integration safety for Paymob, WhatsApp, Bosta, and exports.
- Some hot-path indexes already exist on products and orders:
  - `idx_products_tenant_status`
  - `idx_products_tenant_featured`
  - `idx_orders_tenant_created_at`
  - `idx_orders_tenant_status`
  - `idx_orders_public_code`

Important current risks/gaps observed in code:

- `artifacts/api-server/src/routes/storefront.ts` performs per-category product count queries and can fan out badly as category counts grow.
- `artifacts/api-server/src/routes/orders.ts` currently loads the merchant order queue without pagination and performs search filtering in memory.
- `artifacts/api-server/src/routes/health.ts` does not check DB, Redis/cache, provider config, or readiness.
- `artifacts/api-server/src/lib/logger.ts` redaction is too narrow for a compliance phase.
- `artifacts/api-server/src/routes/exports.ts` is synchronous and should move large exports to jobs/object storage or a clearly staged local substitute.

## Legal/Compliance Context

This phase is not a substitute for Egyptian legal advice.

Egypt Law No. 151 of 2020 requires serious privacy and cross-border transfer analysis. Do not simplify this into "all data must always stay in Egypt." The correct implementation posture is:

- inventory the data,
- minimize unnecessary personal data,
- record which providers receive which data,
- document data-residency decisions,
- prepare technical controls for access/export/delete/retention,
- have counsel review licensing, transfer, consent, notice, and retention obligations.

As of this handoff, recent public legal commentary and policy trackers report that Executive Regulations under MCIT Decree No. 816 of 2025 entered into force in November 2025 and add practical licensing/transfer requirements. Gemini should not make final legal claims; it should document assumptions and mark legal-review checkpoints.

Sources checked by Codex on 2026-05-15:

- https://digitalpolicyalert.org/event/36511-executive-regulations-of-the-personal-data-protection-law-decision-no-816-of-2025-including-cross-border-data-transfer-regulation-entered-into-force
- https://www.shandpartners.com/insights/briefings/telecoms-media-technology/the-issuance-of-the-executive-regulations-of-the-data-protection-law-and-the-establishment-of-the-data-protection-centre/
- https://www.loc.gov/item/global-legal-monitor/2020-10-29/egypt-countrys-first-law-on-protection-of-personal-data-enters-into-force/

## Non-Goals

Do not:

- rewrite the app into a new framework,
- migrate to Kubernetes as the only supported deployment,
- add a new paid external service unless it is optional and env-gated,
- cache checkout, payment webhooks, stock mutations, or provider state transitions in a way that can return stale correctness-critical state,
- delete real customer/order/payment data automatically without explicit retention/legal decisions,
- log raw request bodies, secrets, full payment payloads, full AI prompts, or unnecessary full PII.

## Files To Inspect First

Performance and hot paths:

- `artifacts/api-server/src/routes/storefront.ts`
- `artifacts/api-server/src/lib/seo-public.ts`
- `artifacts/api-server/src/routes/products.ts`
- `artifacts/api-server/src/routes/orders.ts`
- `artifacts/api-server/src/routes/exports.ts`
- `artifacts/api-server/src/routes/customers.ts`
- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/lib/logger.ts`
- `artifacts/api-server/src/lib/rate-limiters.ts`
- `lib/db/src/schema/products.ts`
- `lib/db/src/schema/orders.ts`
- `lib/db/src/schema/customers.ts`
- `lib/db/src/schema/categories.ts`
- `lib/db/src/schema/export-jobs.ts`

Compliance and audit:

- `lib/db/src/schema/tenant-audit.ts`
- `lib/db/src/schema/audit-log.ts`
- `lib/db/src/schema/ai-usage-events.ts`
- `lib/db/src/schema/whatsapp.ts`
- `lib/db/src/schema/payment-records.ts`
- `lib/db/src/schema/tracking.ts`
- `lib/db/src/schema/messages.ts`
- `lib/db/src/schema/conversations.ts`
- `artifacts/api-server/src/routes/audit.ts`
- `artifacts/api-server/src/routes/tracking.ts`
- `artifacts/api-server/src/routes/ai-assistant.ts`
- `artifacts/api-server/src/routes/ai-import.ts`
- `artifacts/api-server/src/routes/whatsapp.ts`
- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/routes/shipping.ts`

Deployment and operations:

- `package.json`
- `artifacts/api-server/package.json`
- `artifacts/fashion-store/package.json`
- `vercel.json`
- `.env.test.example`
- `docs/codex-roadmap/testing-database.md`
- `lib/db/MIGRATIONS.md`

## Implementation Rules For Gemini Pro

- Work in small commits or small logical patches.
- Use Drizzle schema changes and generated migrations; do not hand-edit snapshot metadata without running the proper DB generation/check commands.
- Keep API response shapes backward compatible where possible. Add optional query params instead of breaking existing clients.
- Every new route must be tenant-scoped or platform-admin scoped.
- Every new background job must be idempotent or have a clear uniqueness/claiming strategy.
- Any data export/delete/audit feature must have cross-tenant negative tests.
- Any production feature that depends on Redis, Sentry, object storage, or provider APIs must fail safely when config is missing.
- Keep user-facing errors Arabic where the existing route returns Arabic.
- Keep secrets out of frontend bundles, API responses, logs, CSV exports, and audit metadata.

## Milestones

### Milestone 1: Baseline And Measurement

Deliver a short baseline before optimizing so the review can compare before/after behavior.

Actions:

1. Create `docs/ops/phase-7-scale-baseline.md`.
2. Document the hot paths to measure:
   - public storefront home: `GET /api/store/:slug`
   - public SSR store page/product/category paths
   - product detail + variants
   - admin order queue: `GET /api/orders`
   - export creation/listing
   - health/readiness endpoints
3. Add or document a safe seed/load-smoke approach for a dedicated test database only.
4. Include representative dataset sizes:
   - 1 tenant with 1,000 products, 50 categories, 2,000 orders
   - 1 tenant with 10,000 products, 100 categories, 25,000 orders if the local DB can handle it
5. Record baseline timings and obvious query problems. It is acceptable if the first baseline is rough; it must be reproducible.

Acceptance criteria:

- The baseline doc includes commands used, dataset assumptions, and measured results.
- Destructive seed/load scripts require `NODE_ENV=test` or `NOUR_TEST_DATABASE_OK=true`.
- No production or shared database can be accidentally wiped by the measurement tooling.

Likely files:

- `docs/ops/phase-7-scale-baseline.md`
- optional `scripts/phase7-seed-scale-data.mjs`
- optional `scripts/phase7-load-smoke.mjs`

### Milestone 2: Database Indexes And Query Shape

Goal: make hot paths index-friendly and remove obvious N+1/unbounded query patterns.

Actions:

1. Review existing indexes and add targeted indexes for:
   - `tenants.slug` plus active lookup if not already indexed/unique enough.
   - `categories.tenant_id`, `categories.parent_id`, and category listing/count paths.
   - `product_variants.product_id`.
   - `order_items.order_id`.
   - order queue filters/search:
     - `orders.tenant_id, created_at`
     - `orders.tenant_id, status, created_at`
     - fields used for Bosta/Paymob lookup if not already indexed.
   - export/date filters for returns and stock adjustments if missing.
   - AI usage/compliance/audit date lookups if used in new dashboards.
2. Optimize `GET /api/store/:slug`:
   - Keep tenant and active-product scoping.
   - Replace per-category product count queries with one grouped query.
   - Keep variant counts batched by product ID.
   - Keep tracking settings lookup tenant-scoped.
   - Ensure search/category filters remain correct.
3. Optimize `GET /api/orders`:
   - Add pagination with safe defaults: `limit` default 50, max 100.
   - Add cursor or page-based pagination. Cursor by `createdAt` + `id` is preferred.
   - Move search into the DB where possible:
     - order id exact/partial as appropriate,
     - customer name,
     - customer phone,
     - public code/tracking number if useful.
   - Avoid fetching all order items with one query per order; batch by order IDs.
   - Preserve tenant isolation and role gates.
4. Add EXPLAIN evidence for each hot path in the baseline/final report:
   - show the query,
   - show expected index usage,
   - note any sequential scans that remain acceptable because the table is small or the query is not hot.

Acceptance criteria:

- Hot-path queries are bounded or intentionally documented.
- No new unscoped table scans are introduced on multi-tenant tables.
- Existing tests still pass.
- New/updated tests prove order pagination, tenant isolation, search, and storefront category counts.

Likely files:

- `lib/db/src/schema/*.ts`
- new Drizzle migration under `lib/db/drizzle`
- `artifacts/api-server/src/routes/storefront.ts`
- `artifacts/api-server/src/routes/orders.ts`
- `artifacts/api-server/src/test/storefront.test.ts`
- `artifacts/api-server/src/test/orders.test.ts`

### Milestone 3: Caching Strategy

Goal: introduce a small, safe cache layer for read-heavy public data.

Actions:

1. Add a cache helper, likely `artifacts/api-server/src/lib/cache.ts`.
2. Reuse Redis if `REDIS_URL` is configured. In tests/development, allow an in-memory fallback with short TTL.
3. Cache only safe read models:
   - storefront payload by slug/filter/search/category,
   - public SSR rendered metadata/data if it is easy and safe,
   - provider health summary for a short TTL,
   - dashboard aggregate snapshots if implemented.
4. Never cache:
   - checkout creation,
   - payment webhook processing,
   - stock mutations,
   - auth/session responses,
   - tenant/admin private data unless tenant-specific keys and invalidation are explicit.
5. Add invalidation by tenant when these mutate:
   - products/variants,
   - categories,
   - storefront settings,
   - tracking settings,
   - tenant status/slug/theme fields.
6. Use namespaced keys, for example:
   - `storefront:v1:tenant:<tenantId>:...`
   - `provider-health:v1:...`
7. Add metrics/logging for cache hit/miss at debug level without PII.

Acceptance criteria:

- Cache behavior is covered by tests for hit, miss, TTL, and invalidation.
- A stale product/category/store setting is not returned after mutation.
- Missing Redis does not break local tests or development.
- Production logs do not include full cached payloads.

Likely files:

- `artifacts/api-server/src/lib/cache.ts`
- `artifacts/api-server/src/routes/storefront.ts`
- `artifacts/api-server/src/routes/products.ts`
- `artifacts/api-server/src/routes/store-settings.ts`
- `artifacts/api-server/src/routes/tracking.ts`
- new or existing cache/storefront tests

### Milestone 4: Background Jobs

Goal: move long-running or retryable work out of request/response paths.

Use a database-backed job queue first. Redis/BullMQ can be a later improvement, but DB-backed jobs are easier to run in Vercel, Docker, and test environments.

Actions:

1. Add a `background_jobs` table with at least:
   - `id`
   - `tenant_id` nullable for platform jobs
   - `job_type`
   - `status`: queued, processing, succeeded, failed, dead
   - `payload` as JSON/text
   - `attempts`
   - `max_attempts`
   - `run_at`
   - `locked_at`
   - `locked_by`
   - `last_error`
   - `idempotency_key`
   - timestamps
2. Add unique idempotency where appropriate:
   - export job request idempotency,
   - provider retry event idempotency,
   - sitemap generation per tenant/time window.
3. Add worker helpers:
   - claim due jobs atomically,
   - mark succeeded/failed,
   - exponential backoff,
   - dead-letter after max attempts.
4. Convert large exports:
   - `POST /exports` should create a job for large exports or when `async: true`.
   - Keep synchronous CSV for very small exports only if documented.
   - Add a download endpoint for completed jobs if feasible.
   - Store export output in object storage when configured; otherwise store a local/test artifact path only in non-production.
5. Add job types or clear stubs for:
   - `export.csv`
   - `provider.retry`
   - `sitemap.generate`
   - `analytics.rollup`
6. Add a worker entrypoint:
   - `artifacts/api-server/src/jobs/worker.ts`
   - package script such as `pnpm --filter @workspace/api-server run jobs:work`
7. In Vercel/serverless mode, do not start an infinite worker inside the request handler. In Docker/local mode, run the worker as a separate process.

Acceptance criteria:

- Jobs are tenant-safe and idempotent.
- Worker tests cover claim concurrency enough to prevent two workers from processing the same job.
- Export jobs no longer require the HTTP request to stay open for large CSV generation.
- Failed jobs expose safe diagnostics without full PII or secrets.

Likely files:

- `lib/db/src/schema/background-jobs.ts`
- `lib/db/src/schema/export-jobs.ts`
- `artifacts/api-server/src/jobs/*`
- `artifacts/api-server/src/routes/exports.ts`
- `artifacts/api-server/src/test/exports.test.ts`
- new job tests

### Milestone 5: Backup And Restore

Goal: document and rehearse a non-production restore path.

Actions:

1. Create `docs/ops/backup-restore.md`.
2. Cover:
   - Supabase/Postgres backup owner,
   - backup frequency,
   - point-in-time recovery assumptions,
   - manual export fallback,
   - object storage/media backup assumptions,
   - environment variable/secrets backup assumptions,
   - restore drill steps into non-production,
   - rollback and verification checklist.
3. Add scripts only if they are safe:
   - a restore drill helper must refuse to run against production,
   - must print the target DB host/name before destructive actions,
   - must require explicit env flags.
4. Document what cannot be verified locally without provider console access.

Acceptance criteria:

- Backup/restore doc exists and is specific to this repo.
- Non-production restore drill is documented with commands and verification steps.
- No script can accidentally restore over production.

Likely files:

- `docs/ops/backup-restore.md`
- optional `scripts/backup-restore-drill.ps1`
- optional `scripts/backup-restore-drill.mjs`

### Milestone 6: Observability And Health

Goal: operators should diagnose production issues without database console spelunking.

Actions:

1. Expand health checks:
   - keep `GET /api/healthz` as cheap liveness.
   - add `GET /api/readyz` for readiness.
   - readiness should check DB connectivity.
   - readiness should check Redis/cache if configured.
   - readiness should return provider configuration status without secrets:
     - email/Resend configured,
     - Paymob platform config present where required,
     - Bosta configured where required,
     - WhatsApp provider status summary,
     - AI provider configured or mock disabled in production.
2. Add a platform-admin provider health dashboard endpoint:
   - no secrets,
   - status, last success, last failure, last error class, updated timestamp,
   - tenant-scoped provider health where relevant.
3. Improve structured logs:
   - add request id/correlation id support if not already present.
   - redact `authorization`, `cookie`, `set-cookie`, provider tokens, API keys, HMAC/signature headers, payment tokens, full AI prompt/result fields, full address/phone/email where not required.
   - avoid logging full `req.body`.
4. Add Sentry support only if env-gated:
   - no crash if `SENTRY_DSN` is absent.
   - release/environment tags if available.
   - beforeSend redacts PII/secrets.
5. Add operational docs:
   - `docs/ops/observability.md`
   - include log fields, dashboards to build later, and alert suggestions.

Acceptance criteria:

- Health tests cover healthy DB, simulated DB failure if practical, missing Redis, and no secret leakage.
- Log redaction tests or focused assertions cover common secret/PII keys.
- `readyz` returns safe structured JSON and never exposes credentials.
- Existing `/healthz` remains fast and stable.

Likely files:

- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/src/lib/logger.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/test/health.test.ts`
- `docs/ops/observability.md`

### Milestone 7: Compliance Data Map And Retention

Goal: create a real privacy/compliance implementation base while leaving legal conclusions to counsel.

Actions:

1. Create `docs/compliance/data-map.md` with tables for:
   - merchant account data,
   - staff/admin/session data,
   - customer data,
   - orders/order items/shipping addresses,
   - payments/Paymob data,
   - WhatsApp/messages/customer support data,
   - AI prompts/results/usage records,
   - tracking/analytics pixels,
   - media/uploads/images/CDN,
   - logs/errors/traces,
   - exports/download artifacts.
2. For each data category document:
   - schema/table/source,
   - personal data fields,
   - sensitive/secret fields,
   - purpose,
   - tenant boundary,
   - processors/providers,
   - cross-border transfer likelihood,
   - retention proposal,
   - deletion/export behavior,
   - legal review notes.
3. Create `docs/compliance/provider-transfer-register.md` covering:
   - Supabase/Postgres,
   - Vercel,
   - Redis provider if external,
   - object storage/CDN/image delivery,
   - Resend/email,
   - Paymob,
   - Bosta/logistics,
   - Meta/WhatsApp,
   - AI providers: Anthropic/Gemini/OpenAI-compatible,
   - Sentry/observability,
   - analytics/tracking providers.
4. Create `docs/compliance/retention-policy.md`:
   - propose retention windows,
   - mark legal/accounting retention as legal-review required,
   - distinguish deletion from pseudonymization/anonymization,
   - do not auto-delete orders/payments by default.
5. Add retention constants/config where useful, but do not start destructive scheduled deletes unless explicitly reviewed.

Acceptance criteria:

- Data map is specific to this codebase, not generic SaaS boilerplate.
- Every provider that receives customer, merchant, order, AI, payment, media, analytics, or log data is listed.
- Cross-border transfer decisions are documented as decisions/risks, not hidden in code comments.
- Legal-review items are clearly marked.

Likely files:

- `docs/compliance/data-map.md`
- `docs/compliance/provider-transfer-register.md`
- `docs/compliance/retention-policy.md`

### Milestone 8: Privacy Export/Delete Workflows

Goal: implement practical data-subject/merchant privacy operations without corrupting order/payment history.

Actions:

1. Add a `privacy_requests` table:
   - tenant id nullable for platform-level requests,
   - requester type,
   - subject type: merchant, customer, staff,
   - subject identifiers: email/phone/customer id/merchant id as appropriate,
   - request type: export, delete, restrict, correction
   - status,
   - requested by,
   - reviewed by,
   - result summary,
   - timestamps.
2. Add platform-admin routes for privacy requests:
   - create/list/get/update status.
   - platform-admin only unless a tenant-scoped merchant view is explicitly designed.
3. Add tenant-scoped customer privacy export helper:
   - lookup by email/phone/customer id through tenant orders.
   - include customer profile, orders, order items, messages/contact attempts if present, exports metadata if relevant.
   - exclude secrets, provider tokens, internal session ids, full audit metadata not belonging to the subject.
4. Add customer delete/pseudonymize workflow:
   - default to pseudonymize tenant-owned PII while preserving order/payment/accounting records.
   - remember that `customersTable` is currently global and `customers.email` is unique.
   - before mutating a global customer row, check whether that customer appears in orders for any other tenant.
   - if the customer is shared across tenants, do not globally pseudonymize the shared `customers` row as part of one tenant's request; instead mask tenant-owned order/contact/message PII and document the remaining global-row decision for legal/product review.
   - if the customer belongs only to the requesting tenant, pseudonymize the customer row plus tenant-owned denormalized PII.
   - mask order-level `customerName`, `customerPhone`, `shippingAddress`, `shippingGovernorate`, and `shippingCity` where safe.
   - write audit/privacy request records.
   - do not delete payment records, provider webhook records, or order financial totals unless legal review explicitly says so.
5. Add merchant/staff export/delete planning notes if full implementation is too large; customer workflow is the minimum.

Acceptance criteria:

- Cross-tenant privacy export/delete attempts are rejected and tested.
- Pseudonymization preserves order totals/statuses and does not break admin order queue.
- Privacy actions are audited.
- No export includes provider secrets, tokens, HMACs, or unrelated tenant data.

Likely files:

- `lib/db/src/schema/privacy-requests.ts`
- `artifacts/api-server/src/routes/privacy.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/test/privacy.test.ts`
- `docs/compliance/privacy-operations.md`

### Milestone 9: Consent And Tracking Notice

Goal: make marketing/tracking consent explicit enough for pilot compliance review.

Actions:

1. Review `trackingSettingsTable` and storefront tracking dispatch.
2. Ensure tracking pixels are disabled by default unless configured and enabled by the merchant.
3. Add customer marketing consent fields where appropriate:
   - checkout marketing opt-in,
   - WhatsApp/marketing contact consent,
   - source, timestamp, and evidence text/version.
4. Do not block transactional order/fulfillment messages on marketing opt-in, but clearly separate transactional from marketing/follow-up messages.
5. Add consent/notice docs:
   - what the shopper sees,
   - what merchants control,
   - what platform operators must configure.
6. Add tests that:
   - tracking IDs are not emitted when disabled,
   - marketing opt-in is stored when checked,
   - marketing automation does not send without opt-in if such automation exists,
   - transactional order messages remain allowed under the product decision.

Acceptance criteria:

- Consent state is tenant/customer scoped.
- Tracking stays disabled unless both configured and enabled.
- Marketing/follow-up sends have a clear consent gate or are explicitly blocked until consent exists.

Likely files:

- `lib/db/src/schema/customers.ts`
- `lib/db/src/schema/tracking.ts`
- `artifacts/api-server/src/routes/orders.ts`
- `artifacts/api-server/src/routes/tracking.ts`
- `artifacts/fashion-store/src/pages/checkout.tsx`
- relevant frontend API client/generated files if this repo uses generated clients for the touched API surface
- tests for checkout/tracking/WhatsApp if automation paths are touched

### Milestone 10: Audit Trail Coverage

Goal: critical changes should leave a searchable, tenant-scoped audit trail.

Actions:

1. Expand audit event types as needed.
2. Add a small audit helper to avoid copy/paste route logging.
3. Add audit writes for:
   - provider configured/disabled,
   - tracking updated,
   - export requested/completed/failed,
   - privacy request created/reviewed/completed,
   - customer pseudonymized,
   - product deleted,
   - variant stock manually changed,
   - order cancelled/returned/status changed,
   - staff invited/role changed/revoked if not already covered,
   - billing/plan changes if not already covered.
4. Audit metadata must be useful but minimal:
   - ids, status changes, field names,
   - no provider secrets,
   - no full addresses,
   - no full payment payloads,
   - no full AI prompt/result text.

Acceptance criteria:

- Tests assert audit rows for at least provider config, export request, privacy action, order status change, and product deletion.
- Tenant admins cannot read another tenant's audit events.
- Platform audit remains platform-admin only.

Likely files:

- `lib/db/src/schema/tenant-audit.ts`
- `artifacts/api-server/src/lib/audit.ts`
- relevant route files
- `artifacts/api-server/src/test/audit.test.ts` or focused tests in existing route test files

### Milestone 11: Containerization And Deployment Readiness

Goal: Dockerize the app and make it Kubernetes-ready without making Kubernetes mandatory.

Actions:

1. Add production Docker support:
   - root `Dockerfile` or separate API/frontend Dockerfiles if cleaner.
   - `.dockerignore`.
   - production build should use `pnpm` and the existing workspace layout.
   - runtime should not include unnecessary dev artifacts.
2. Add local compose for non-production:
   - app,
   - Postgres,
   - Redis,
   - optional worker process.
3. Add healthcheck wiring to the container:
   - liveness uses `/api/healthz`,
   - readiness uses `/api/readyz`.
4. Add Kubernetes-ready manifests or templates under `deploy/k8s/`:
   - deployment,
   - service,
   - config map/secret references,
   - worker deployment if jobs are implemented,
   - readiness/liveness probes.
5. Add `docs/ops/deployment.md`:
   - recommended practical path:
     1. Dockerized app,
     2. managed PostgreSQL,
     3. managed Redis,
     4. object storage/CDN,
     5. CI/CD with migrations and smoke tests,
     6. Kubernetes only when operationally justified.
6. Do not remove Vercel support unless the user explicitly asks for it.

Acceptance criteria:

- Docker build succeeds locally or documented blocker is explicit.
- Compose can start app dependencies for development/test, or blockers are documented.
- Kubernetes manifests are templates, not mandatory production truth.
- Environment variables are documented without real secrets.

Likely files:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `deploy/k8s/*`
- `docs/ops/deployment.md`

### Milestone 12: CI/CD And Operational Smoke

Goal: make deploys safer with repeatable checks.

Actions:

1. Add or update CI docs/workflows for:
   - install with frozen lockfile,
   - typecheck,
   - build,
   - DB schema check/generate drift check,
   - focused API tests,
   - smoke test after deploy.
2. Add a smoke-test script that can run against a base URL:
   - `/api/healthz`,
   - `/api/readyz`,
   - public storefront route for a known seeded tenant if configured,
   - CSRF token route,
   - no destructive order/payment actions by default.
3. Document migration strategy:
   - migrations run before app start or in CI/CD,
   - rollback limitations,
   - never run destructive migrations without backup/approval.

Acceptance criteria:

- Smoke script can run locally against the dev server and against a deployed base URL.
- CI/deployment docs are specific to this repo.
- Migration commands are documented with environment safety notes.

Likely files:

- `.github/workflows/*` if the project uses GitHub Actions
- `scripts/smoke.mjs`
- `docs/ops/deployment.md`
- `lib/db/MIGRATIONS.md`

## Required Test Plan

Run focused tests first after implementation:

```powershell
pnpm --filter @workspace/api-server exec vitest run src/test/health.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/storefront.test.ts src/test/orders.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/exports.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/products.test.ts src/test/customers.test.ts --fileParallelism=false
```

Add these as new tests when the corresponding implementation exists:

```powershell
pnpm --filter @workspace/api-server exec vitest run src/test/privacy.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/audit.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/jobs.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/cache.test.ts --fileParallelism=false
```

Run integration regression tests that Phase 7 must not break:

```powershell
pnpm --filter @workspace/api-server exec vitest run src/test/paymob.test.ts src/test/whatsapp.test.ts src/test/shipping.test.ts --fileParallelism=false
pnpm --filter @workspace/api-server exec vitest run src/test/ai-hardening.test.ts --fileParallelism=false
```

Run root gates:

```powershell
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/db run check
git diff --check
```

Run operational checks where possible:

```powershell
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Then from another shell or the smoke script:

```powershell
node scripts/smoke.mjs --base-url http://localhost:8080
```

If Docker is implemented:

```powershell
docker build -t nour-phase7 .
docker compose up --build
```

If any command cannot be run locally, Gemini must document why and what was run instead.

## Exit Criteria

Phase 7 can be marked complete only when:

- Hot read paths have measured before/after notes and no obvious unbounded/N+1 behavior remains.
- New DB indexes/migrations are generated and checked.
- Storefront listing/search/category counts remain correct and tenant-scoped.
- Admin order queue is paginated, searchable without in-memory full-list filtering, and tenant-scoped.
- Cache layer is safe, optional, covered by tests, and invalidated on product/category/storefront/tracking changes.
- Background job infrastructure exists for exports and at least one worker path is tested.
- Large exports do not require a long-held HTTP request.
- Backup/restore docs and non-production drill steps exist.
- `healthz` and `readyz` exist with tests and no secret leakage.
- Logs redact secrets and unnecessary PII.
- Compliance data map, retention policy, provider transfer register, and data-residency decision notes exist.
- Privacy export/delete or pseudonymization workflow exists for customer data and is cross-tenant tested.
- Consent/tracking behavior is explicit and tested where code changed.
- Critical mutations write audit events without secrets/full PII.
- Docker build/deployment readiness is implemented or blockers are documented.
- Focused tests, typecheck, build, DB check, and diff check pass.
- Codex review finds no P1/P2 blockers.

## Review Notes For Codex

When Gemini is done, review in this order:

1. Tenant isolation in new privacy, export, audit, job, cache, and health/provider endpoints.
2. Data leakage risk in logs, health output, audit metadata, CSV exports, privacy exports, and job errors.
3. Query correctness and pagination on storefront/admin order paths.
4. Cache invalidation and correctness-critical no-cache boundaries.
5. Background job idempotency, claim locking, retry behavior, and dead-letter behavior.
6. Compliance docs: whether they are codebase-specific and clearly mark legal-review items.
7. Docker/deployment changes: whether they preserve Vercel/local flows.
8. Test evidence and root gates.

Block merge for:

- any cross-tenant data leak,
- any secret/token/HMAC/payment payload exposed in logs or responses,
- any public unauthenticated privacy/audit/export/admin endpoint,
- any stale cache affecting checkout/payment/stock/provider state,
- any destructive retention/delete behavior without explicit review,
- any Phase 6 regression in Paymob, WhatsApp, Bosta, exports, or AI hardening.
