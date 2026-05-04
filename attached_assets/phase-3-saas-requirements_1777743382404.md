# Phase 3 SaaS Requirements: Operations, Retention, and Automation

Status: Draft for engineering and QA review  
Owner: Product / Engineering  
Last updated: April 30, 2026  
Depends on: Phase 1 pilot foundation and Phase 2 paid SaaS core complete or accepted with documented risks  
Target stack: Next.js on Vercel, Supabase Postgres, Prisma, COD-first operations, WhatsApp automation readiness, richer shipping rules, analytics and tracking foundations  
Target market: Egyptian fashion and cosmetics merchants who already receive orders and now need lower manual workload, better repeat operations, and clearer growth insight

Companion execution docs:

- `docs/agent-operating-system.md`
- `docs/saas-foundation-decisions.md`
- `docs/agent-state.md`

## 1. Product Intent

Phase 3 makes the SaaS sticky. After Phase 2, merchants understand plans and can pay. Phase 3 gives them operational leverage: fewer manual order tasks, better customer follow-up, clearer shipping rules, better reporting, and growth instrumentation.

Phase 3 is not complete until active merchants can:

- automate or semi-automate COD confirmation workflows,
- configure shipping rules by Egyptian regions,
- track operational performance,
- understand products/orders/customers at a practical level,
- safely connect messaging and analytics providers,
- run repeatable order and customer workflows without relying on spreadsheets or manual chat history.

## 2. Success Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| Order confirmation efficiency | 30% reduction in time from order placed to first contact/confirmation | Order/contact timestamps |
| WhatsApp workflow adoption | 50% of active merchants use templates or automation weekly | Messaging event logs |
| Shipping accuracy | 90% of orders receive shipping cost from configured rules without manual override | Checkout/order records |
| Merchant retention signal | 60% of paid merchants use admin at least weekly for 8 weeks | Admin activity logs |
| Repeat order signal | 15% of shopper phone numbers place more than one order across a merchant store | Tenant-scoped order analytics |
| Analytics adoption | 50% of active merchants view dashboard metrics weekly | Dashboard view events |
| Support reduction | 25% fewer support requests about order status and shipping setup | Support log review |

## 3. Users

### Merchant Admin

Seller managing daily COD operations, customer contact, stock, shipping, and product performance.

### Merchant Operator / Staff

Person helping the store confirm orders, contact customers, update statuses, and monitor fulfillment.

### Shopper

Customer expecting quick confirmation, clear shipping cost, clear delivery status, and trustworthy follow-up.

### Platform Operator

Internal operator monitoring merchant health, provider failures, plan adoption, suspicious behavior, and support issues.

### QA / Tester

Tester verifying workflow automation, provider safety, tenant isolation, event correctness, and analytics accuracy.

## 4. Non-Goals for Phase 3

The following are explicitly out of scope unless separately approved:

- full logistics carrier label purchasing,
- warehouse management,
- marketplace-wide shopper marketplace/search,
- AI campaign generation,
- automated ad buying,
- bank transfers or financial product transactions,
- cross-tenant shopper identity graph,
- native mobile apps,
- complex CRM segmentation beyond basic repeat/order signals.

Phase 3 may prepare data structures for later CRM and logistics features, but it must not expose unsupported capabilities as live.

## 5. Requirements

### R1. WhatsApp Operations V1

#### R1.1 Official WhatsApp provider configuration

The platform must support configuring an official WhatsApp provider for eligible plans/tenants when credentials are present.

Acceptance criteria:

- WhatsApp provider status can be `NOT_CONFIGURED`, `CONFIGURED_DISABLED`, `ACTIVE`, `ERROR`, or `PLAN_DISALLOWED`.
- Provider credentials are stored server-side only.
- Merchant admin cannot read raw provider secrets.
- Production mock provider is blocked unless explicitly allowed for demo tenant.
- Provider status is visible in admin settings with Arabic copy.

Test cases:

- active plan with credentials shows active status,
- missing credentials shows not configured,
- plan-disallowed tenant cannot enable provider,
- raw secret never appears in API response,
- production mock provider blocked.

#### R1.2 WhatsApp templates

Merchant must be able to use predefined Arabic WhatsApp templates for order operations.

