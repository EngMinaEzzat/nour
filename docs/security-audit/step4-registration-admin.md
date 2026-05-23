# Step 4: Registration & Admin Controls

## Overview
This document covers the deep-dive security review of the authentication layer (`auth.ts`), including merchant registration, session management, password resets, and platform administrator bootstrapping.

## Audit Findings & Action Plan

### 1. Registration & Store Slug Handling (Low Risk / Enhancement)
- **Target**: `POST /auth/register` and `GET /auth/check-slug`
- **Findings**:
  - **Strengths**: The application implements a solid `normalizeSlug` function to strip malicious characters, preventing XSS and injection in store URLs. It also restricts sensitive slugs via `RESERVED_SLUGS`.
  - **Weakness (Race Condition)**: The route performs a `SELECT` check to see if the slug is available, followed by a separate database transaction to `INSERT`. A race condition could allow two concurrent requests to pass the `SELECT` check.
  - **Remediation**: Ensure the `tenantsTable.slug` column has a strict `UNIQUE` constraint at the database schema level (in `schema.ts`) so that even if the race condition occurs, the database throws a constraint error and the transaction safely rolls back.

### 2. Session Management & Fixation Risks (Medium Severity)
- **Target**: `POST /auth/login`
- **Findings**:
  - **Strengths**: Passwords are securely hashed with `bcrypt.hash(password, 12)`, which provides strong resistance to offline cracking.
  - **Weakness (Session Fixation)**: Upon successful authentication, the route assigns `req.session.merchantId = merchant.id` directly. Using standard `express-session`, this does NOT automatically regenerate the underlying session cookie. An attacker who forces a victim to use a known session cookie could hijack the session post-login.
  - **Remediation**: Wrap the login assignment inside a `req.session.regenerate()` callback to guarantee a completely new session ID is issued upon privilege elevation (login).

### 3. Password Reset Security (Low Risk / Best Practice)
- **Target**: `POST /auth/forgot-password` and `POST /auth/reset-password`
- **Findings**:
  - **Strengths**: Highly secure. Uses `crypto.randomBytes(32)` for token generation, returns generic `{ ok: true }` responses to prevent user enumeration, and explicitly avoids leaking the token in API responses if email delivery fails. Tokens are invalidated via a `usedAt` timestamp.
  - **Weakness (Session Invalidation)**: Resetting the password updates the hash but does not actively destroy existing active sessions for that merchant.
  - **Remediation**: While optional, a best practice for password resets is to either rotate a `sessionVersion` counter in the database (which the session middleware checks) or clear all active sessions for the user to forcefully log out any potentially compromised sessions.

### 4. Rate Limiting (Secure)
- **Target**: `authLimiter`
- **Findings**:
  - **Strengths**: The global `authLimiter` correctly applies a limit of 10 requests per 15 minutes per IP address to all sensitive `/auth` endpoints. This is highly effective against brute-forcing and credential stuffing.
  - **Status**: No changes required.

### 5. Admin Bootstrap Safety (Secure)
- **Target**: `POST /auth/bootstrap-platform-admin`
- **Findings**:
  - **Strengths**: The endpoint checks `if (process.env.NODE_ENV === "production") return res.status(404)`, completely neutralizing the route in live environments. It also mandates a `PLATFORM_ADMIN_SECRET`.
  - **Status**: No changes required.
