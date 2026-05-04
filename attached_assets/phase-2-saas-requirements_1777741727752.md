# Phase 2 SaaS Requirements: Paid SaaS Core

Status: Draft for engineering and QA review  
Owner: Product / Engineering  
Last updated: April 30, 2026  
Depends on: Phase 1 SaaS Requirements complete or accepted as pilot-ready with documented risks  
Target stack: Next.js on Vercel, Supabase Postgres, Prisma, COD-first checkout, plan enforcement, SaaS billing readiness, WhatsApp click-to-contact, Paymob later  
Target market: Egyptian fashion and cosmetics merchants ready to pay monthly for a reliable Arabic COD storefront and operations dashboard

Companion execution docs:

- `docs/agent-operating-system.md`
- `docs/saas-foundation-decisions.md`
- `docs/backlog/phase-1-backlog.md`
- `docs/agent-state.md`

## 1. Product Intent

Phase 2 turns the pilot-ready marketplace foundation into a paid SaaS product. A merchant should understand what they are paying for, hit plan limits predictably, upgrade when they need more capacity, and get enough operational value to keep paying.

Phase 2 is not complete until the app can support paid merchant accounts with:

- visible plans and entitlements,
- server-enforced limits,
- improved onboarding activation,
- stronger storefront merchandising,
- better order operations,
- platform support visibility,
- billing-readiness without confusing SaaS billing with shopper checkout.

## 2. Success Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| Activated paid merchant | 70% of paying pilot merchants complete onboarding and add at least 5 products | Onboarding and product records |
| First paid-store order | 60% of paying pilot stores receive at least 1 COD order within 14 days | Order records |
| Plan limit clarity | 0 support tickets caused by unclear product/order/staff limits | Support log review |
| Upgrade intent | At least 20% of active pilot merchants hit or approach a plan limit | Entitlement usage logs |
| Merchant retention signal | 50% of paying pilot merchants log into admin weekly for 4 weeks | Session/admin activity |
| Support diagnosis speed | Platform operator can identify tenant plan, usage, last order, and setup status in under 2 minutes | Platform support smoke test |

## 3. Users

### Merchant Admin

Seller who pays monthly and expects the platform to help them sell, manage orders, and understand what their plan includes.

### Shopper

Customer buying from a merchant storefront, expecting a trustworthy product page, COD checkout, clear shipping, and easy contact.

### Platform Operator

Internal operator responsible for plan assignment, tenant support, account status, risk review, and billing support.

### QA / Tester

Tester verifying paid-plan behavior, limit enforcement, upgrade prompts, platform support visibility, and regression safety.

## 4. Non-Goals for Phase 2

The following are explicitly out of scope unless separately approved:

- full automated SaaS subscription billing charge collection,
- marketplace-wide product discovery,
- live Paymob shopper checkout,
- official WhatsApp Business API message sending,
- advanced ad attribution and server-side conversion APIs,
- inventory reservation across warehouses,
- shipping carrier label generation,
- custom app/mobile app,
- AI product generation features.

Phase 2 may prepare data models and UI positions for these later capabilities, but must not advertise them as live.

## 5. Requirements

### R1. Plans and Entitlements

#### R1.1 Plan model

The system must support at least three merchant plans:

- Starter
- Growth
- Pro

Each plan must define limits and capabilities in structured data.

Minimum entitlement fields:

- product limit,
- monthly order limit or tracked order quota,
- staff/admin seat limit,
- custom domain allowed,
- advanced analytics allowed,
- Paymob allowed,
- WhatsApp automation allowed,
- platform branding removal allowed if desired later.

Entitlement availability rule:

Phase 2 may store future-facing entitlement fields, but capabilities that are not live yet must be marked as `reserved`, not usable. See `docs/saas-foundation-decisions.md` D2. In Phase 2, custom domains, live Paymob checkout, official WhatsApp automation, full staff role permissions, and advanced analytics are reserved unless separately implemented and tested.

Acceptance criteria:

- Plans are stored in database or config with stable plan codes.
- Tenant subscription references a plan.
- Plan limits are readable by server services and admin UI.
- Missing plan falls back safely to Starter or a blocked state, not unlimited access.
- Reserved capabilities are not exposed as usable merchant-facing features.

Test cases:

- read active plan by tenant,
- missing plan handled safely,
- inactive plan cannot be newly assigned,
- plan limits parse correctly,
- tenant subscription status affects access.

#### R1.2 Server-side entitlement enforcement

Plan limits must be enforced on the server, not only hidden in the UI.

Acceptance criteria:

- Product creation is blocked when product limit is reached.
- Staff/admin invite or promotion is blocked when seat limit is reached if staff management is live.
- Custom domain setup is blocked or shown as reserved until Phase 4 custom domains are live.
- Paymob/WhatsApp live configuration is blocked or shown as reserved until their provider implementations are live.
- API returns predictable upgrade-required response.

