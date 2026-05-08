# Foundation Reality Check

Date: 2026-05-08
Environment: Windows PowerShell, pnpm 10.33.2
Status: NEEDS WORK

Decision: continue hardening `C:\proj\nour`. The current stack is substantially healthier than the earlier foundation report: install, typecheck, build, API tests, Drizzle check, and a production-mode health smoke all pass locally. The remaining blockers are concrete stabilization/security issues, not evidence that Nour must be replaced or migrated to Next.js/NestJS.

## Command Results

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS with CI caveat | The first non-interactive run failed with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` because pnpm wanted to purge `node_modules`. Rerun with `CI=true` passed: lockfile current, 640 packages linked. Caveat: pnpm ignored build scripts for `@google/genai@1.51.0` and `protobufjs@7.5.6`. |
| `pnpm run typecheck` | PASS | Root typecheck passed: `typecheck:libs`, API server, fashion-store, mockup-sandbox, and scripts all completed. Root script is at `package.json:9`; API script is at `artifacts/api-server/package.json:10`. |
| `pnpm -r --if-present run build` | PASS with warnings | Workspace build passed for mockup-sandbox, API server, and fashion-store. Warnings remain for sourcemap lookup in several UI wrappers and one frontend chunk over 500 KB. |
| `pnpm -r --if-present test` | PASS | API server Vitest run passed: 17 test files, 203 tests. Test script is at `artifacts/api-server/package.json:11`. |
| `pnpm audit --prod` | FAIL | One moderate production advisory: `ip-address <=10.1.0` via `artifacts__api-server > express-rate-limit > ip-address`; patched in `ip-address >=10.1.1`. `express-rate-limit` is declared at `artifacts/api-server/package.json:27`. |
| `pnpm --filter @workspace/db run check` | PASS | Drizzle reported `Everything's fine`. Drizzle config points at `lib/db/src/schema/index.ts` and `lib/db/drizzle` at `lib/db/drizzle.config.ts:10` to `lib/db/drizzle.config.ts:16`. |
| Production-mode API start smoke | PASS with env caveat | Built API started with `NODE_ENV=production` on port `18080`; `GET /api/healthz` returned `200 {"status":"ok"}`. This proves the app can start without seed/demo data for health, but the local run used env discovery behavior described below. |

## Required Checks

| Check | Status | Evidence |
| --- | --- | --- |
| Clean install | PASS with CI caveat | `CI=true pnpm install --frozen-lockfile` passes. Bare non-TTY install can still fail if pnpm decides to purge modules. |
| Typecheck | PASS | `pnpm run typecheck` completed successfully. |
| Build | PASS | `pnpm -r --if-present run build` completed successfully. |
| Tests | PASS | `pnpm -r --if-present test` completed with 203 passing API tests. |
| Dependency audit | FAIL | One moderate production vulnerability remains in `ip-address` through `express-rate-limit`. |
| Real migrations | PASS with operational caveat | `lib/db/drizzle/0000_busy_mentallo.sql` exists, journal metadata exists at `lib/db/drizzle/meta/_journal.json:4`, and `drizzle-kit check` passed. `lib/db/MIGRATIONS.md:13` to `lib/db/MIGRATIONS.md:15` correctly warns not to blindly apply the baseline to populated databases. I did not run `migrate` against the configured database during this reality check. |
| App starts without seed/demo assumptions | PASS for health | Production-mode API health starts and responds. No seed dependency was found in the inspected entrypoints. |
| Production disables mocks/demo behavior | PARTIAL | `app.ts` fails production startup if `PAYMOB_ALLOW_MOCKS=true` at `artifacts/api-server/src/app.ts:23` to `artifacts/api-server/src/app.ts:30`, and Paymob initiation rejects missing live credentials in production at `artifacts/api-server/src/routes/paymob.ts:132` to `artifacts/api-server/src/routes/paymob.ts:135`. However, the Paymob webhook route is probably blocked by production CSRF before HMAC can run. |

## Blocking Issues

### Critical

