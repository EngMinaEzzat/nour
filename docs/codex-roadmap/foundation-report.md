# Foundation Reality Check

Date: 2026-05-07
Environment: Windows PowerShell, Node.js v24.12.0, pnpm 10.33.2
Status: NEEDS WORK

Decision: continue hardening `C:\proj\nour`. Phase 1 found serious foundation blockers, but they are stabilization issues in the current stack, not evidence that Nour must be replaced or migrated to Next.js/NestJS.

## Command Results

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | FAIL | Lockfile was current, but root `preinstall` calls `sh`, which is not available in Windows PowerShell. See `package.json:6`. The workspace also excludes Windows native optional packages, including Rollup, at `pnpm-workspace.yaml:78`, `pnpm-workspace.yaml:98`, `pnpm-workspace.yaml:113`, `pnpm-workspace.yaml:122`, and `pnpm-workspace.yaml:147`. |
| `pnpm run typecheck` | FAIL | `@workspace/api-server` fails TypeScript. Major groups: Express request augmentation not applied at many `req.merchantTenantId` sites, `express-rate-limit` `ipKeyGenerator` misuse, product status enum drift, and many `noImplicitReturns` route handlers. See examples at `artifacts/api-server/src/routes/analytics.ts:14`, `artifacts/api-server/src/lib/rate-limiters.ts:14`, `lib/api-zod/src/generated/api/api.ts:422`, and `lib/db/src/schema/products.ts:7`. |
| `pnpm -r --if-present run build` | FAIL | Vite/Rollup fails in `artifacts/mockup-sandbox` because `@rollup/rollup-win32-x64-msvc` is missing. The workspace override removes it at `pnpm-workspace.yaml:147`. |
| `pnpm -r --if-present test` | FAIL | Vitest startup fails before tests run with the same missing Rollup Windows native package. |
| `pnpm audit --prod` | FAIL | One moderate production vulnerability: `ip-address <=10.1.0` via `artifacts__api-server > express-rate-limit > ip-address`; patched in `ip-address >=10.1.1`. |
| `pnpm --filter @workspace/api-server run start` | FAIL | Extra start probe fails fast because `DATABASE_URL` is missing. The fail-fast check is at `lib/db/src/index.ts:7`. This does not prove the app can start in a configured environment because build/test are already blocked. |

## Required Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Clean install | FAIL | Windows lifecycle and native optional dependency blockers: `package.json:6`, `pnpm-workspace.yaml:147`. |
| Typecheck | FAIL | API server does not typecheck. Intended augmentation exists at `artifacts/api-server/src/types/session.d.ts:10`, but use sites fail, such as `artifacts/api-server/src/routes/orders.ts:414` and `artifacts/api-server/src/routes/products.ts:230`. |
| Build | FAIL | Rollup optional native package missing before app build can be evaluated. |
| Tests | FAIL | Vitest cannot start because Rollup optional native package is missing. Test inventory below is static inspection only. |
| Audit | FAIL | One moderate production advisory through `express-rate-limit`. |
| Real migrations | FAIL | `lib/db/src/schema` exists and Drizzle config points at schema (`lib/db/drizzle.config.ts:9`), but no migration output directory exists under `lib/db`; DB package exposes only `push` and `push-force` at `lib/db/package.json:11` and `lib/db/package.json:12`. |
| App starts without seed/demo assumptions | NOT PROVEN | Entry points require environment variables: `DATABASE_URL` at `lib/db/src/index.ts:7`, `SESSION_SECRET` at `artifacts/api-server/src/app.ts:18`, and `PORT` at `artifacts/api-server/src/index.ts:7`. No seed dependency was found in the inspected entrypoints, but a configured start was not proven. |
| Production disables mocks/demo behavior | FAIL | Auth bootstrap is disabled in production (`artifacts/api-server/src/routes/auth.ts:226`), and WhatsApp/Bosta report unconfigured rather than pretending to send (`artifacts/api-server/src/lib/whatsapp.ts:116`, `artifacts/api-server/src/routes/shipping.ts:19`). Paymob still has demo behavior and unsafe webhook/payment paths: `artifacts/api-server/src/routes/paymob.ts:99`, `artifacts/api-server/src/routes/paymob.ts:119`, `artifacts/api-server/src/routes/paymob.ts:175`, `artifacts/api-server/src/routes/paymob.ts:199`. |

## Blocking Issues

### Critical

1. Windows install/build/test foundation is broken.
   - `package.json:6` uses a Unix shell in `preinstall`.
   - `pnpm-workspace.yaml:78` says non-Linux native packages are excluded, and `pnpm-workspace.yaml:147` removes Rollup's Windows native package.
   - Result: clean install, build, and tests cannot pass in the current Windows workspace. Either make the workspace portable or formally make WSL/Linux CI the canonical environment.

