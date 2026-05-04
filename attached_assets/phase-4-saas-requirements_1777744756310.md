# Phase 4 SaaS Requirements: Growth, Payments, and Scale

Status: Draft for engineering and QA review  
Owner: Product / Engineering  
Last updated: April 30, 2026  
Depends on: Phase 1 foundation, Phase 2 paid SaaS core, and Phase 3 operations/retention complete or accepted with documented risks  
Target stack: Next.js on Vercel, Supabase Postgres, Prisma, COD-first plus Paymob live checkout, WhatsApp operations, SaaS billing, custom domains, SEO and tracking integrations  
Target market: Egyptian fashion and cosmetics merchants ready to grow beyond manual COD operations into paid acquisition, online payments, branded storefronts, and higher-volume selling

Companion execution docs:

- `docs/agent-operating-system.md`
- `docs/saas-foundation-decisions.md`
- `docs/agent-state.md`

## 1. Product Intent

Phase 4 turns the product from a useful paid SaaS into a scalable growth platform. Merchants should be able to accept online payment, run a more professional branded store, measure acquisition channels, manage staff, and scale daily operations without needing engineering or support for every change.

Phase 4 is not complete until eligible merchants can:

- activate live Paymob payment methods safely,
- keep COD as the default fallback,
- manage SaaS subscription billing or a clearly defined automated billing flow,
- connect a custom domain,
- publish SEO-ready storefront pages,
- configure tracking pixels safely,
- give staff limited access,
- export business data,
- recover from common provider/domain/payment failures with clear platform support visibility.

## 2. Success Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| Paymob activation | 30% of eligible Growth/Pro merchants activate at least one live online payment method | Provider status and successful payment records |
| Online payment conversion | 10% of orders for activated merchants use online payment within 60 days | Order payment method records |
| Payment reliability | 99% of payment webhooks are processed idempotently within expected window | Webhook logs and reconciliation jobs |
| Custom domain adoption | 25% of Pro merchants connect a verified domain | Domain verification records |
| Organic discovery signal | 40% of active merchants have SEO-complete product/category metadata | SEO completeness records |
| Tracking adoption | 35% of active paid merchants enable at least one approved tracking provider | Tracking settings |
| Staff delegation | 30% of active paid merchants invite at least one staff user | Staff invitation records |
| Support scalability | Platform operator can diagnose payment/domain/tracking issue in under 3 minutes | Support smoke test |

## 3. Users

### Merchant Admin

Store owner who wants higher trust, branded selling, online payment options, staff delegation, and growth visibility.

### Merchant Staff

Operator who should manage catalog, orders, customers, or marketing tasks without full account/billing access.

### Shopper

Customer who can choose COD or online payment and expects trustworthy checkout, clear payment status, and reliable order confirmation.

### Platform Operator

Internal operator responsible for payment provider health, merchant billing, domain support, abuse review, and growth support.

### QA / Tester

Tester verifying payments, webhooks, domains, staff permissions, tracking, SEO, tenant isolation, and production failure modes.

## 4. Non-Goals for Phase 4

The following are explicitly out of scope unless separately approved:

- marketplace-wide public discovery across all stores,
- native iOS/Android apps,
- warehouse management or carrier label purchasing,
- lending, wallets, or financial products,
- automated ad buying,
- AI-generated campaign strategy,
- multi-country expansion,
- complex loyalty points,
- cross-tenant shopper accounts.

Phase 4 may prepare for marketplace discovery, mobile apps, loyalty, or advanced CRM later, but it must not expose these as live product promises.

## 5. Requirements

### R1. Paymob Live Shopper Payments

#### R1.1 Paymob provider configuration

Eligible merchants must be able to configure Paymob for live shopper checkout when their plan and credentials allow it.

Acceptance criteria:

- Paymob status supports `NOT_CONFIGURED`, `CONFIGURED_DISABLED`, `ACTIVE`, `ERROR`, and `PLAN_DISALLOWED`.
- Provider credentials are server-side only.
- Merchant admin cannot read raw secrets.
- Production mock mode is blocked unless explicitly enabled for a demo tenant.
- Merchant sees Arabic status copy and clear next action.
- COD remains available unless merchant disables it by explicit setting.

Test cases:

- eligible merchant activates Paymob with valid config,
- plan-disallowed merchant cannot activate,
- missing credentials show not configured,
- raw credentials never appear in API response,
- production mock provider is blocked,
- COD remains available after Paymob activation.

#### R1.2 Online payment checkout

Shopper checkout must support Paymob payment initiation without weakening COD checkout.

Before implementation starts, engineering must choose and record the Paymob pending order / stock reservation model from `docs/saas-foundation-decisions.md` D4. Phase 4 Paymob checkout is blocked until that decision is approved.

Acceptance criteria:

- Shopper can select COD or online payment where enabled.
- Online payment creates a pending order or payment intent using server-calculated totals.
- Client-supplied totals are ignored.
- Order stores payment method, payment status, provider reference, and amount.
- Payment failure does not decrement stock unless product decision explicitly reserves stock.
- Shopper sees localized payment success/failure/pending states.

Test cases:

- COD checkout still succeeds,
- Paymob checkout initializes with server totals,
- disabled Paymob does not appear,
- failed payment shows safe message,
- client-modified total is ignored,
- cross-tenant variant rejected during Paymob checkout.

#### R1.3 Paymob webhook handling

Paymob webhooks must update payment/order state safely and idempotently.

Acceptance criteria:

- Webhook signature is verified.
- Duplicate webhook does not duplicate order effects.
- Unknown payment reference is logged safely.
- Successful payment transitions order/payment to paid state.
- Failed/expired payment transitions payment state without leaking provider internals.
- Webhook processing writes audit/event records.

Test cases:

- valid success webhook marks paid,
- duplicate webhook idempotent,
- invalid signature rejected,
- unknown reference logged and ignored safely,
- failed payment updates status,
- tenant ownership resolved from trusted stored payment/order data.

#### R1.4 Payment reconciliation

Platform operator must be able to identify payment mismatches.

Acceptance criteria:

- Payment records include provider reference, amount, currency, status, timestamps, and order link.
- Platform view shows recent payment failures and pending payments.
- Reconciliation job or manual action can flag stale pending payments.
- Merchant order detail shows clear payment status.

Test cases:

- pending payment appears in platform view,
- stale pending payment is flagged,
- successful payment links to order,
- payment mismatch does not expose secrets.

### R2. SaaS Subscription Billing Automation

#### R2.1 Self-serve billing model

The platform must support a clear SaaS billing path for merchant subscriptions.

Acceptance criteria:

- Billing is separated from shopper checkout.
- Merchant can view current plan, renewal date, invoice/payment status, and billing owner.
- Subscription status affects entitlements server-side.
- Failed merchant billing payment does not alter shopper order payment records.
- Manual override remains available to platform operator.

Test cases:

- merchant billing page loads current plan,
- platform operator can override subscription state,
- suspended subscription blocks paid features,
- shopper checkout remains independent,
- billing records are tenant-scoped.

#### R2.2 Invoice and payment history

Merchant must see subscription invoices or billing history.

Acceptance criteria:

- Merchant can view billing history for their tenant.
- Billing records show amount, currency, date, status, and provider/manual reference.
- Merchant cannot view another tenant billing history.
- Platform operator can view tenant billing history for support.

Test cases:

- tenant admin views own billing history,
- cross-tenant billing access rejected,
- platform operator views billing history,
- failed invoice status visible.

### R3. Custom Domains and Store Branding

#### R3.1 Custom domain setup

Eligible merchants must connect a custom domain to their storefront.

Acceptance criteria:

- Custom domain setup is plan-gated.
- Merchant can request domain connection from admin.
- Platform provides DNS instructions.
- Domain verification status is visible.
- Verified domain routes only to the owning tenant.
- Domain removal is available.