1. Paymob production webhook appears unreachable because CSRF exemptions do not match the registered route.
   The webhook is registered as `POST /paymob/webhook` under the `/api` router at `artifacts/api-server/src/routes/paymob.ts:195` to `artifacts/api-server/src/routes/paymob.ts:196`. Production CSRF runs before `/api` routes at `artifacts/api-server/src/app.ts:122` to `artifacts/api-server/src/app.ts:132`, but exemptions only include `/api/paymob/callback`, `/api/paymob/hmac-verify`, and WhatsApp prefixes at `artifacts/api-server/src/lib/csrf.ts:22` to `artifacts/api-server/src/lib/csrf.ts:30`. Result: real Paymob callbacks likely fail CSRF before the production HMAC guard at `artifacts/api-server/src/routes/paymob.ts:201` to `artifacts/api-server/src/routes/paymob.ts:240`.

2. Local env discovery can load `.env.test` outside test mode.
   `loadWorkspaceEnv()` always includes `.env.test` after `.env` at `lib/db/src/env.ts:16` to `lib/db/src/env.ts:21`. The DB package calls this at import time at `lib/db/src/index.ts:8`, and production-mode local smoke succeeded with only root `.env.test` present. In real deployment explicit environment variables should win, but local/staging production checks can accidentally use test credentials unless this fallback is tightened.

### High

3. Tests mutate the configured Postgres database directly.
   Test env setup only supplies `NODE_ENV=test` and a fallback `SESSION_SECRET` at `artifacts/api-server/src/test/env-setup.ts:1` to `artifacts/api-server/src/test/env-setup.ts:5`. Helpers create real tenants through `/api/auth/register` at `artifacts/api-server/src/test/helpers.ts:28` to `artifacts/api-server/src/test/helpers.ts:55` and cleanup by deleting tenant-linked rows at `artifacts/api-server/src/test/helpers.ts:105` to `artifacts/api-server/src/test/helpers.ts:132`. This is acceptable for a dedicated test DB, but dangerous if `DATABASE_URL` points at shared staging or production data.

4. Product category ownership is not proven or enforced in the inspected product create/update path.
   Product creation writes `tenantId` from the session at `artifacts/api-server/src/routes/products.ts:197` to `artifacts/api-server/src/routes/products.ts:205`, but the inspected route does not prove `categoryId` belongs to the same tenant before insert/update. Category FK is nullable and tenant-scoped at `lib/db/src/schema/categories.ts:10`; product `categoryId` only references category id at `lib/db/src/schema/products.ts:13` to `lib/db/src/schema/products.ts:14`. This needs a test and likely a route guard.

5. Variant stock integrity is incomplete.
   Variant create/update routes check product ownership through the parent product at `artifacts/api-server/src/routes/products.ts:296` to `artifacts/api-server/src/routes/products.ts:317` and `artifacts/api-server/src/routes/products.ts:324` to `artifacts/api-server/src/routes/products.ts:351`, but there is no visible negative-stock guard in those handlers and no checkout path consumes variant IDs. The schema has variant stock at `lib/db/src/schema/products.ts:35` to `lib/db/src/schema/products.ts:42`, while checkout combines only `productId` and `quantity` at `artifacts/api-server/src/routes/orders.ts:42` to `artifacts/api-server/src/routes/orders.ts:53`.

6. Platform Paymob reconciliation bypasses the DB-backed platform-admin middleware.
   Most platform admin checks should use `requirePlatformAdmin`, which validates the merchant in DB at `artifacts/api-server/src/middleware/require-role.ts:126` to `artifacts/api-server/src/middleware/require-role.ts:145`. `/paymob/reconciliation` instead checks `req.session?.isPlatformAdmin` directly at `artifacts/api-server/src/routes/paymob.ts:340` to `artifacts/api-server/src/routes/paymob.ts:342`, while auth register/login sets `req.session.merchantId` but not `isPlatformAdmin` at `artifacts/api-server/src/routes/auth.ts:142` and `artifacts/api-server/src/routes/auth.ts:189`.

### Medium