Minimum templates:

- order confirmation request,
- order confirmed,
- order dispatched,
- delivery follow-up,
- cancellation notice,
- return/exchange follow-up.

Acceptance criteria:

- Templates include variables such as store name, order reference, customer name, total, and delivery estimate.
- Variables are rendered server-side.
- Template preview is available before sending.
- Template output does not include undefined/null placeholders.
- Merchant can fall back to click-to-WhatsApp if official sending is disabled.

Test cases:

- render each template with complete order data,
- render each template with missing optional fields,
- reject unknown template code,
- tenant cannot render another tenant order template.

#### R1.3 Message event log

Every official WhatsApp send attempt must be logged.

Acceptance criteria:

- Log stores tenant, order, message type, provider, status, timestamp, and provider reference if available.
- Message status supports `QUEUED`, `SENT`, `FAILED`, `DELIVERED` if provider supports callbacks.
- Failed sends show merchant-safe error.
- Logs do not store secrets.

Test cases:

- successful send creates log,
- failed send creates failed log,
- provider callback updates log,
- duplicate callback handled idempotently,
- tenant isolation on message logs.

### R2. Order Workflow Automation

#### R2.1 Order action rules

Merchant must be able to configure simple automation rules for COD operations.

Example rules:

- send confirmation message when order is created,
- send dispatched message when status changes to `DISPATCHED`,
- alert merchant when order remains `AWAITING_CONFIRMATION` for more than N hours,
- mark order as requiring follow-up after failed contact attempt.

Acceptance criteria:

- Automation rules are tenant-scoped.
- Rules can be enabled/disabled.
- Rules are plan-gated.
- Rules never send messages if provider is not active.
- Automation writes event logs.

Test cases:

- rule triggers on order created,
- disabled rule does not trigger,
- plan-disallowed rule rejected,
- provider inactive prevents send and records safe status,
- rule cannot access another tenant order.

#### R2.2 Follow-up queue

Merchant admin must see a queue of orders needing action.

Queue reasons:

- awaiting confirmation,
- no contact attempt,
- failed contact,
- delayed dispatch,
- returned/canceled needs note,
- low stock after sale.

Acceptance criteria:

- Queue is tenant-scoped.
- Queue item explains why action is needed.
- Queue links to order detail.
- Completing action removes or updates queue reason.

Test cases:

- awaiting confirmation order appears,
- failed contact order appears,
- confirmed order removed from confirmation queue,
- cross-tenant order not shown,
- empty queue state.

### R3. Shipping Rules V2

#### R3.1 Regional shipping matrix

Merchant must configure shipping by Egyptian governorate and optionally city/area.

Acceptance criteria:

- Merchant can define shipping cost by governorate.
- Merchant can override cost by city/area.
- Merchant can define estimated delivery days per region.
- Merchant can disable shipping to unsupported regions.
- Checkout uses configured rule server-side.

Test cases:

- governorate-level cost applies,
- city override applies,
- unsupported region rejected at checkout,
- delivery estimate appears in checkout/order,
- tenant cannot read/update another tenant shipping rules.

#### R3.2 Free shipping and conditions

Merchant must configure free-shipping thresholds.

Acceptance criteria:

- Tenant can set free shipping minimum subtotal.
- Threshold applies server-side.
- Free shipping message appears on cart/checkout.
- Threshold uses tenant currency.

Test cases:

- subtotal below threshold charges shipping,
- subtotal at/above threshold sets shipping to 0,
- client cannot force free shipping,
- Arabic copy fits mobile cart/checkout.

#### R3.3 Shipping rule auditability

Order must snapshot shipping rule result at checkout.

Acceptance criteria:

- Order stores shipping cost and delivery estimate at time of checkout.
- Later shipping setting changes do not mutate old order totals.
- Admin order detail shows shipping snapshot.

Test cases:

- order keeps old shipping after settings change,
- admin sees shipping snapshot,
- order total equals subtotal plus shipping snapshot.

### R4. Analytics V2

#### R4.1 Merchant performance dashboard

Merchant must see actionable business metrics.

Minimum metrics:

- orders by status,
- gross COD revenue,
- net revenue estimate if returns/cancellations are excluded,
- average order value,
- conversion funnel if tracking exists,
- top products,
- low stock products,
- repeat customer count by phone,
- cancellation/return rate.

Acceptance criteria:

- Metrics are tenant-scoped.
- Date range filter exists.
- Empty states explain what data is needed.
- Canceled/returned revenue handling is documented and consistent.

Test cases:

- metrics for one tenant exclude another tenant,
- date range filters correctly,
- canceled orders excluded from net revenue,
- repeat customer counted by tenant-scoped phone only,
- empty merchant metrics state.

#### R4.2 Product insights

Merchant must identify which products need action.

Acceptance criteria:

- Product list can show orders sold, revenue, stock remaining, and low-stock status.
- Product detail shows recent order activity.
- Out-of-stock bestsellers are highlighted.

Test cases:

- product insights tenant scoped,
- low-stock threshold works,
- out-of-stock bestseller highlighted,
- products with no sales show zero state.

### R5. Tracking and Attribution Foundations

#### R5.1 Event model

The app must define a stable event model before sending data to external analytics.

Minimum events:

- `merchant_signup_started`
- `merchant_signup_completed`
- `merchant_onboarding_step_completed`
- `product_created`
- `storefront_viewed`
- `product_viewed`
- `cart_item_added`
- `checkout_started`
- `cod_order_created`
- `order_status_changed`
- `whatsapp_message_attempted`

Acceptance criteria:

- Events have documented payload schema.
- Events include tenant ID/slug where appropriate.
- Shopper events avoid raw PII.
- Server-side order events are emitted from trusted server path.

Test cases:

- event payload schema validation,
- no raw phone/email in shopper analytics payload,
- order event emitted once per order,
- tenant ID included for merchant/admin events.

#### R5.2 External tracking provider readiness

Platform may support GA4/Meta/TikTok later, but Phase 3 must prepare safe provider configuration.

Acceptance criteria:

- Tracking provider settings are tenant-scoped.
- Provider IDs are validated.
- Disabled providers do not receive events.
- Production event dispatch has opt-in flag.
- PII rules are enforced before dispatch.

Test cases:

- disabled provider no-op,
- invalid provider ID rejected,
- enabled provider receives allowed event,
- event with PII is rejected or sanitized.

### R6. Customer and Repeat Order Signals

#### R6.1 Tenant-scoped customer view

Merchant must see a tenant-scoped customer list based on orders.

Acceptance criteria:

- Customer identity is scoped to tenant.
- Customer list shows name, phone, order count, last order date, and total COD spend.
- Merchant can open customer order history.
- Merchant cannot see shoppers from another tenant.

Test cases:

- customer aggregation by phone within tenant,
- same phone in different tenant is separate,
- customer order history tenant-scoped,
- empty customer list state.

#### R6.2 Repeat customer markers

Merchant admin must see when an order is from a repeat customer.

Acceptance criteria:

- Order list/detail marks repeat customer when phone has previous delivered/valid orders.
- Canceled-only history does not count as repeat unless product decision changes.
- Marker is tenant-scoped.

Test cases:

- second valid order marks repeat,
- canceled-only previous order does not mark repeat,
- same phone in another tenant does not mark repeat.

### R7. Inventory Operations V2

#### R7.1 Low-stock workflow

Merchant must have actionable low-stock management.

Acceptance criteria:

- Tenant can set low-stock threshold globally or per product/variant.
- Admin dashboard shows low-stock variants.
- Low-stock warnings appear after checkout stock decrement.
- Out-of-stock variants are blocked from checkout.

Test cases:

- global threshold applies,
- variant override applies,
- checkout triggers low-stock state,
- out-of-stock variant cannot be purchased.

#### R7.2 Stock adjustment log

Manual stock changes must be auditable.

Acceptance criteria:

- Stock adjustment records variant, old stock, new stock, reason, actor, timestamp.
- Checkout stock decrement is distinguishable from manual adjustment.
- Tenant admin can see own adjustment log.
- Platform operator can inspect adjustment log for support.

Test cases:

- manual adjustment logs change,
- checkout decrement logs or records order reference,
- tenant isolation on stock logs,
- invalid negative stock rejected.