Test cases:

- Pro tenant can start domain setup,
- Starter tenant receives upgrade-required response,
- unverified domain does not become active,
- verified domain maps to correct tenant,
- domain cannot be claimed by another tenant,
- domain removal disables routing.

#### R3.2 Branding controls

Merchant must control core brand presentation.

Acceptance criteria:

- Merchant can set logo, favicon, brand color, social links, and footer contact info.
- Branding changes appear on storefront.
- Uploaded assets are validated for type/size.
- Missing assets render polished fallbacks.
- Platform branding removal is plan-gated if offered.

Test cases:

- update logo and brand color,
- invalid asset rejected,
- missing logo fallback renders,
- branding tenant-scoped,
- branding removal entitlement enforced.

### R4. SEO and Content Growth

#### R4.1 SEO-ready storefront pages

Merchant storefront, product, and category pages must expose SEO metadata.

Acceptance criteria:

- Storefront home has title, description, canonical URL, and Open Graph metadata.
- Product pages have title, description, image, canonical URL, and structured data where appropriate.
- Category pages have title, description, canonical URL, and pagination-safe metadata.
- Metadata is tenant-scoped and does not leak other tenants.
- Arabic metadata is supported.

Test cases:

- product metadata renders for tenant product,
- category metadata renders,
- canonical URL uses active tenant domain,
- deleted/inactive product is not indexable,
- cross-tenant metadata request rejected or not found.

#### R4.2 SEO completeness assistant

Merchant admin must see SEO gaps without needing technical knowledge.

Acceptance criteria:

- Product list indicates missing SEO title/description/image.
- Store settings indicates missing homepage SEO fields.
- Admin shows simple Arabic suggestions.
- SEO recommendations do not auto-publish unsupported claims.

Test cases:

- missing SEO fields show warning,
- complete product clears warning,
- Arabic copy fits mobile admin,
- tenant cannot inspect another tenant SEO data.

#### R4.3 Sitemap and robots

Public storefront must expose indexable routes safely.

Acceptance criteria:

- Tenant sitemap includes active products/categories only.
- Inactive/deleted products are excluded.
- Suspended tenants have explicit indexing behavior.
- Robots/canonical behavior is documented.

Test cases:

- active product appears in sitemap,
- inactive product excluded,
- suspended tenant behavior matches product decision,
- sitemap uses custom domain when active.

### R5. Tracking and Growth Integrations

#### R5.1 Pixel/provider configuration

Merchant must configure approved tracking providers safely.

Supported readiness targets:

- GA4,
- Meta Pixel,
- TikTok Pixel,
- Google Ads conversion ID.

Acceptance criteria:

- Provider settings are tenant-scoped.
- Provider IDs are validated.
- Tracking is disabled by default.
- Merchant must opt in per provider.
- Raw customer phone/email is not sent by default.
- Server events only use approved PII-safe payloads.

Test cases:

- enable valid GA4 ID,
- invalid provider ID rejected,
- disabled provider receives no events,
- event payload excludes raw PII,
- provider config cannot be read by another tenant.

#### R5.2 Growth dashboard

Merchant must understand channel and conversion performance at a practical level.

Acceptance criteria:

- Dashboard shows traffic, product views, checkout starts, COD orders, online paid orders, and conversion rate where tracking exists.
- Date filters are available.
- Empty states explain what provider/data is needed.
- Metrics are tenant-scoped.

Test cases:

- funnel metrics calculated,
- date range filters,
- empty state for no tracking,
- tenant isolation on metrics,
- COD and online payment orders separated.

### R6. Staff Roles and Permissions V1

#### R6.1 Staff invitations

Merchant admin must invite staff within plan limits.

Acceptance criteria:

- Staff invite is plan-gated by seat limit.
- Invite includes role and expiration.
- Invite can be accepted only by intended email.
- Revoked or expired invite cannot be used.
- Invite acceptance creates staff membership for the tenant only.