7. Public product listing can return unscoped data when no tenant is supplied.
   Public `GET /products` derives `effectiveTenantId` from session or query at `artifacts/api-server/src/routes/products.ts:131` to `artifacts/api-server/src/routes/products.ts:139`. Without session and without `tenantId`, the query has no tenant condition. This may be intended as marketplace discovery, but the product goal is tenant storefronts, so the exposure should be explicitly decided and tested.

8. Production frontend build still has performance/debuggability warnings.
   The fashion-store build passes, but Vite reports sourcemap location warnings in several UI wrappers and a main chunk over 500 KB. Phase 3 performance passed warm LCP smoke, so this is not currently a launch blocker, but it remains a maintenance/performance risk.

9. Some workspace scripts remain non-portable.
   Root scripts are now cross-platform, but API `dev` still uses Unix-style `export NODE_ENV=development` at `artifacts/api-server/package.json:7`. This does not block the required Phase 4 command gates, but it will bite Windows developers running the package script directly.

### Low

10. Dependency hardening is mostly good but not complete.
   `pnpm-workspace.yaml:28` enables `minimumReleaseAge: 1440`, and dependency overrides exist for several historical advisories at `pnpm-workspace.yaml:157` to `pnpm-workspace.yaml:171`. The remaining `ip-address` advisory should still be resolved before real merchant onboarding.

11. `rg` failed locally with `Access is denied`.
   Native PowerShell enumeration was used instead. This did not block the audit, but it is worth checking developer tooling permissions if repeated.

## Test Inventory

