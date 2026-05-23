# Security Audit - Step 4: Registration & Admin Controls

## Context for the LLM
You are working on a multi-tenant SaaS e-commerce platform built with Node.js, Express, and Drizzle ORM.
This step focuses on the authentication layer (`auth.ts`), handling merchant registration, login sessions, and password resets. The goal is to harden session management and prevent race conditions.

## Tasks & Implementation Instructions

### Task 1: Prevent Session Fixation Attacks (Medium Severity)
- **Target File**: `artifacts/api-server/src/routes/auth.ts`
- **Current State**: Upon successful login (`POST /auth/login`), the system sets `req.session.merchantId = merchant.id`. It does not regenerate the session ID. This leaves the system vulnerable to Session Fixation if an attacker forces a known session cookie onto a victim.
- **Action**: Wrap the session assignment in a `req.session.regenerate()` callback.
  ```javascript
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Session error" });
    req.session.merchantId = merchant.id;
    return res.json(buildAuthResponse(merchant, tenant));
  });
  ```

### Task 2: Mitigate Slug Registration Race Conditions (Low Severity)
- **Target Files**: `artifacts/api-server/src/routes/auth.ts` and Database Schema
- **Current State**: `POST /auth/register` does a `SELECT` to check if a slug exists, then inserts it. Two concurrent requests could bypass the `SELECT`.
- **Action**: Ensure that the database schema for `tenantsTable` has a strict `UNIQUE` constraint on the `slug` column. Verify that the `catch(err)` block in the registration route safely handles the database constraint violation error without crashing the server.

### Task 3: Harden Password Resets (Best Practice)
- **Target File**: `artifacts/api-server/src/routes/auth.ts`
- **Current State**: `POST /auth/reset-password` updates the password hash but does not invalidate active sessions.
- **Action**: Optional but recommended: Implement logic to destroy or invalidate all active sessions for the `merchantId` upon a successful password reset. (If `express-session` backed by Postgres/Redis is used, you may need to delete records matching the merchant's session data).

## Exit Criteria
1. The `/auth/login` route explicitly calls `req.session.regenerate()` before assigning the `merchantId`.
2. The `tenantsTable.slug` column is confirmed to have a `UNIQUE` constraint in the database schema.
3. The password reset flow is verified to be secure against user enumeration and replay attacks (already partially implemented, ensure tokens are marked `usedAt`).