2. API server does not typecheck.
   - Request augmentation exists at `artifacts/api-server/src/types/session.d.ts:10`, but API routes still fail on `req.merchantTenantId`, for example `artifacts/api-server/src/routes/orders.ts:414` and `artifacts/api-server/src/routes/products.ts:230`.
   - `express-rate-limit` calls `ipKeyGenerator(req)` at `artifacts/api-server/src/lib/rate-limiters.ts:14`; the current type expects an IP string.
   - Product status schemas disagree: API create allows `draft` and `archived` at `lib/api-zod/src/generated/api/api.ts:422`, while DB allows only `active`, `out_of_stock`, and `hidden` at `lib/db/src/schema/products.ts:7`.

3. Checkout can create cross-tenant or inconsistent orders.
   - Public checkout accepts `tenantId` from the body at `artifacts/api-server/src/routes/orders.ts:285`.
   - It fetches products only by product id at `artifacts/api-server/src/routes/orders.ts:321`, with no `product.tenantId === parsed.data.tenantId` check before inserting the order tenant at `artifacts/api-server/src/routes/orders.ts:341`.
   - Stock decrement is conditional at `artifacts/api-server/src/routes/orders.ts:373` and `artifacts/api-server/src/routes/orders.ts:376`, but the code does not verify that every update affected a row before committing the order.
   - Variant stock cannot be checked because checkout order items accept only `productId` and `quantity` at `lib/api-zod/src/generated/api/api.ts:721`.

4. Paymob/provider path is not production safe.
   - `/paymob/initiate` trusts `amount` from the request at `artifacts/api-server/src/routes/paymob.ts:99`.
   - It returns a `DEMO_TOKEN` iframe URL at `artifacts/api-server/src/routes/paymob.ts:119`.
   - Webhook idempotency keys are generated as `paymob-wh-${transactionId}` at `artifacts/api-server/src/routes/paymob.ts:175`, but payment records were created with `${tenantId}-${orderId}-${Date.now()}` at `artifacts/api-server/src/routes/paymob.ts:107`; successful webhooks therefore cannot reliably update the initiated payment record at `artifacts/api-server/src/routes/paymob.ts:199`.
   - The alternate `/payments/paymob/webhook` route verifies HMAC only when `PAYMOB_HMAC_SECRET` is set (`artifacts/api-server/src/routes/payments.ts:63`), and updates orders by id without tenant/provider reconciliation at `artifacts/api-server/src/routes/payments.ts:91`.

### High

5. There are no reviewable DB migrations.
   - `lib/db/drizzle.config.ts:9` points directly at schema.
   - `lib/db/package.json:11` and `lib/db/package.json:12` expose `drizzle-kit push` and `push-force`, not generated migration application. This is too risky for production schema changes.

6. Public order lookup exposes sequential order IDs.
   - `GET /orders/:id` is public at `artifacts/api-server/src/routes/orders.ts:404`.
   - The code explicitly allows unauthenticated callers at `artifacts/api-server/src/routes/orders.ts:412`, and the test asserts any agent can read by id at `artifacts/api-server/src/test/orders.test.ts:110`.
   - Public tracking needs a non-guessable token or equivalent proof, not only a numeric order id.

7. Storefront API does not filter public products to active status.
   - Storefront product conditions start with tenant only at `artifacts/api-server/src/routes/storefront.ts:23`.
   - Product status is selected at `artifacts/api-server/src/routes/storefront.ts:36`, but no `status = active` filter is applied before `artifacts/api-server/src/routes/storefront.ts:40`.

8. Existing tests cannot currently protect the foundation.
   - The suite cannot run because of Rollup optional dependency failure.
   - Even if startup is fixed, the inspected test files do not cover Paymob/WhatsApp webhooks, checkout product tenant ownership, insufficient stock, variant checkout, category ownership, or browser-level Arabic/mobile behavior.

### Medium

