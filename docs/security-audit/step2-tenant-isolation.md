# Security Audit - Step 2: Tenant Isolation & Broken Access Control (BAC)

## Context for the LLM
You are working on a multi-tenant SaaS e-commerce platform built with Node.js, Express, and Drizzle ORM. 
The system relies on `req.merchantTenantId` (injected by auth middleware) to isolate data between different stores. 
Currently, there are severe Broken Access Control (IDOR) vulnerabilities and Mass Assignment risks in the platform that allow merchants to steal competitor data or bypass billing.

## Tasks & Implementation Instructions

### Task 1: Fix Dashboard Analytics IDOR (High Severity)
- **Target File**: `artifacts/api-server/src/routes/dashboard.ts`
- **Current State**: The endpoints `/dashboard/merchant-analytics`, `/dashboard/summary`, and `/dashboard/activity` are mounted globally without any authentication middleware. They extract `tenantId` from `req.query.tenantId`.
- **Action**: 
  1. Wrap the merchant-specific routes (like `/merchant-analytics`) in the `requireRole("owner", "manager", "staff")` middleware.
  2. Wrap global platform routes (`/summary`, `/activity`) in the `requirePlatformAdmin` middleware.
  3. Inside the merchant routes, completely remove the use of `req.query.tenantId`. Replace it with `req.merchantTenantId`.

### Task 2: Prevent Mass Assignment in Tenant Profiles (Medium Severity)
- **Target File**: `artifacts/api-server/src/routes/tenants.ts`
- **Current State**: `PUT /tenants/:id` accepts `UpdateTenantBody` from the client and spreads it directly into the database update query.
- **Action**: 
  1. Ensure the user payload is sanitized before the `.set(...)` method is called.
  2. Explicitly strip or delete `planCode`, `subscriptionStatus`, and `status` from the incoming payload so merchants cannot upgrade their own accounts for free.

### Task 3: Secure Suspended Tenant Catalog (Low Severity)
- **Target File**: `artifacts/api-server/src/routes/products.ts` (or wherever public products are fetched)
- **Current State**: Anonymous shoppers can query `?tenantId=X` to fetch products. If the store is suspended, the catalog might still leak.
- **Action**: Modify public read queries to join against `tenantsTable` and enforce a `WHERE tenantsTable.status = 'active'` clause.

## Exit Criteria
1. The `dashboard.ts` file has no endpoints accessible without `requireRole` or `requirePlatformAdmin`.
2. The `/dashboard/merchant-analytics` endpoint ignores `req.query.tenantId` and strictly uses `req.merchantTenantId`.
3. The `PUT /tenants/:id` endpoint explicitly drops billing-related fields (`planCode`, `subscriptionStatus`, `status`) from the payload before hitting the database.
4. Public product endpoints do not return data for suspended tenants.
