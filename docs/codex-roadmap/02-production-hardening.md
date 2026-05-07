# Phase 2: Production Hardening

## Goal

Make the current `nour` foundation safe enough to build on. Focus on correctness and tenant safety before new features.

## Priority Fixes

1. Checkout tenant isolation:
   - Shopper must not be able to submit arbitrary `tenantId` and product ids from another tenant.
   - Derive tenant from storefront slug/domain or server-side cart/session context.
   - Product lookup must include tenant ownership.

2. Secure order tracking:
   - Public order tracking must not expose raw numeric ids.
   - Add tracking token or public order code.
   - Keep merchant/admin order access tenant-scoped.

3. Checkout transaction:
   - Validate cart items, tenant ownership, price, stock, shipping, discounts, and customer data.
   - Create order, items, status history, stock reservation/decrement, and cart conversion atomically.
   - Ensure stock cannot go negative.

4. Migrations:
   - Add real migration workflow for Drizzle/PostgreSQL.
   - Document migration commands.
   - Add rollback notes for risky migrations.

5. Env and production safety:
   - Required env validation at startup.
   - Mocks disabled in production.
   - Provider live/test modes explicit.
   - No secrets in client bundles or committed files.

6. Customization persistence:
   - Ensure `theme`, `secondaryColor`, logo, cover, favicon, SEO fields, social links, and tracking settings save and return correctly.

7. Rate limits and sessions:
   - Prefer Redis-backed/session-backed production limits.
   - Avoid pure in-memory rate limits for production-critical paths.

## Files To Inspect First

- `artifacts/api-server/src/routes/orders.ts`
- `artifacts/api-server/src/routes/storefront.ts`
- `artifacts/api-server/src/routes/store-settings.ts`
- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/routes/uploads.ts`
- `artifacts/api-server/src/middleware/require-role.ts`
- `lib/db/src/schema/orders.ts`
- `lib/db/src/schema/products.ts`
- `lib/db/src/schema/tenants.ts`
- `lib/db/src/schema/cart-sessions.ts`

## Tests To Add Or Strengthen

- Cross-tenant checkout is rejected.
- Product from tenant A cannot be ordered under tenant B.
- Stock cannot go negative under concurrent checkout.
- Public order tracking requires token/code.
- Merchant cannot read/update another tenant order.
- Theme/customization settings persist.
- Production mode rejects mock provider execution.

## API Test Matrix

Use existing test patterns if present. Prefer focused API tests with database side-effect assertions.

| Flow | Scenario | Expected Result |
| --- | --- | --- |
| Checkout | Tenant B submits Tenant A product id | 400/403, no order, no stock change. |
| Checkout | Quantity exceeds stock | 400/409, no order, no stock change. |
| Checkout | Valid COD order | Order, items, status history, stock update, customer snapshot all created atomically. |
| Checkout | Repeated/concurrent checkout | Stock never goes negative. |
| Order tracking | Raw numeric id without token | Rejected or no PII returned. |
| Merchant orders | Tenant A merchant reads Tenant B order | 403/404. |
| Merchant orders | Tenant A merchant updates Tenant B order | 403/404 and no mutation. |
| Store settings | Save theme and secondary color | Values persist and storefront API returns them. |
| Production safety | Missing live provider env in production | App fails closed or provider disabled explicitly. |

## Exit Criteria

This phase is complete when checkout/order/tenant-isolation risks are fixed, migrations exist, and the app can pass typecheck/build/test gates.