9. Production runtime configuration is scattered.
   - `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `ALLOWED_ORIGINS`, provider keys, and app URLs are read directly in multiple modules (`lib/db/src/index.ts:7`, `artifacts/api-server/src/app.ts:18`, `artifacts/api-server/src/index.ts:7`, `artifacts/api-server/src/app.ts:71`).
   - There is no single typed env validation path, so production readiness depends on runtime surprises.

10. Production frontend serving is unclear.
   - `artifacts/api-server/src/app.ts:130` says production serves the built frontend as static files, but the inspected code only serves uploads at `artifacts/api-server/src/app.ts:107` and only defines a dev proxy under `artifacts/api-server/src/app.ts:133`.
   - If the frontend is intended to deploy separately, document that explicitly; if Express is intended to serve it, implement and test it.

11. SEO is client-side only in the Vite app.
   - Vite build scripts are at `artifacts/fashion-store/package.json:7` and `artifacts/fashion-store/package.json:8`.
   - Store/product metadata is updated after client render through `document.title` and DOM meta mutation at `artifacts/fashion-store/src/hooks/use-page-meta.ts:61`.
   - This is better than no metadata for humans, but it is not SSR/static HTML evidence for crawlers.

### Low

12. One moderate production dependency advisory remains.
   - `pnpm audit --prod` reports `ip-address` via `express-rate-limit`. This should be fixed after the install graph is stable.

## Test Inventory

Existing test inventory is based on static file inspection because `pnpm -r --if-present test` cannot start.

| Area | Existing evidence | Missing gaps |
| --- | --- | --- |
| Auth/RBAC | Registration/login/password reset in `artifacts/api-server/src/test/auth.test.ts:4`; unauthenticated and platform-admin denial cases in `artifacts/api-server/src/test/middleware.test.ts:8` and `artifacts/api-server/src/test/middleware.test.ts:136`. | Full wrong-role matrix, platform-admin success path, staff role boundaries for catalog/order operations. |
| Tenant isolation | Product list/update/delete and customer/order isolation checks around `artifacts/api-server/src/test/middleware.test.ts:165`, `artifacts/api-server/src/test/products.test.ts:97`, and `artifacts/api-server/src/test/orders.test.ts:118`. | Checkout product ownership, tenant-scoped reads/mutations across all admin resources, provider/config isolation, category ownership. |
| Checkout | COD order creation, order items/status history, stock decrement, cancel restore, and basic invalid inputs in `artifacts/api-server/src/test/orders.test.ts:22`, `artifacts/api-server/src/test/orders.test.ts:40`, `artifacts/api-server/src/test/orders.test.ts:128`, and `artifacts/api-server/src/test/orders.test.ts:144`. | Product tenant ownership, insufficient stock, concurrent stock race/update row count, variant stock, Paymob reservation expiry/release, server-calculated shipping/discount totals. |
| Orders | List/read/update/status examples and tenant-scoped update at `artifacts/api-server/src/test/orders.test.ts:49`, `artifacts/api-server/src/test/orders.test.ts:90`, and `artifacts/api-server/src/test/orders.test.ts:118`. | Tokenized public tracking safety, invalid status transitions, role-specific update permissions, contact-attempt tenant tests beyond happy path. |
| Products/variants | Product CRUD and cross-tenant update/delete in `artifacts/api-server/src/test/products.test.ts:13`, `artifacts/api-server/src/test/products.test.ts:97`, and `artifacts/api-server/src/test/products.test.ts:108`. | Variant create/update/delete ownership tests, variant stock limits, category ownership checks, inactive product storefront exclusion. |
| Webhooks/providers | No Paymob/WhatsApp webhook tests found. Search for `paymob`, `webhook`, and `HMAC` in `artifacts/api-server/src/test/*.test.ts` found no provider tests. | Paymob HMAC required in production, idempotency, webhook replay, payment/order reconciliation, mock/demo gating, WhatsApp configured/unconfigured send behavior. |
| SEO/storefront | Storefront API tests exist at `artifacts/api-server/src/test/storefront.test.ts:21`; client metadata hook exists at `artifacts/fashion-store/src/hooks/use-page-meta.ts:53`; store page uses it at `artifacts/fashion-store/src/pages/storefront.tsx:803`; product page uses it at `artifacts/fashion-store/src/pages/product-detail.tsx:92`. | SSR/static HTML metadata tests, JSON-LD browser/crawler smoke, active-only product data, sitemap/canonical tests. |
| Arabic/mobile | HTML has `lang="ar"` and `dir="rtl"` at `artifacts/fashion-store/index.html:2`; many critical pages set RTL direction, for example `artifacts/fashion-store/src/pages/storefront.tsx:146` and `artifacts/fashion-store/src/pages/order-track.tsx:81`. | Automated mobile viewport tests, checkout/admin RTL visual regression, accessibility/keyboard checks, Arabic mojibake checks in rendered UI. |

## Recommended Fix Order

1. Decide and document the canonical build environment. If Windows remains supported, replace the Unix-only preinstall and stop excluding Windows native optional dependencies; then reinstall cleanly. If WSL/Linux is canonical, add a clear local/CI instruction and run the Phase 1 commands there.
2. Restore API typecheck: fix Express request augmentation, `ipKeyGenerator`, schema/API enum drift, and route return typing.
3. Add generated, reviewable Drizzle migrations and a safe migration-apply path. Do not rely on `push-force` for production.
4. Fix checkout correctness: enforce product tenant ownership, verify stock update row counts inside the transaction, add insufficient-stock and cross-tenant tests, and decide how variants participate in checkout.
5. Disable or remove Paymob demo behavior from production paths; require HMAC in production; repair idempotency/payment-record correlation; calculate payment amounts server-side from the order.
6. Replace public numeric order tracking with a non-guessable tracking token or signed proof.
7. Make storefront/public product APIs filter to active storefront-visible products and add tests.
8. Make the existing test suite runnable, then expand the required risk-area tests before Phase 2 feature work.
9. Centralize env validation and document required production variables.
10. Fix the `ip-address` audit advisory after dependency portability is resolved.

## Final Decision

Use `C:\proj\nour` as the base and continue to Phase 2 hardening after the Phase 1 blockers are accepted. Do not migrate to Next.js/NestJS yet. The current stack is not production-ready, but the failures are concrete and fixable.
