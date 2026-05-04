# Phase 1 SaaS Requirements: Pilot-Ready Marketplace Foundation

Status: Draft for engineering and QA review  
Owner: Product / Engineering  
Last updated: April 30, 2026  
Target stack: Next.js on Vercel, Supabase Postgres, Prisma, COD-first checkout, Paymob later, WhatsApp later  
Target market: Egyptian fashion and cosmetics merchants selling through Instagram, TikTok, WhatsApp, and COD

Companion execution docs:

- `docs/agent-operating-system.md`
- `docs/saas-foundation-decisions.md`
- `docs/backlog/phase-1-backlog.md`
- `docs/agent-state.md`

## 1. Product Intent

Phase 1 turns the app from a custom ecommerce project into a pilot-ready SaaS product that a small Egyptian merchant can use to:

- create a store,
- complete basic onboarding,
- add products and categories,
- receive COD orders,
- manage order status,
- operate in Arabic-first RTL screens,
- trust that their store data is isolated from other merchants.

The product is not considered Phase 1 complete until a merchant can go from signup to receiving and managing a real COD order without developer help.

## 2. Success Metrics

These metrics define whether Phase 1 is working as a SaaS foundation.

| Metric | Target | Measurement |
| --- | --- | --- |
| Merchant signup completion | 90% of pilot merchants can create a store without support | Browser flow and event/log review |
| Onboarding activation | 80% of pilot merchants complete store identity, homepage copy, first product, and shipping setup | Onboarding progress records |
| First order readiness | 100% of pilot stores can receive a COD order without data inconsistency | End-to-end smoke test |
| Tenant isolation | 0 known cross-tenant read/write paths | API tests and security review |
| Checkout correctness | 0 oversell or duplicated-order defects in pilot | Checkout tests and manual replay checks |
| Arabic usability | No visible mojibake or English in critical signup, admin, cart, or checkout paths | QA checklist |

Measurement note:

Phase 1 must include the minimal internal event/log baseline defined in `docs/saas-foundation-decisions.md` D1. External analytics providers are not required in Phase 1, but signup, onboarding, product creation, checkout, order creation, order status changes, admin activity, and checkout failures must be measurable.

## 3. Users

### Merchant Admin

Small fashion/cosmetics seller who needs a simple Arabic store, COD checkout, and order workflow.

### Shopper

Customer buying fashion/cosmetics products, usually on mobile, expecting COD and clear delivery details.

### Platform Operator

Internal operator who manages tenant status, support, plan limits, and launch diagnostics.

### QA / Tester

Tester verifying tenant boundaries, merchant flow, shopper flow, Arabic UX, and production readiness gates.

## 4. Non-Goals for Phase 1

The following are explicitly out of scope for Phase 1:

- live Paymob card/wallet checkout,
- official WhatsApp Business API automation,
- subscription billing automation,
- advanced analytics dashboards,
- SEO growth automation,
- multi-staff permissions beyond current admin/customer/platform concepts,
- custom domain self-service automation,
- shipping carrier integration,
- marketplace-wide shopper discovery.

Phase 1 may show disabled or "coming later" integration status, but must not imply that Paymob or WhatsApp live automation works.

## 5. Requirements

### R1. Merchant Signup and Tenant Provisioning

#### R1.1 Store creation

When a merchant signs up from the platform root, the system must create:

- one tenant,
- one tenant admin user,
- one onboarding progress record,
- default starter categories,
- a canonical tenant slug,
- a signed short-lived auth handoff token.

Acceptance criteria:

- Given a valid store name, slug, owner name, email, and password, the API returns `201`.
- Response includes `userId`, `shopUrl`, and `handoffToken`.
- The saved slug is normalized to lowercase and hyphen format.
- The merchant lands in the tenant admin onboarding flow after signup.

Test cases:

- valid merchant signup succeeds,
- missing shop name or slug returns `400`,
- reserved slug returns `400`,
- invalid slug characters return `400`,
- duplicate slug returns `400`,
- provisioning error returns generic `500` without stack/details.

#### R1.2 Auth handoff

After signup, the merchant must be signed in on the tenant host/context without exposing credentials in the URL.

Acceptance criteria:

- Handoff token is short-lived and signed.
- Token is passed in the URL hash, not query string.
- Handoff token is removed from browser URL after processing.
- Invalid, expired, tampered, or wrong-tenant tokens are rejected.

Test cases:

- valid handoff authorizes the merchant admin,
- tenant mismatch rejects,
- database user mismatch rejects,
- expired token rejects,
- tampered token rejects.

### R2. Tenant Isolation and Authorization

#### R2.1 Admin API tenant source

All tenant admin mutations must derive tenant ownership from the authenticated session, not from host/query/body alone.

Acceptance criteria:

- Admin user can read/write resources only for their session tenant.
- If request tenant and session tenant conflict, API returns `403`.
- Raw resource IDs cannot be used to mutate another tenant resource.

Test cases:

- admin product create uses session tenant,
- product update/delete rejects resource from another tenant,
- category create/list are session-tenant scoped,
- shop config update uses session tenant,
- order status update rejects another tenant order,
- user role update rejects another tenant user.

#### R2.2 Public tenant context

Public storefront APIs may resolve tenant by host or explicit tenant query, but must never use that context for admin authorization.

Acceptance criteria:

- Public product/category/shop-config reads resolve the correct tenant.
- Admin APIs still require authenticated session tenant.

### R3. Catalog Management

#### R3.1 Product creation

Merchant admin must be able to create a product with at least:

- name,
- slug,
- description,
- category,
- active status,
- one or more variants,
- price,
- stock,
- variant options such as size/color/shade,
- images when available.

Acceptance criteria:

- Product is created under the merchant tenant.
- Product appears on the merchant storefront only.
- Product does not appear on another tenant storefront.
- Product create fails if required fields are missing.
- Product create respects plan/product limits when limits are active.

Test cases:

- create product happy path,
- missing category rejected,
- duplicate slug in same tenant rejected,
- same slug in different tenant allowed,
- variant stock/price validation,
- plan product limit enforced.

#### R3.2 Product update and delete

Merchant admin must be able to edit and delete only tenant-owned products.

Acceptance criteria:

- Update by ID verifies tenant ownership.
- Delete by ID verifies tenant ownership.
- Deleted/inactive products cannot be purchased.

Test cases:

- update own product succeeds,
- update other tenant product returns `404` or `403`,
- delete own product succeeds,
- delete other tenant product returns `404` or `403`.

### R4. Cart Integrity

#### R4.1 Add to cart

Cart item creation must validate that the variant belongs to the current tenant.

Acceptance criteria:

- Shopper can add active in-stock variant from current tenant.
- Shopper cannot add variant from another tenant.
- Quantity must be positive.
- Quantity cannot exceed stock if stock checks are performed at cart time.

Test cases:

- add valid variant,
- reject cross-tenant variant,
- reject inactive product/variant,
- reject invalid quantity,
- update and remove cart item.

#### R4.2 Guest and user cart behavior

Guest cart must be stable using the guest session cookie. Logged-in customer cart must be tenant-scoped.

Acceptance criteria:

- Guest cart persists across refresh.
- Cart is scoped to tenant.
- Cart from one tenant does not appear in another tenant.

### R5. COD Checkout and Order Integrity

#### R5.1 Checkout validation

Checkout must validate:

- tenant context,
- non-empty cart,
- active products/variants,
- variant tenant ownership,
- sufficient stock,
- customer contact information,
- Egyptian phone format,
- governorate/area/city fields,
- shipping cost.

Acceptance criteria:

- Invalid checkout returns predictable `400` response.
- Response does not leak stack traces.
- Client sees actionable localized error.

Test cases:

- empty cart rejected,
- invalid phone rejected,
- missing governorate rejected,
- cross-tenant variant rejected,
- insufficient stock rejected.

#### R5.2 Atomic order creation

Checkout must be executed in a database transaction.

The transaction must:

- re-read cart/items from database,
- validate variants and stock,
- calculate subtotal server-side,
- calculate shipping server-side,
- create order,
- create order items,
- create initial status history,
- decrement stock,
- clear cart.

Acceptance criteria:

- If any step fails, no partial order is saved.
- Stock cannot go negative.
- Cart clears only after order creation succeeds.
- Order totals match server-side product prices, not client-provided totals.

Test cases:

- happy path creates order and decrements stock,
- failure during stock update rolls back order,
- repeated checkout does not duplicate order where idempotency exists,
- client-provided price/total is ignored.

