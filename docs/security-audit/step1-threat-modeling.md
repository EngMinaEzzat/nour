# Security Audit - Step 1: Threat Modeling & Trust Boundaries

## Context for the LLM
You are working on a multi-tenant SaaS e-commerce platform built with Node.js, Express, and Drizzle ORM. 
The system hosts multiple independent merchant stores ("tenants") from a single backend. 
Data isolation is primarily enforced via a `tenantId` column on almost all database tables. Authenticated merchant requests are intercepted by a middleware (`artifacts/api-server/src/middleware/require-role.ts`) which validates the session and injects `req.merchantTenantId` into the Request object.

Your goal in this step is to understand the platform's actor models and data assets to ensure subsequent code changes strictly adhere to these trust boundaries.

## Actor Profiles & Privilege Levels

1. **Unauthenticated / Anonymous Shoppers**
   - **Scope**: Restricted to a single tenant storefront.
   - **Threats**: Price manipulation during checkout, cart session hijacking, scraping/DDoS of storefront APIs.
   
2. **Authenticated Customers**
   - **Scope**: Restricted to a single tenant storefront.
   - **Threats**: Broken Object Level Authorization (BOLA/IDOR) – viewing or mutating another customer's orders or PII.

3. **Tenant Staff (Merchants)**
   - **Scope**: Restricted to their specific `tenantId` (via `req.merchantTenantId`).
   - **Roles**: Owners, Managers, Staff.
   - **Threats**: Cross-tenant data leakage (Tenant Spoofing), Privilege Escalation (Staff acting as Owner), Mass Assignment (e.g., modifying their own subscription tier to avoid paying).

4. **Platform Admins (Super Admins)**
   - **Scope**: Global access across all tenants.
   - **Threats**: Total system compromise. 

5. **External System Actors (Providers)**
   - **Scope**: Incoming system-to-system webhooks (Paymob, WhatsApp/Meta).
   - **Threats**: Webhook spoofing, replay attacks, missing idempotency.

## Asset Classification

- **Tier 1 (Critical)**: `payment-records.ts`, `orders.ts`, `billing.ts`, `tenants.ts` (subscription state).
- **Tier 2 (Confidential - PII)**: `customers.ts`, `messages.ts`.
- **Tier 3 (Operational)**: `products.ts`, `categories.ts`.

## Implementation Rules (Exit Criteria for Step 1)
Before proceeding to other steps, ensure you understand the following rules:
1. **The Tenant Boundary**: All private endpoints fetching Tier 1-3 assets MUST strictly enforce `eq(table.tenantId, req.merchantTenantId)`. Never trust a client-provided `req.query.tenantId` for private data.
2. **The Checkout Boundary**: Prices must always be computed server-side directly from the database.
3. **The Webhook Boundary**: Webhooks must be completely stateless (no session cookies) and cryptographically verified.