### R8. Returns and Exchanges V1

#### R8.1 Return/exchange request tracking

Merchant must track return/exchange cases without a full logistics system.

Acceptance criteria:

- Merchant can mark order as return/exchange requested.
- Merchant can record reason, requested items, note, and status.
- Return statuses include `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`, `RESOLVED`.
- Original order remains traceable.

Test cases:

- create return case,
- update return status,
- reject return for another tenant order,
- return appears on order detail.

#### R8.2 Return impact on analytics

Analytics must account for returns consistently.

Acceptance criteria:

- Returned orders/items can be excluded from net revenue.
- Dashboard shows return rate.
- Product insights show returned quantities if available.

Test cases:

- returned order affects net revenue,
- return rate calculation,
- returned product count shown.

### R9. Platform Health and Reliability

#### R9.1 Provider monitoring

Platform operator must see provider health for WhatsApp/tracking integrations.

Acceptance criteria:

- Provider failures are visible by tenant.
- Recent failed message/event dispatches are visible.
- Platform can disable provider for a tenant.
- Merchant sees clear degraded status.

Test cases:

- failed WhatsApp sends appear in platform view,
- failed tracking dispatch appears in platform view,
- disabling provider stops future dispatch,
- merchant settings show degraded/disabled state.

#### R9.2 Background processing safety

Automation and provider dispatch must be retry-safe.

Phase 3 official WhatsApp sends, automation rules, provider dispatch retries, and follow-up jobs cannot start until a Vercel-compatible background job strategy is approved. See `docs/saas-foundation-decisions.md` D5.

Acceptance criteria:

- Message/event dispatch has idempotency key.
- Retry does not duplicate customer message.
- Failed jobs can be retried or marked failed.
- Job logs include tenant and correlation ID.

Test cases:

- duplicate job does not duplicate send,
- retry after transient failure succeeds,
- permanent failure recorded,
- cross-tenant job access rejected.

### R10. Security, Privacy, and Abuse Controls

#### R10.1 Messaging abuse guardrails

WhatsApp workflows must avoid spammy or unsafe behavior.

Acceptance criteria:

- Automation rate limits per tenant.
- Merchant can only message customers connected to their orders.
- Bulk messaging is not available in Phase 3 unless separately approved.
- Message templates are limited to order operations.

Test cases:

- rate limit blocks excessive sends,
- message to phone not linked to tenant order rejected,
- bulk send endpoint absent or blocked,
- non-order template rejected.

#### R10.2 Analytics privacy

Tracking must avoid raw customer PII by default.

Acceptance criteria:

- Raw phone/email never sent to external ad/analytics providers.
- Any hashing strategy is documented and opt-in.
- Tenant can disable external tracking.
- Platform can audit tracking settings.

Test cases:

- event payload excludes raw PII,
- tracking disabled no-ops,
- tracking settings tenant-scoped,
- platform audit view works.

## 6. Browser Smoke Test Script

QA must verify this flow after Phase 1 and Phase 2 smoke scripts pass:

1. Open merchant admin on an active Growth/Pro tenant.
2. Configure shipping costs by governorate.
3. Add a city/area override.
4. Configure free shipping threshold.
5. Open storefront and complete checkout using a governorate-level rule.
6. Complete another checkout using city override.
7. Confirm order shipping snapshots are correct.
8. Open order queue and confirm follow-up queue contains new COD orders.
9. Preview WhatsApp confirmation template.
10. Send or simulate official WhatsApp message if provider is active.
11. Confirm message event log is written.
12. Change order status to dispatched and verify automation/template behavior.
13. Open merchant analytics dashboard.
14. Confirm revenue, AOV, top products, low stock, and repeat customer metrics.
15. Adjust stock manually and confirm adjustment log.
16. Create return/exchange case and update status.
17. Open platform operator provider health view.
18. Confirm provider logs, failures, tenant status, and disable controls.

Expected result:

- Shipping rules are applied server-side and snapshotted.
- WhatsApp operations are logged and tenant-scoped.
- Analytics are tenant-scoped and PII-safe.
- Automation is retry-safe and does not duplicate messages.
- Merchant has clear daily operational value beyond basic store setup.

## 7. API Test Matrix