### R6. Order Operations

#### R6.1 COD status workflow

Merchant admin must manage orders through these statuses:

- `NEW`
- `AWAITING_CONFIRMATION`
- `CONFIRMED`
- `DISPATCHED`
- `DELIVERED`
- `CANCELED`
- `RETURNED`

Acceptance criteria:

- New COD order appears in admin order queue.
- Status update is tenant-scoped.
- Status update writes status history.
- Order detail shows customer contact, address snapshot, items, subtotal, shipping, total, and current status.

Test cases:

- list own tenant orders,
- reject another tenant order,
- update status happy path,
- invalid status rejected,
- status history written.

#### R6.2 Contact workflow

Phase 1 must provide at minimum a click-to-WhatsApp or phone action using the order contact phone.

Acceptance criteria:

- Merchant can initiate contact from order detail/list.
- No automated WhatsApp provider is required in Phase 1.
- UI must not claim automated WhatsApp messages are live.

### R7. Merchant Onboarding

#### R7.1 Required setup steps

Onboarding must guide the merchant through:

1. Store identity
2. Homepage message
3. First product
4. Shipping setup
5. Integrations/payment status review
6. Launch review

Acceptance criteria:

- Each step has status: open/done.
- Each step is clickable and sends merchant to the correct section or page.
- Progress count reflects all six steps.
- Dashboard can route incomplete merchants back to onboarding.

Test cases:

- progress count updates,
- completed steps are detected from persisted progress and actual product/config data,
- step links preserve tenant context,
- incomplete admin redirects or prompts to onboarding.

### R8. Arabic-First UX

#### R8.1 Critical flow localization

These flows must be Arabic-first and RTL-safe:

- platform landing CTA to create store,
- merchant signup,
- auth handoff,
- onboarding,
- admin dashboard,
- product/category management,
- cart,
- checkout,
- order success,
- admin order list/detail.

Acceptance criteria:

- No mojibake in critical flows.
- No English labels/errors in critical Arabic flow unless intentionally branded.
- Form fields align correctly in RTL.
- URL/slug fields remain LTR where appropriate.
- Mobile viewport has no overlapping text/buttons.

Test cases:

- browser smoke at mobile width,
- Arabic language selected,
- checkout address form,
- admin onboarding,
- admin order queue.

### R9. Production Safety and Feature Gates

#### R9.1 Provider gating

Paymob and WhatsApp must be safe in production.

Acceptance criteria:

- Mock Paymob cannot be used in production unless explicitly enabled for a demo tenant.
- Mock WhatsApp cannot be used in production unless explicitly enabled for a demo tenant.
- UI labels integrations as disabled/not configured until live credentials and provider implementation are ready.

Test cases:

- production env with mock provider rejects or disables provider,
- integrations status returns safe disabled state,
- no merchant-facing production path throws placeholder errors.

#### R9.2 Remove unsafe launch artifacts

Acceptance criteria:

- `/api/admin/test` is removed or blocked before launch.
- Broad wildcard CORS is not returned unless explicitly required.
- Stripe shopper checkout/webhook messaging is hidden unless SaaS billing is implemented separately.

### R10. Observability and Operations

#### R10.1 Health and logs

Phase 1 must provide enough operational visibility for a small pilot.

Acceptance criteria:

- `/api/health` returns healthy status when app can serve.
- Signup, checkout, order status update, and provider errors are logged with useful context.
- Logs avoid sensitive data such as passwords, full auth tokens, and payment secrets.

#### R10.2 Deployment readiness

Acceptance criteria:

- Required production env vars are documented.
- Prisma migrations can run with `npx prisma migrate deploy`.
- Production boot does not require demo seed data.
- Rollback steps are documented.
- Backup/restore owner is identified for Supabase.

#### R10.3 Measurement baseline

Phase 1 must produce enough internal event/log data to verify signup, activation, checkout, and order operations metrics.

Acceptance criteria:

- Required Phase 1 events are emitted or recorded internally as defined in `docs/saas-foundation-decisions.md` D1.
- Shopper event payloads do not include raw phone or email.
- Server-side order events are emitted from trusted server paths.
- Checkout failure reasons are measurable without leaking stack traces or sensitive data.

