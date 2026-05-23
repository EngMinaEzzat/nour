# Step 2: Tenant Isolation & Broken Access Control (BAC)

## Overview
This document outlines the audit findings and required remediations concerning cross-tenant data leaks (Tenant Spoofing) and Broken Access Control (BAC) vulnerabilities.

## Critical Vulnerabilities Identified

### 1. Dashboard Analytics IDOR (High Severity)
- **Target**: `artifacts/api-server/src/routes/dashboard.ts`
- **Issue**: The endpoints `/dashboard/merchant-analytics`, `/dashboard/summary`, and `/dashboard/activity` are mounted globally without the `requireRole` or `requireAuth` middlewares.
- **Exploit Vector**: An unauthenticated attacker (or a competitor) can repeatedly call `/api/dashboard/merchant-analytics?tenantId=X` and extract the full financial analytics, average order values, and customer counts of any store on the platform.
- **Remediation**: 
  - Wrap these routes in `requireRole("owner", "manager", "staff")`.
  - Refactor the code to extract the target tenant from `req.merchantTenantId` instead of trusting `req.query.tenantId`.

### 2. Mass Assignment in Tenant Profile Updates (Medium Severity)
- **Target**: `artifacts/api-server/src/routes/tenants.ts` (`PUT /tenants/:id`)
- **Issue**: While the route correctly validates that `req.merchantTenantId === paramsParsed.data.id`, it passes the parsed `UpdateTenantBody` directly into the database update query.
- **Exploit Vector**: If the Zod schema (`UpdateTenantBody`) permits fields like `planCode` or `subscriptionStatus`, a malicious merchant could send a payload explicitly setting their own plan to `"pro"` and status to `"active"`, bypassing the billing gateway.
- **Remediation**: Explicitly omit sensitive fields (`planCode`, `subscriptionStatus`, `status`) from the payload before applying the DB update, or tighten the Zod schema to reject them entirely on this route.

### 3. Suspended Tenant Data Leaks (Low Severity)
- **Target**: `GET /products` (Public Catalog)
- **Issue**: Anonymous shoppers query `?tenantId=X` to fetch products. Currently, if a store (`tenantId`) has a `status` of `"suspended"` or `"inactive"`, the catalog might still be publicly queryable.
- **Remediation**: Ensure that queries for public data strictly join against `tenantsTable` and enforce `eq(tenantsTable.status, 'active')`.