Test cases:

- Starter tenant cannot exceed product limit,
- Growth tenant can create more products than Starter,
- staff limit blocks new admin,
- custom domain API rejects plan without entitlement,
- frontend prompt appears after server returns upgrade-required.

#### R1.3 Usage snapshot

Merchant admin and platform operator must see current usage against plan limits.

Acceptance criteria:

- Merchant dashboard shows product usage.
- Merchant dashboard shows staff usage if staff is available.
- Merchant dashboard shows order usage if monthly order limits are enabled.
- Platform tenant detail shows plan, subscription status, usage, and limit warnings.

### R2. Pricing and Upgrade UX

#### R2.1 Public pricing page

The platform must show clear plan options.

Acceptance criteria:

- Pricing page lists Starter, Growth, and Pro.
- Each plan explains who it is for.
- Each plan lists product limits, key features, and support level.
- CTA routes new merchants to signup.
- Existing merchant CTA routes to admin billing/plan area.
- Arabic-first copy is available.

Test cases:

- pricing page renders on platform root,
- Arabic and English copy fit on mobile,
- CTA routes correctly for logged-out user,
- CTA routes correctly for logged-in tenant admin.

#### R2.2 Upgrade prompts

When a merchant hits a plan limit, the app must explain the limit and the next action.

Acceptance criteria:

- Limit prompt appears on relevant action, not only in settings.
- Prompt states current plan and blocked capability.
- Prompt offers contact/upgrade CTA.
- Merchant cannot bypass by direct API call.

Test cases:

- product create limit displays upgrade prompt,
- API returns upgrade-required status/body,
- direct request is blocked,
- prompt preserves tenant context.

### R3. Billing Readiness

#### R3.1 Billing separation

SaaS subscription billing must be clearly separated from shopper checkout.

Acceptance criteria:

- Shopper checkout remains COD-first.
- Merchant subscription/billing routes are separate from storefront checkout.
- Stripe/Paymob SaaS billing language does not appear in shopper checkout.
- Payment provider disabled states are clear.

Test cases:

- shopper checkout does not show Stripe SaaS billing language,
- merchant billing/settings page does not affect shopper COD checkout,
- disabled SaaS billing CTA does not create fake payment session.

#### R3.2 Manual billing support for paid pilot

Until automated billing is implemented, platform operator must be able to manage paid pilot status manually.

Acceptance criteria:

- Platform operator can set plan and subscription status.
- Subscription statuses include at least `TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`.
- Suspended tenant cannot access paid admin actions except billing/support pages.
- Tenant storefront behavior for suspended tenants is explicitly defined.

Recommended suspended storefront behavior:

- storefront remains visible for a grace period,
- checkout is disabled if tenant is fully suspended,
- merchant admin shows billing/support resolution message.

Test cases:

- platform operator updates tenant plan,
- active subscription allows plan features,
- past_due shows warning,
- suspended blocks admin mutations,
- canceled blocks paid features.

### R4. Merchant Activation and Onboarding V2

#### R4.1 Activation dashboard

Merchant admin must see a focused activation dashboard after signup and until first meaningful order activity.

Acceptance criteria:

- Dashboard shows setup progress.
- Dashboard shows next best action.
- Dashboard shows store link/share action.
- Dashboard shows first product status.
- Dashboard shows first order status once received.

Test cases:

- new merchant sees activation dashboard,
- merchant with no product sees add product CTA,
- merchant with product but no order sees share storefront CTA,
- merchant with first order sees order queue CTA.

#### R4.2 Store sharing

Merchant must be able to copy/share storefront and product links.

Acceptance criteria:

- Storefront link is visible in admin.
- Product links are copyable/shareable.
- Links use tenant domain/subdomain.
- Share text is Arabic-friendly and COD-aware.

Test cases:

- copy store link,
- copy product link,
- link opens correct tenant storefront,
- share text includes product/store context without exposing admin URLs.

### R5. Storefront Merchandising V2

#### R5.1 Product detail quality

Product detail pages must help shoppers confidently order fashion/cosmetics items.

Acceptance criteria:

- Product shows images, name, price, stock status, description.
- Variant selection supports size, color, shade, or other options.
- Out-of-stock variants cannot be added.
- Product page shows COD reassurance.
- Product page shows shipping/returns summary.

Test cases:

- variant selection updates selected variant,
- out-of-stock add to cart blocked,
- missing images render graceful fallback,
- COD and returns copy visible in Arabic.

#### R5.2 Category and collection browsing

Storefront must support basic discovery within a merchant store.

Acceptance criteria:

- Category pages list tenant products only.
- Empty category has useful message.
- Product cards show price, stock/sold-out status, and image fallback.
- Mobile grid is usable.

