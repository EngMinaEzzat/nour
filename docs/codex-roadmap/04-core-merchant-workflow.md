# Phase 4: Core Merchant Workflow

## Goal

Make the daily merchant workflow excellent before expanding growth automation.

## Users

- Merchant owner.
- Merchant staff/manager.
- Shopper.
- Platform operator.

## Priority Workflows

1. Onboarding:
   - Store profile.
   - Branding.
   - Shipping setup.
   - First product.
   - COD/payment settings.
   - SEO basics.
   - Launch readiness checklist.

2. Product management:
   - Product creation.
   - Variants/SKUs.
   - Stock.
   - Categories.
   - Images.
   - AI product description assist.

3. Storefront preview:
   - Theme preview.
   - Mobile preview.
   - Logo/colors.
   - SEO/social preview.

4. COD checkout:
   - Egyptian phone validation.
   - Governorate/shipping selection.
   - Trust-building order summary.
   - Minimal steps.
   - WhatsApp/contact follow-up.

5. Order operations:
   - Order queue.
   - Status transitions.
   - Contact attempts.
   - Notes.
   - Returns/exchanges.
   - Stock restoration where required.

6. Growth basics:
   - Discounts.
   - Reviews.
   - Abandoned carts.
   - Basic analytics.

## UX Rules

- Arabic-first and RTL by default.
- Use logical spacing/direction styles where possible.
- Mobile storefront and checkout must feel app-like.
- Admin screens should be dense, operational, and scannable.
- Do not add decorative marketing pages instead of real workflows.

## Files To Inspect First

- `artifacts/fashion-store/src/pages/setup.tsx`
- `artifacts/fashion-store/src/pages/products.tsx`
- `artifacts/fashion-store/src/pages/store-settings.tsx`
- `artifacts/fashion-store/src/pages/storefront.tsx`
- `artifacts/fashion-store/src/pages/checkout.tsx`
- `artifacts/fashion-store/src/pages/orders.tsx`
- `artifacts/fashion-store/src/pages/order-detail.tsx`
- `artifacts/api-server/src/routes/onboarding.ts`
- `artifacts/api-server/src/routes/products.ts`
- `artifacts/api-server/src/routes/orders.ts`

## Tests And Smoke Flows

- Browser smoke: merchant registers/logs in, completes onboarding, creates first product, previews storefront.
- Browser smoke: shopper opens storefront on mobile width, adds item to cart, completes COD checkout.
- Browser smoke: merchant sees new order, records contact attempt, changes order status.
- API test: product creation validates tenant ownership and required fields.
- API test: order status transitions are allowed only for the tenant merchant.
- UI check: core flows are Arabic/RTL and fit on 360px mobile width.
- UI check: empty/loading/error states exist for setup, products, orders, and storefront.

## Exit Criteria

This phase is complete when a pilot merchant can launch a store, add products, receive COD orders, process orders, and use basic growth tools without manual developer help.