Test cases:

- merchant signup completion is recorded,
- onboarding step completion is recorded,
- product creation is recorded,
- checkout started and COD order created are recorded,
- order status change is recorded,
- checkout failure is recorded safely,
- event payload tests reject raw shopper PII.

## 6. Browser Smoke Test Script

QA must verify this flow on a clean local or preview environment:

1. Open platform root.
2. Click create store.
3. Register merchant store.
4. Confirm final URL is tenant store/admin context.
5. Confirm onboarding loads.
6. Complete store identity.
7. Complete homepage message.
8. Add first category if needed.
9. Add first product with stock.
10. Open storefront product page.
11. Add product to cart.
12. Complete COD checkout with Egyptian phone and address.
13. Confirm success page shows order reference.
14. Open merchant admin order queue.
15. Confirm order appears.
16. Open order detail.
17. Update status to `CONFIRMED`.
18. Confirm status history/status display updates.

Expected result:

- No console errors in critical flow.
- No tenant mismatch.
- No stock inconsistency.
- No Arabic mojibake.
- No redirect loop to login after signup.

## 7. API Test Matrix

| Area | Required coverage |
| --- | --- |
| Auth/register | missing fields, weak password, customer signup, merchant signup, duplicate email, duplicate slug, reserved slug, generic 500 |
| Auth handoff | valid token, tampered token, expired token, wrong tenant, user mismatch |
| Admin auth | unauthenticated, wrong role, right role, tenant mismatch |
| Products | create/update/delete own tenant, reject other tenant, validation |
| Categories | create/list own tenant, reject other tenant where applicable |
| Cart | add valid variant, reject cross-tenant variant, invalid quantity, stock limit |
| Checkout | empty cart, invalid address/phone, insufficient stock, cross-tenant variant, atomic success |
| Orders | list own tenant, reject other tenant, update status, invalid status, status history |
| Providers | Paymob disabled/mock safety, WhatsApp disabled/mock safety |
| Health | healthy response, degraded response if applicable |
| Measurement | Phase 1 events, checkout failure reason, no raw shopper PII |

## 8. Launch Gate

Phase 1 is complete only when all gates are green.

### Code gate

```bash
npm run check
npm test -- --detectOpenHandles --forceExit
npm run build
```

### Security gate

- Tenant isolation tests pass.
- Admin APIs use session tenant.
- Cross-tenant resource mutation is rejected.
- No stack traces or sensitive details in API responses.
- No public admin test endpoint.

### Checkout gate

- COD checkout creates exactly one order.
- Stock decrements atomically.
- Cart clears after successful order.
- Failure does not leave partial order/items.

### UX gate

- Arabic critical flows are clean.
- Mobile RTL smoke pass is complete.
- Store signup and handoff do not redirect back to login.
- Onboarding steps are visible, clickable, and accurate.

### Operations gate

- Env vars documented.
- Migrations tested.
- Health check verified.
- Rollback plan documented.
- Dependency audit reviewed with fix or risk decision.
- Phase 1 measurement baseline verified.

## 9. Dependencies

- Supabase Postgres production database.
- Vercel project and environment variables.
- Stable platform domain and tenant subdomain routing.
- NextAuth secret and URL configuration.
- Prisma migration workflow.
- Decision on Redis/session/cart scaling if needed for pilot.

## 10. Known Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cross-tenant admin bug | Data leak, merchant trust failure | Session-tenant-only admin APIs and cross-tenant tests |
| Checkout oversell | Merchant loses money and trust | Transactional checkout and stock decrement tests |
| Arabic mojibake or mixed English | Low merchant confidence | Critical flow localization QA |
| Provider placeholders | False product promise | Hide or safely disable Paymob/WhatsApp live claims |
| Dependency advisories | Security/compliance risk | Upgrade, override, or explicit risk acceptance |
| Weak observability | Slow support during pilot | Structured logs, health checks, preview smoke process |

## 11. Phase 1 Done Definition

Phase 1 is done when:

- a new merchant can create a store,
- the merchant reaches onboarding without login bounce,
- the merchant can create a sellable product,
- a shopper can place a COD order,
- stock and order state remain correct,
- the merchant can manage the order,
- another tenant cannot access or mutate the data,
- Arabic critical flows are clean,
- all launch gates pass.