Test cases:

- category page tenant scoped,
- empty category state,
- sold-out product card,
- mobile product grid no overlap.

### R6. Order Operations V2

#### R6.1 Order queue filters

Merchant admin must handle daily COD operations efficiently.

Acceptance criteria:

- Orders can be filtered by status.
- Orders can be searched by customer name, phone, or order reference.
- Orders show age/time since created.
- Orders show payment method as COD.
- Orders show confirmation status clearly.

Test cases:

- filter by each status,
- search by phone,
- search by customer name,
- empty result state,
- tenant isolation on filtered results.

#### R6.2 Contact attempts

Merchant must track simple customer contact attempts.

Acceptance criteria:

- Merchant can record contact attempt on an order.
- Attempt stores timestamp, method, and optional note.
- Order detail shows attempt history.
- No automated WhatsApp API is required.

Test cases:

- create contact attempt,
- list attempts on order detail,
- reject contact attempt for another tenant order,
- note length validation.

### R7. Platform Operator Console

#### R7.1 Tenant overview

Platform operator must see tenant health and business status.

Acceptance criteria:

- Tenant list shows tenant name, slug, status, plan, subscription status, created date, last order date, product count, order count.
- Tenant list supports search by name/slug/email.
- Tenant detail shows plan, usage, onboarding status, recent orders, and support notes.

Test cases:

- platform admin can list tenants,
- tenant admin cannot access platform tenant list,
- search tenants,
- tenant detail shows usage safely.

#### R7.2 Support notes

Platform operator must record internal support notes for a tenant.

Acceptance criteria:

- Add support note to tenant.
- Notes are visible only to platform operators.
- Notes do not appear in merchant admin or storefront.

Test cases:

- platform admin creates note,
- tenant admin cannot read note,
- unauthenticated request rejected.

### R8. Analytics and Measurement V1

#### R8.1 Merchant dashboard metrics

Merchant must see simple operational metrics.

Acceptance criteria:

- Dashboard shows total orders.
- Dashboard shows revenue from COD orders.
- Dashboard shows top products by quantity/revenue.
- Dashboard shows low-stock products.
- Dashboard date range defaults to recent period.

Test cases:

- metrics tenant scoped,
- orders with canceled status excluded from revenue if product decision says so,
- low stock threshold works,
- empty metrics state for new merchant.

#### R8.2 Platform activation metrics

Platform operator must see funnel health for paid SaaS adoption.

Acceptance criteria:

- Count merchants by onboarding stage.
- Count active tenants by last admin login or last order.
- Count tenants near plan limits.
- Count tenants with no products/orders after signup.

Test cases:

- activation counts correct,
- tenant-scoped data not exposed to other tenants,
- empty state for no tenants.

### R9. Notifications and Messaging Readiness

#### R9.1 Click-to-WhatsApp templates

Merchant should have better prefilled WhatsApp messages without requiring official API automation.

Acceptance criteria:

- Order detail provides WhatsApp link with prefilled Arabic confirmation message.
- Message includes order reference, store name, and total.
- Phone is normalized for WhatsApp link format.
- Merchant can edit message before sending in WhatsApp.

Test cases:

- WhatsApp link generated for valid Egyptian phone,
- invalid phone does not generate broken link,
- message includes correct order details,
- no automatic send occurs.

#### R9.2 Provider readiness status

Admin settings must clearly distinguish:

- click-to-WhatsApp available,
- official WhatsApp automation not configured,
- Paymob not configured,
- Paymob configured but plan-disallowed,
- Paymob configured and enabled later.

Acceptance criteria:

- No placeholder provider throws in a merchant-facing production path.
- Status copy is clear in Arabic.
- Production mock providers are blocked unless explicitly allowed for demo.

### R10. Security, Privacy, and Compliance

#### R10.1 Sensitive data boundaries

Phase 2 must avoid spreading customer data into analytics or provider payloads unnecessarily.

Acceptance criteria:

- Customer phone/email are not sent to analytics without explicit hashing/consent design.
- Logs do not include passwords, auth tokens, full payment credentials, or full webhook secrets.
- Platform support views show only necessary customer/order data.

Test cases:

- log snapshots avoid sensitive fields,
- analytics event payload tests exclude PII,
- support notes do not expose to tenant/customer.

#### R10.2 Plan and billing authorization

Only platform operators may manually change tenant plan/subscription status.

Acceptance criteria:

- Tenant admin cannot change own plan directly unless automated billing flow is implemented.
- Platform admin changes are audit logged.
- Plan changes immediately update entitlement enforcement.

Test cases:

- platform admin updates plan,
- tenant admin rejected,
- unauthenticated rejected,
- audit log written,
- feature access changes after plan update.

## 6. Browser Smoke Test Script

