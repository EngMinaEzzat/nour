# Phase 6: Integrations

## Goal

Make payments, messaging, shipping, and exports reliable through provider abstractions.

## Principle

Provider integrations must be feature-gated and observable. Mocks must never masquerade as production.

## Payments

Default path is COD. Paymob comes after checkout/order foundations are stable.

Paymob requirements:

- Unified checkout abstraction.
- Wallet support later, including Vodafone Cash where provider support is available.
- HMAC signature verification.
- Idempotency.
- Provider event logs.
- Trusted merchant/order references.
- Reconciliation job or admin retry path.
- Test/live mode separation.

## Logistics

Bosta/ShipBlu requirements:

- Provider interface for AWB creation.
- Pickup scheduling.
- Delivery status webhook.
- Idempotent webhook handling.
- Event log.
- Manual fallback if provider fails.

## Messaging

WhatsApp requirements:

- Template management.
- Send logs.
- Retry-safe sending.
- Opt-in/consent awareness.
- No cross-tenant leakage.

## Files To Inspect First

- `artifacts/api-server/src/routes/paymob.ts`
- `artifacts/api-server/src/routes/whatsapp.ts`
- `artifacts/api-server/src/routes/shipping-rules.ts`
- `lib/db/src/schema/payment-records.ts`
- `lib/db/src/schema/whatsapp.ts`
- `lib/db/src/schema/orders.ts`

## Tests

- Webhook HMAC rejects invalid signatures.
- Duplicate webhook does not duplicate state transitions.
- Provider event is logged.
- Production mode fails closed if provider env is missing.
- Tenant cannot read another tenant's provider events.
- Provider timeout/failure returns a safe error and leaves order/payment state consistent.
- Manual retry or reconciliation path can recover failed provider events.
- Test/live provider mode is visible in config and cannot be selected by client input.

## Exit Criteria

This phase is complete when integrations are reliable enough for pilot merchants and operational support can diagnose provider issues.
