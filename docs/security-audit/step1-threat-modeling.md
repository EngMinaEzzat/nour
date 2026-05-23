# Step 1: Asset & Actor Threat Modeling

## Overview
This document defines the core threat model for the multi-tenant marketplace platform. Establishing strict trust boundaries and understanding actor capabilities is the foundation of the security audit.

## Actor Profiles & Scope

1. **Unauthenticated / Anonymous Shoppers**
   - **Scope**: Bound to a single tenant storefront.
   - **Risks**: Price manipulation during checkout, cart session hijacking, scraping/DDoS of storefront APIs.
   
2. **Authenticated Customers**
   - **Scope**: Bound to a single tenant storefront.
   - **Risks**: Broken Object Level Authorization (BOLA/IDOR) – e.g., viewing another customer's orders or manipulating another customer's reviews.

3. **Tenant Staff (Merchants)**
   - **Scope**: Bound to their specific `tenantId` (e.g., via `req.merchantTenantId`).
   - **Roles**: Owners, Managers, Staff.
   - **Risks**: Cross-tenant data leakage (Tenant Spoofing), Privilege Escalation (Staff acting as Owner), Mass Assignment (modifying fields like subscription tier).

4. **Platform Admins (Super Admins)**
   - **Scope**: Global (cross-tenant).
   - **Risks**: Total system takeover. Must ensure a strict "deny-by-default" policy and multi-factor/strict session control if possible.

5. **External System Actors (Providers)**
   - **Scope**: Incoming system-to-system requests (e.g., Paymob, WhatsApp/Meta).
   - **Risks**: Webhook spoofing, replay attacks, missing idempotency validation.

## Asset Modeling & Data Classification

- **Tier 1 (Critical Assets)**: `payment-records.ts`, `orders.ts`, `billing.ts`, `tenants.ts` (subscription state), `password-reset-tokens.ts`.
- **Tier 2 (Confidential Assets - PII)**: `customers.ts`, `messages.ts`.
- **Tier 3 (Operational Assets)**: `products.ts`, `categories.ts`, `cart-sessions.ts`.
- **Tier 4 (Audit Assets)**: `tenant-audit.ts`.

## Defined Trust Boundaries

1. **The Tenant Boundary**: All routes fetching Tier 1-3 assets MUST strictly enforce `eq(table.tenantId, req.merchantTenantId)` for merchants, or `eq(table.tenantId, targetTenantId)` safely verified for public routes. Trusting client-provided `req.query.tenantId` for private endpoints is an instant IDOR.
2. **The Checkout Boundary**: Prices and stock deductions MUST be computed server-side inside transactions to prevent race conditions or cart manipulation.
3. **The Webhook Boundary**: All incoming provider webhooks MUST be stateless relative to merchant cookies and MUST be cryptographically verified via HMAC or API keys.