QA must verify this flow on a clean local or preview environment after Phase 1 smoke passes:

1. Open platform pricing page.
2. Confirm Starter, Growth, and Pro are visible in Arabic.
3. Create or use a merchant tenant on Starter.
4. Open merchant dashboard and confirm plan/usage card.
5. Add products until Starter product limit is reached.
6. Confirm server blocks the next product creation.
7. Confirm UI shows upgrade prompt.
8. As platform admin, upgrade tenant to Growth.
9. Return to merchant admin and confirm product creation works again.
10. Add variants with size/color/shade.
11. Open storefront product page and confirm variants are selectable.
12. Copy/share product link and open it.
13. Place a COD order.
14. Open admin order queue.
15. Filter/search order by phone or status.
16. Record contact attempt.
17. Open platform tenant detail.
18. Confirm plan, usage, onboarding, recent order, and support note surfaces.

Expected result:

- Limits are enforced server-side.
- Upgrade changes behavior.
- Storefront remains tenant-scoped.
- Merchant sees clear paid-plan value.
- Platform operator can support the merchant without database access.

## 7. API Test Matrix

| Area | Required coverage |
| --- | --- |
| Plans | read active plans, inactive plan blocked, missing plan safe fallback |
| Entitlements | product limit, staff limit, custom domain entitlement, provider entitlement |
| Subscription status | trial, active, past_due, suspended, canceled |
| Platform plan changes | platform admin allowed, tenant admin rejected, audit log written |
| Pricing | pricing page route/copy, CTA destination |
| Product variants | selectable variants, out-of-stock blocked, tenant scoping |
| Order operations | filters, search, contact attempts, tenant isolation |
| Usage snapshots | product count, staff count, order count, near-limit warning |
| Analytics | merchant metrics tenant scoped, platform activation metrics |
| WhatsApp links | valid phone link, invalid phone handling, no automatic send |
| Provider status | disabled, not configured, plan-disallowed, demo mock guard |

## 8. Launch Gate

Phase 2 is complete only when all gates are green.

### Code gate

```bash
npm run check
npm test -- --detectOpenHandles --forceExit
npm run build
```

### Phase 1 regression gate

- Phase 1 browser smoke script still passes.
- Tenant isolation tests still pass.
- COD checkout still decrements stock atomically.
- Critical Arabic flows remain clean.

### Paid SaaS gate

- Plans and entitlements are server-enforced.
- Merchant can see plan and usage.
- Upgrade/downgrade by platform operator changes access.
- Upgrade prompts are clear and tenant-context safe.
- Suspended/past-due behavior is defined and tested.

### Merchant value gate

- Merchant can add a useful catalog with variants.
- Merchant can share product/store links.
- Merchant can filter/search COD orders.
- Merchant can record contact attempts.
- Merchant dashboard shows useful operational metrics.

### Platform operations gate

- Platform admin can view tenant plan, usage, onboarding, recent activity.
- Platform admin can add support notes.
- Plan changes are audit logged.
- Support views do not leak unnecessary sensitive data.

## 9. Dependencies

- Phase 1 tenant isolation and checkout correctness.
- Plan and subscription schema stable.
- Entitlement availability status supports `available`, `reserved`, and `disabled`.
- Platform admin auth stable.
- Decision on pricing numbers and package names.
- Product entitlement service or equivalent server-side enforcement.
- Audit log path for platform operator changes.
- Production domain/subdomain routing.
- Support process owner.

## 10. Known Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Plan limits enforced only in UI | Merchants bypass paid tiers | Server-side entitlement checks and API tests |
| Pricing does not match merchant value | Low conversion | Concierge pilot interviews and pricing experiments |
| Billing confusion with shopper checkout | Trust/support issues | Separate SaaS billing from COD/Paymob shopper checkout |
| Suspended tenant behavior unclear | Bad merchant/customer experience | Define and test storefront/admin suspension rules |
| Platform support sees too much data | Privacy risk | Least-necessary support views and audit logs |
| Analytics uses PII improperly | Compliance/privacy risk | PII-free event contracts, hashing only by design |
| Feature bloat before payments | Slow launch | Keep Paymob/official WhatsApp automation out of Phase 2 unless explicitly approved |

## 11. Phase 2 Done Definition

Phase 2 is done when:

- Phase 1 smoke and regression gates still pass,
- plans and tenant subscriptions are visible and reliable,
- product/staff/provider/custom-domain limits are enforced server-side,
- merchant sees plan usage and clear upgrade prompts,
- platform operator can manually manage plan/subscription status,
- storefront product pages support strong variant merchandising,
- merchant can share store/product links,
- merchant can filter/search orders and record contact attempts,
- merchant dashboard shows useful operational metrics,
- platform console supports tenant diagnosis,
- all launch gates pass.