| Area | Required coverage |
| --- | --- |
| WhatsApp provider | status, credential safety, plan gate, mock guard |
| Templates | render variables, missing optional fields, unknown template, tenant isolation |
| Message logs | success, failure, callback update, duplicate callback, tenant isolation |
| Automation rules | trigger, disabled rule, plan gate, provider inactive, tenant isolation |
| Follow-up queue | awaiting confirmation, failed contact, resolved action, empty state |
| Shipping rules | governorate cost, city override, unsupported region, free shipping threshold |
| Shipping snapshots | order retains original shipping after settings change |
| Analytics | revenue, AOV, returns/cancellations, repeat customers, tenant scoping |
| Tracking events | schema validation, PII exclusion, disabled provider, idempotency |
| Customers | tenant-scoped aggregation, repeat marker, order history |
| Inventory | low-stock threshold, stock adjustment log, negative stock rejection |
| Returns | create case, update status, tenant rejection, analytics impact |
| Provider health | failed dispatch visibility, disable provider, degraded merchant status |
| Abuse controls | message rate limit, order-linked phone validation, no bulk send |

## 8. Launch Gate

Phase 3 is complete only when all gates are green.

### Code gate

```bash
npm run check
npm test -- --detectOpenHandles --forceExit
npm run build
```

### Regression gate

- Phase 1 browser smoke script passes.
- Phase 2 browser smoke script passes.
- Tenant isolation tests pass.
- COD checkout remains atomic.
- Plan entitlements remain server-enforced.

### Operations gate

- WhatsApp template preview and event logging work.
- Official send path is provider-gated and retry-safe.
- Follow-up queue correctly identifies actionable COD orders.
- Contact/message history is visible on order detail.

### Shipping gate

- Regional shipping matrix works.
- Free shipping threshold works.
- Unsupported regions are rejected.
- Order shipping snapshot is immutable after checkout.

### Analytics gate

- Merchant analytics are tenant-scoped.
- Repeat customer signals are tenant-scoped.
- Returns/cancellations affect metrics consistently.
- External tracking excludes raw PII and respects disabled provider state.

### Reliability and privacy gate

- Provider dispatch is idempotent.
- Job/event logs include correlation IDs.
- Messaging rate limits work.
- Raw provider secrets and customer PII are not leaked.

## 9. Dependencies

- Phase 1 checkout/order correctness.
- Phase 2 plans/entitlements and platform console.
- Chosen WhatsApp provider and credential model.
- Approved background job/queue strategy or Vercel-compatible retry design as defined in `docs/saas-foundation-decisions.md` D5.
- Shipping region/city data for Egypt.
- Analytics event schema.
- Privacy decision on hashing/consent for external tracking.
- Platform support process for provider failures.

## 10. Known Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| WhatsApp automation sends duplicate messages | Customer annoyance and brand damage | Idempotency keys, logs, retry tests |
| Provider credentials leak | Security incident | Server-only secrets, response tests, redacted logs |
| Shipping rules misprice orders | Merchant loses money or shopper loses trust | Server-side rules and order snapshots |
| Analytics are inaccurate | Merchants stop trusting dashboard | Defined metric formulas and tests |
| PII sent to tracking providers | Privacy/compliance issue | PII-safe event schema and dispatch guards |
| Automation becomes spammy | Merchant/shopper trust damage | Rate limits and order-linked messaging only |
| Background jobs fail silently | Missed confirmations/follow-ups | Job logs, provider health, retry status |

## 11. Phase 3 Done Definition

Phase 3 is done when:

- Phase 1 and Phase 2 regression gates pass,
- merchant can configure regional shipping and free shipping rules,
- checkout uses shipping rules server-side and snapshots the result,
- WhatsApp templates can be previewed and sent or safely simulated through provider-gated paths,
- all message attempts are logged and retry-safe,
- merchant has a follow-up queue for COD operations,
- merchant analytics show revenue, AOV, top products, low stock, repeat customers, and returns/cancellations,
- customer/repeat-order views are tenant-scoped,
- stock adjustment logs exist,
- returns/exchanges can be tracked,
- external tracking is PII-safe and opt-in,
- provider health is visible to platform operators,
- all launch gates pass.