| Area | Existing evidence | Missing gaps |
| --- | --- | --- |
| Auth/RBAC | Registration, login, logout, password reset, unauthenticated cases, subscription gates, and platform-admin denials exist at `artifacts/api-server/src/test/auth.test.ts:4`, `artifacts/api-server/src/test/auth.test.ts:115`, `artifacts/api-server/src/test/auth.test.ts:211`, `artifacts/api-server/src/test/middleware.test.ts:8`, `artifacts/api-server/src/test/middleware.test.ts:54`, and `artifacts/api-server/src/test/middleware.test.ts:136`. | Platform-admin success path, full wrong-role matrix for staff/catalog/order roles, and direct coverage for DB-backed platform-admin middleware on all platform routes. |
| Tenant isolation | Product, customer, order, and analytics isolation tests exist at `artifacts/api-server/src/test/middleware.test.ts:165`, `artifacts/api-server/src/test/products.test.ts:97`, `artifacts/api-server/src/test/orders.test.ts:117`, and `artifacts/api-server/src/test/security.test.ts:11`. | Provider/config isolation, category ownership, variant ownership tests, and tenant scope across every admin resource. |
| Checkout | COD creation, server item/status response, stock decrement, cancel stock restore, cross-tenant product rejection, insufficient stock rejection, and tokenized public tracking tests exist at `artifacts/api-server/src/test/orders.test.ts:22`, `artifacts/api-server/src/test/orders.test.ts:32`, `artifacts/api-server/src/test/orders.test.ts:40`, `artifacts/api-server/src/test/orders.test.ts:127`, `artifacts/api-server/src/test/orders.test.ts:187`, `artifacts/api-server/src/test/orders.test.ts:208`, and `artifacts/api-server/src/test/orders.test.ts:226`. | Concurrent checkout race tests, variant checkout behavior, shipping/discount total calculation tests, and Paymob reservation expiry/release tests. |
| Orders | Authenticated list/update routes are tenant-scoped at `artifacts/api-server/src/routes/orders.ts:214` to `artifacts/api-server/src/routes/orders.ts:224`, `artifacts/api-server/src/routes/orders.ts:563` to `artifacts/api-server/src/routes/orders.ts:574`, and `artifacts/api-server/src/routes/orders.ts:584` to `artifacts/api-server/src/routes/orders.ts:610`. Tests cover list, update, cross-tenant update denial, and public token tracking at `artifacts/api-server/src/test/orders.test.ts:49`, `artifacts/api-server/src/test/orders.test.ts:90`, `artifacts/api-server/src/test/orders.test.ts:117`, and `artifacts/api-server/src/test/orders.test.ts:226`. | Invalid status transition matrix, role-specific order permissions, and contact-attempt cross-tenant tests. |
| Products/variants | Product CRUD, tenant-scoped list, cross-tenant update/delete denial, and negative price/stock validation tests exist at `artifacts/api-server/src/test/products.test.ts:13`, `artifacts/api-server/src/test/products.test.ts:22`, `artifacts/api-server/src/test/products.test.ts:97`, `artifacts/api-server/src/test/products.test.ts:108`, `artifacts/api-server/src/test/security.test.ts:124`, and `artifacts/api-server/src/test/security.test.ts:133`. | Variant create/update/delete tests, negative variant stock tests, category ownership tests, and public inactive/hidden product visibility tests. |
| Webhooks/providers | Paymob production mock safety test exists at `artifacts/api-server/src/test/paymob.test.ts:7` to `artifacts/api-server/src/test/paymob.test.ts:21`. Paymob code has production live-credential gating and HMAC/idempotency paths at `artifacts/api-server/src/routes/paymob.ts:132` to `artifacts/api-server/src/routes/paymob.ts:154` and `artifacts/api-server/src/routes/paymob.ts:195` to `artifacts/api-server/src/routes/paymob.ts:323`. | Paymob webhook HMAC success/failure tests, CSRF exemption test for webhook route, replay/idempotency tests, failed-payment stock restore test, WhatsApp webhook/provider tests, and reconciliation access tests. |
| SEO/storefront | SSR tests cover store/product/category HTML, sitemap, canonical custom domain, and robots at `artifacts/api-server/src/test/seo-public.test.ts:18`, `artifacts/api-server/src/test/seo-public.test.ts:59`, `artifacts/api-server/src/test/seo-public.test.ts:74`, `artifacts/api-server/src/test/seo-public.test.ts:88`, `artifacts/api-server/src/test/seo-public.test.ts:100`, `artifacts/api-server/src/test/seo-public.test.ts:112`, and `artifacts/api-server/src/test/seo-public.test.ts:125`. | Browser-level crawled HTML checks in deployment, inactive/hidden product exclusion tests outside the SEO path, and ongoing Core Web Vitals budget tests. |
| Arabic/mobile | Phase 3 status records mobile CDP smoke with warmed LCP under 2.5s and checkout CTA rendering. API tests include Arabic/unicode product name acceptance at `artifacts/api-server/src/test/edge-cases.test.ts:36`. | Automated mobile viewport regression, RTL keyboard/accessibility tests, Arabic mojibake checks in rendered admin/provider pages, and checkout form mobile usability tests. |

## Recommended Fix Order

1. Fix the Paymob webhook CSRF exemption and add a production-mode test proving `/api/paymob/webhook` reaches HMAC validation without CSRF.
2. Tighten env loading so `.env.test` is only loaded under `NODE_ENV=test`, then rerun production-mode local smoke with explicit production-like env variables.
3. Add a hard guard that tests refuse to run unless `DATABASE_URL` clearly points to a dedicated test database.
4. Add category ownership checks for product create/update and tests for cross-tenant category IDs.
5. Add variant CRUD tests and reject negative variant stock; decide whether checkout supports variants or explicitly hides variants from launch scope.
6. Replace the Paymob reconciliation session flag check with `requirePlatformAdmin` and add platform-admin success/failure tests.
7. Resolve the `ip-address` audit advisory through dependency override or upstream package update.
8. Decide whether public `/api/products` without tenant is intentional marketplace discovery; if not, require tenant/store context.
9. Clean up frontend chunk/sourcemap warnings and the Windows-hostile API `dev` script.

## Final Decision

Continue with `C:\proj\nour` as the base. Do not migrate to Next.js/NestJS in Phase 4. The foundation now passes core local gates, but it remains `NEEDS WORK` before real production onboarding because payment webhook reachability, env/test safety, provider admin access, and product/variant ownership gaps need focused hardening.