Test cases:

- valid invite accepted,
- expired invite rejected,
- revoked invite rejected,
- wrong email rejected,
- seat limit enforced,
- tenant isolation on invites.

#### R6.2 Role permissions

The system must support limited merchant roles.

Minimum roles:

- Owner,
- Manager,
- Catalog Manager,
- Order Operator,
- Marketing Analyst.

Acceptance criteria:

- Owner can manage billing, plan, staff, settings, catalog, orders, and analytics.
- Manager can manage catalog, orders, customers, and analytics but not billing ownership.
- Catalog Manager can manage products/categories only.
- Order Operator can manage orders/contact attempts only.
- Marketing Analyst can view analytics/tracking but cannot mutate orders/catalog.
- Server-side authorization enforces roles.

Test cases:

- each role can access allowed resources,
- each role is blocked from disallowed resources,
- UI hides unavailable actions,
- direct API call is blocked,
- role change audit log written.

### R7. Data Export and Merchant Portability

#### R7.1 Export business data

Merchant must export core business data for accounting, operations, or migration.

Export areas:

- orders,
- order items,
- products,
- customers,
- inventory adjustments,
- returns/exchanges.

Acceptance criteria:

- Exports are tenant-scoped.
- Export format is CSV or XLSX.
- Export includes selected date range where relevant.
- Export jobs are logged.
- Large exports do not block app request lifecycle.

Test cases:

- order export by date range,
- product export,
- customer export excludes other tenants,
- large export creates job,
- export link expires or is access-controlled.

#### R7.2 Platform data retention controls

Platform operator must have basic retention and support tools.

Acceptance criteria:

- Platform can view export/job status by tenant.
- Failed export jobs are visible.
- Deleted/suspended tenant data behavior is documented.
- Sensitive data export is access-controlled.

Test cases:

- platform sees export job,
- tenant cannot see another tenant export,
- failed job status visible,
- suspended tenant export behavior matches policy.

### R8. Platform Operations at Scale

#### R8.1 Tenant health score

Platform operator must quickly identify tenants needing support.

Acceptance criteria:

- Tenant health score or checklist includes onboarding, plan status, recent orders, provider status, domain status, payment failures, and support notes.
- Health detail links to actionable admin/support views.
- Risk indicators are explainable.

Test cases:

- tenant with payment failures flagged,
- tenant with domain issue flagged,
- tenant with no products after signup flagged,
- healthy tenant not flagged,
- platform-only access enforced.

#### R8.2 Incident and audit timeline

Platform operator must inspect key tenant events.

Acceptance criteria:

- Timeline includes plan changes, provider changes, domain changes, payment webhook failures, role changes, and critical support notes.
- Events include actor, timestamp, tenant, action, and safe metadata.
- Sensitive values are redacted.

Test cases:

- plan change audit appears,
- role change audit appears,
- payment failure event appears,
- secrets redacted,
- tenant admin cannot access platform audit timeline.

### R9. Reliability, Performance, and Scale

#### R9.1 Performance budgets

Phase 4 must define and test practical performance targets.

Acceptance criteria:

- Storefront home/product/category pages meet agreed Core Web Vitals targets on mobile preview.
- Admin order list remains usable with high order counts.
- Dashboard analytics queries are indexed or cached where needed.
- Heavy exports and provider dispatches run asynchronously.

Test cases:

- product page performance smoke,
- admin order list with large dataset,
- analytics query performance check,
- export does not block normal request,
- provider dispatch failure does not block checkout.

#### R9.2 Backup, restore, and rollback readiness

Platform must be ready for real paid merchants.

Acceptance criteria:

- Supabase backup owner and restore drill are documented.
- Prisma migration rollback strategy is documented.
- Production env vars are documented.
- Provider key rotation process is documented.
- Critical data restoration has a tested runbook.

Test cases:

- env var checklist complete,
- migration deploy tested in preview,
- rollback plan reviewed,
- provider credential rotation smoke tested,
- restore drill completed or explicitly scheduled before launch.

### R10. Security, Privacy, and Compliance

#### R10.1 Payment security boundaries

Payment data must stay within safe provider and platform boundaries.

Acceptance criteria:

- App never stores raw card data.
- Payment provider secrets are server-only.
- Webhooks verify signatures.
- Logs redact payment secrets and raw provider payload fields where needed.
- Payment status changes are audit logged.

Test cases:

- no raw card fields stored,
- webhook signature required,
- secret not returned in API,
- logs redact sensitive data,
- payment status audit written.

#### R10.2 Staff and support least privilege

Staff and platform support views must avoid unnecessary data exposure.

Acceptance criteria:

- Role checks are server-side.
- Platform support sees only necessary customer data.
- Export access is permission-gated.
- Sensitive actions require owner or platform role.

Test cases:

- staff role cannot access billing,
- marketing analyst cannot export full customer phone list unless allowed,
- platform support view redacts unnecessary fields,
- direct API bypass rejected.

## 6. Browser Smoke Test Script

QA must verify this flow after Phase 1, Phase 2, and Phase 3 smoke scripts pass:

1. Open platform pricing/admin as an eligible Pro tenant.
2. Confirm plan allows Paymob, custom domain, tracking, and staff seats.
3. Configure Paymob provider with test/live-safe credentials in the approved environment.
4. Open storefront checkout and confirm COD and online payment options appear.
5. Complete a COD order and verify existing flow still works.
6. Start an online payment order and simulate Paymob success webhook.
7. Confirm order/payment status updates exactly once.
8. Simulate duplicate webhook and confirm no duplicate effects.
9. Configure custom domain request and verify status copy.
10. Verify active domain routes to the correct tenant.
11. Update logo, favicon, brand color, and social links.
12. Open product page and confirm SEO metadata/canonical behavior.
13. Enable one tracking provider and verify PII-safe event payload.
14. Invite staff user as Order Operator.
15. Log in as staff and confirm allowed/disallowed admin sections.
16. Export orders for a date range.
17. Open platform tenant health view.
18. Confirm payment/domain/provider/staff/export/audit events are visible to platform operator.

Expected result:

- Paymob and COD coexist safely.
- Webhooks are verified and idempotent.
- Custom domain and branding are tenant-scoped.
- SEO and tracking are configured without PII leakage.
- Staff roles are enforced server-side.
- Platform operator can diagnose scale-stage issues without database access.

## 7. API Test Matrix

| Area | Required coverage |
| --- | --- |
| Paymob config | status, plan gate, credential safety, mock guard |
| Paymob checkout | method selection, server totals, disabled state, failure state, tenant variant validation |
| Paymob webhooks | signature verification, success, failure, duplicate webhook, unknown reference |
| Payment records | pending, paid, failed, stale pending, reconciliation view |
| SaaS billing | plan view, invoice history, subscription state, manual override, shopper checkout separation |
| Custom domains | plan gate, verification, duplicate claim prevention, tenant routing, removal |
| Branding | logo/favicon/color/social links, asset validation, fallbacks, tenant scoping |
| SEO | product/category/home metadata, canonical URL, inactive product, sitemap |
| Tracking | provider ID validation, opt-in, disabled no-op, PII exclusion, tenant isolation |
| Staff invites | seat limit, accepted, expired, revoked, wrong email, tenant isolation |
| Roles | owner, manager, catalog manager, order operator, marketing analyst permission matrix |
| Exports | orders, products, customers, date range, large job, access control |
| Platform health | tenant score, payment/domain/provider flags, audit timeline, platform-only access |
| Performance | large order list, analytics queries, async export, provider dispatch isolation |
| Security | no raw card data, secret redaction, webhook signature, least privilege |

## 8. Launch Gate

Phase 4 is complete only when all gates are green.

### Code gate

```bash
npm run check
npm test -- --detectOpenHandles --forceExit
npm run build
```

### Regression gate

- Phase 1 browser smoke script passes.
- Phase 2 browser smoke script passes.
- Phase 3 browser smoke script passes.
- Tenant isolation tests pass.
- COD checkout remains atomic.
- Plan entitlements remain server-enforced.
- WhatsApp/provider mock safety remains enforced.

### Payment gate

- Paymob config is plan-gated and credential-safe.
- Online payment checkout uses server-calculated totals.
- Webhook signature verification works.
- Duplicate webhooks are idempotent.
- Payment reconciliation view identifies stale/failure states.
- COD remains stable and available as configured.

### Growth gate

- Custom domains route only to owning tenant.
- SEO metadata and sitemap are tenant-scoped.
- Tracking providers are opt-in and PII-safe.
- Merchant can view basic funnel/growth metrics.

### SaaS operations gate

- Merchant billing/subscription status is visible.
- Billing remains separate from shopper checkout.
- Staff roles are enforced server-side.
- Data exports are access-controlled.
- Platform tenant health and audit timeline support diagnosis.

### Reliability and security gate

- No raw card data is stored.
- Provider secrets are server-only and redacted from responses/logs.
- Heavy jobs are asynchronous or safe for Vercel request limits.
- Backup/restore and rollback runbooks are documented.
- Performance smoke tests meet agreed budgets.

## 9. Dependencies

- Phase 1 tenant isolation, checkout, and onboarding stability.
- Phase 2 plan/entitlement and platform console stability.
- Phase 3 WhatsApp, shipping, analytics, inventory, and provider event foundations.
- Final Paymob merchant onboarding and credential model.
- Approved Paymob stock and pending order model from `docs/saas-foundation-decisions.md` D4.
- SaaS billing provider decision and legal/accounting process.
- Domain routing strategy on Vercel.
- Asset storage strategy for logos/favicons.
- SEO metadata architecture.
- Tracking provider consent/privacy decision.
- Staff permission model and audit log schema.
- Background job/export strategy compatible with Vercel.
- Backup/restore operational owner.

## 10. Known Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Paymob webhook bug | Orders marked incorrectly or duplicated effects | Signature verification, idempotency keys, reconciliation |
| COD regression after online payment | Core market flow breaks | Mandatory COD regression gate |
| Domain misrouting | Tenant data/brand trust issue | Verified domain ownership and unique domain constraint |
| Tracking sends PII | Privacy/compliance issue | PII-safe schema, opt-in dispatch, payload tests |
| Staff role bypass | Data leak or unauthorized mutation | Server-side role matrix and API tests |
| SaaS billing confused with shopper payment | Support and trust problems | Separate routes, copy, data models, and tests |
| Exports expose too much data | Privacy and support risk | Permission gates, expiring links, audit logs |
| Performance degrades with larger merchants | Churn and support load | Query indexing, caching, async jobs, budgets |
| Provider failures block checkout | Revenue loss | Provider isolation and COD fallback |

## 11. Phase 4 Done Definition

Phase 4 is done when:

- Phase 1, Phase 2, and Phase 3 regression gates pass,
- eligible merchants can configure Paymob without exposing secrets,
- shoppers can choose COD or online payment where enabled,
- Paymob webhooks are verified, idempotent, and reconciled,
- merchant SaaS billing status/history is visible and separate from shopper checkout,
- custom domains are plan-gated, verified, and tenant-scoped,
- merchant branding controls are live,
- storefront SEO metadata and sitemap are tenant-safe,
- tracking providers are opt-in and PII-safe,
- merchant can view practical growth funnel metrics,
- staff invitations and role permissions are enforced server-side,
- merchant can export business data safely,
- platform operator can diagnose payment/domain/tracking/staff/export issues,
- reliability, backup, rollback, and performance gates are satisfied,
- all launch gates pass.
