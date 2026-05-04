# نور — Egyptian Fashion & Beauty SaaS Platform

## Overview

Multi-tenant SaaS platform for Egyptian merchants to create and manage their own fashion and cosmetics stores (Shopify-style, not a marketplace). Full Arabic RTL UI with Framer Motion animations.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (via Orval-generated schemas), `drizzle-zod`
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Frontend**: React + Vite, Framer Motion, Cairo/Tajawal + Cormorant Garamond fonts, RTL
- **Storefront design**: Premium redesign (2025) — blush/ivory/champagne palette, serif headings, 15 section components in `src/components/storefront/`
- **Store Builder** (`/store-builder`): 6-step onboarding wizard + full visual WYSIWYG editor. Config types in `src/lib/store-config.ts`. Components in `src/components/editor/` and `src/components/onboarding/`. AI assistant panel, readiness checklist, 30-item undo/redo history.
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only, interactive — use SQL directly for CI)

## Architecture

```
artifacts/
  api-server/          Express API server (port via $PORT, path /api)
    src/routes/
      auth.ts            POST /auth/register, /auth/login, /auth/logout, GET /auth/me
      tenants.ts         CRUD for tenants + support notes + plan updates
      products.ts        Product catalog — requireRole on mutations, 402 at plan limit
      categories.ts      Product categories — tenant-scoped
      orders.ts          Order management — atomic tx, stock decrement, status history, contact attempts
      dashboard.ts       Platform-level analytics summary + activity feed
      analytics.ts       GET /analytics/merchant (V2 with date range), /analytics/products, /analytics/customers
      shipping.ts        Bosta carrier integration
      shipping-rules.ts  GET/POST/PUT/DELETE /shipping/zones; GET/PUT /shipping/settings; POST /shipping/calculate
      whatsapp.ts        GET/PUT /whatsapp/provider; GET /whatsapp/templates; POST /whatsapp/templates/preview;
                         POST /whatsapp/messages/send; GET /whatsapp/messages; POST /whatsapp/messages/:id/callback
      automation.ts      GET/POST/PUT/DELETE /automation/rules (plan-gated: growth+)
      follow-up.ts       GET /follow-up/queue (tenant-scoped priority queue)
      returns.ts         GET/POST /returns; GET/PUT /returns/:id
      stock-logs.ts      GET /stock/adjustments; POST /stock/adjustments (manual stock adjustment + log)
      onboarding.ts      GET/PATCH /onboarding
      customers.ts       Customer directory
      plans.ts           GET /plans, GET /plans/entitlements
      platform.ts        GET /platform/stats; GET /platform/health-scores; GET /platform/provider-health; PUT /platform/provider-health/:tenantId/disable
                         GET /platform/merchants; PUT /platform/merchants/:tenantId/status (suspend/activate)
                         GET /platform/transfer-requests; PUT /platform/transfer-requests/:id/approve; PUT /platform/transfer-requests/:id/reject
      staff.ts           GET/POST/DELETE/PUT /staff; GET/POST/DELETE /staff/invitations; GET /staff/invitations/accept/:token
      store-settings.ts  GET /store-settings; PUT /store-settings/seo; PUT /store-settings/social; PUT /store-settings/branding
      paymob.ts          POST /paymob/init; POST /paymob/callback; POST /paymob/hmac-verify
      billing.ts         GET /billing/status; GET /billing/bank-details
                         GET /billing/invoices; GET /billing/invoices/:tenantId (admin); POST /billing/invoices (admin); PUT /billing/invoices/:id (admin)
                         POST /billing/transfer-request (merchant submits bank transfer); GET /billing/transfer-requests (merchant view own)
      domains.ts         GET /domains; POST /domains; POST /domains/verify; DELETE /domains/:id
      tracking.ts        GET/POST/PUT/DELETE /tracking/pixels; GET /tracking/snippet/:tenantId
      exports.ts         POST /exports/jobs; GET /exports/jobs; GET /exports/jobs/:id/download
      audit.ts           GET /audit/logs
    src/lib/
      entitlements.ts    Plan definitions: starter(299/30p), growth(699/200p), pro(1499/unlimited)
      require-role.ts    requireRole, requirePlatformAdmin middleware (new roles: catalog_manager, order_operator, marketing_analyst)
  fashion-store/       React + Vite frontend (path /)
    src/pages/
      pricing.tsx        Public pricing page with plan cards fetched from API
      platform.tsx       Platform operator console (isPlatformAdmin required) — tabs: التجار | المدفوعات | المتاجر | صحة المنصة
                         Payments tab: TransferRequestCard with approve/reject dialogs + Paymob reconciliation summary
      dashboard.tsx      Analytics + OnboardingChecklist + PlanUsageCard
      analytics.tsx      V2 analytics: date range picker, KPIs, charts, top products, low stock
      shipping-rules.tsx Regional shipping matrix + free shipping settings
      follow-up.tsx      Follow-up queue with priority indicators
      returns.tsx        Returns/exchange case list + create/update dialogs
      automation.tsx     Automation rules management (plan-gated)
      order-detail.tsx   Order detail + status history + contact attempts + WhatsApp + Bosta
      tenant-detail.tsx  Store detail + platform admin panel (plan mgmt + support notes)
      orders.tsx         Order list with search
      products.tsx       Products with entitlement enforcement
      store-settings.tsx Store profile editor + SeoSection + SocialSection
      staff.tsx          Staff management + invite-by-link dialog + invitations panel + 6 roles
      billing.tsx        SaaS billing — trial countdown banner + suspended banner + current plan card
                         Plan cards (starter/growth/pro) + bank details (collapsible) + transfer request form (with image upload to /uploads/image)
                         Transfer request history + invoice history
      domains.tsx        Custom domain management — add/verify/remove
      tracking.tsx       Tracking pixels — Meta Pixel, Google Analytics, TikTok, Snapchat
      exports.tsx        Data export jobs — orders, products, customers CSV
      growth.tsx         Growth tips + platform feature discovery
    src/components/
      layout.tsx         Nav with all Phase 1–4 links

lib/
  api-spec/            OpenAPI 3.1 spec + orval.config.ts (2160+ lines)
  api-client-react/    Generated React Query hooks + fetch client
  api-zod/             Generated Zod validation schemas
  db/                  Drizzle ORM schema + migrations
    schema/
      tenants.ts           Tenant table + planCode, subscriptionStatus, lowStockThreshold
                           Phase 4: favicon_url, seo_title, seo_description, social_links JSONB,
                                    footer_contact JSONB, custom_domain, custom_domain_verified
      merchants.ts         Merchant table + isPlatformAdmin boolean
                           Phase 4: merchant_role expanded (catalog_manager, order_operator, marketing_analyst)
      products.ts          Products + product_variants + lowStockThreshold
      categories.ts        Product categories (nullable tenantId — null=global)
      orders.ts            Orders + order_items + order_status_history
      customers.ts         Customers
      onboarding.ts        merchant_onboarding table
      contact-attempts.ts  contact_attempts table
      support-notes.ts     tenant_support_notes table
      audit-log.ts         plan_audit_log table
      shipping-rules.ts    shipping_zones + shipping_settings tables
      whatsapp.ts          whatsapp_providers + whatsapp_message_logs tables
      automation.ts        automation_rules table
      returns.ts           return_cases table
      stock-logs.ts        stock_adjustment_logs table
      payment-records.ts   payment_records table (Phase 4)
      billing.ts           billing_invoices table
      billing-transfer-requests.ts  billing_transfer_requests table + transfer_request_status enum (pending/approved/rejected)
      domains.ts           custom_domains table (Phase 4)
      tracking.ts          tracking_pixels table (Phase 4)
      staff-invitations.ts staff_invitations table + invite token (Phase 4)
      export-jobs.ts       export_jobs table (Phase 4)
      tenant-audit.ts      tenant_audit_logs table (Phase 4)
```

## DB Tables

### Phase 1+2
- `tenants` — store profiles + `plan_code`, `subscription_status`, `low_stock_threshold`
- `merchants` — store owners + `is_platform_admin` boolean
- `categories` — product categories (tenantId nullable: null=global)
- `products` + `product_variants` — products with price, stock, images, variants, `low_stock_threshold`
- `orders` + `order_items` — customer orders (atomically created with stock decrement)
- `order_status_history` — full status change log per order
- `customers` — customer directory
- `merchant_onboarding` — 6-step onboarding progress per tenant
- `contact_attempts` — records phone/whatsapp/email contact attempts on orders
- `tenant_support_notes` — internal platform admin notes per tenant
- `plan_audit_log` — audit trail of plan/subscription status changes
- `sessions` — connect-pg-simple session store

### Phase 3
- `shipping_zones` — regional shipping cost matrix (governorate + optional city, cost, delivery days)
- `shipping_settings` — per-tenant default cost + free shipping threshold
- `whatsapp_providers` — tenant WhatsApp provider config (status, credentials server-side only)
- `whatsapp_message_logs` — every WhatsApp send attempt with idempotency key + delivery status
- `automation_rules` — trigger→action rules per tenant (plan-gated, growth+)
- `return_cases` — return/exchange case tracking with status flow
- `stock_adjustment_logs` — auditable stock changes (manual/checkout/return/correction)

### Phase 4 (New)
- `payment_records` — Paymob payment records (orderId, amount, status, transactionId, paidAt)
- `billing_subscriptions` — SaaS subscription records per tenant (planCode, billingCycle, status, renewedAt, cancelledAt)
- `billing_invoices` — invoice records (amount, status, paidAt, receiptUrl)
- `custom_domains` — tenant custom domain requests (domain, verified, verificationToken, verifiedAt)
- `tracking_pixels` — marketing pixel configs (provider: meta/google/tiktok/snapchat, pixelId, enabled)
- `staff_invitations` — invite-by-link tokens (email, role, token, expiresAt, status: pending/accepted/expired/revoked)
- `export_jobs` — async CSV export jobs (type: orders/products/customers, status, downloadUrl, filters JSONB)
- `tenant_audit_logs` — tenant-level audit trail (actorId, action, entityType, entityId, before/after JSONB, ip)

## Plans

| Code    | Price (EGP/mo) | Products | Orders/mo | Staff | WhatsApp |
|---------|---------------|----------|-----------|-------|----------|
| starter | 299           | 30       | 100       | 1     | ✗        |
| growth  | 699           | 200      | 500       | 3     | ✗        |
| pro     | 1499          | unlimited| unlimited | 10    | ✓        |

Defined in `artifacts/api-server/src/lib/entitlements.ts`.

## Auth Flow

1. `POST /api/auth/register` → creates merchant + tenant + 4 default categories + onboarding record (all in 1 transaction), sets session
2. `POST /api/auth/login` → validates password, sets session cookie
3. `POST /api/auth/logout` → destroys session
4. `GET /api/auth/me` → returns current merchant+tenant from session, including `isPlatformAdmin`, `planCode`, `subscriptionStatus`

Session stored in PostgreSQL via `connect-pg-simple`. Cookie is httpOnly, secure in prod.
**Important**: The `sessions` table must be created manually:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
```

## Platform Admin

- `isPlatformAdmin` boolean on `merchants` table
- Bootstrap: `POST /api/auth/bootstrap-platform-admin` with `{ email, password, name }` + `X-Platform-Admin-Secret: $PLATFORM_ADMIN_SECRET` header
- Middleware: `requirePlatformAdmin` in `src/lib/require-role.ts`
- Platform console at `/platform` — two tabs: المتاجر (stores list) | صحة المنصة (health scores)
- Health scores: `GET /platform/health-scores` — per-tenant composite score (0–100) with flags
- Provider health: `GET /platform/provider-health` — WhatsApp send stats + recent failures per tenant

## Staff Roles (Phase 4 Expanded)

| Role | Arabic | Access |
|------|--------|--------|
| `owner` | مالك | Full access: settings, billing, team |
| `manager` | مدير | Products, orders, customers, reports |
| `catalog_manager` | مدير كتالوج | Products, categories, stock only |
| `order_operator` | موظف طلبات | Orders, shipping processing only |
| `marketing_analyst` | محلل تسويق | Reports, analytics, customers (read) |
| `staff` | موظف | View orders + limited product view |

Staff invitations: `POST /staff/invitations` creates a 7-day token link; `GET /staff/invitations/accept/:token` accepts it.

## Phase 4 Features

### Paymob Payments
- `POST /paymob/init` — creates Paymob payment intent, returns iframe URL
- `POST /paymob/callback` — handles payment webhook from Paymob
- `POST /paymob/hmac-verify` — HMAC validation helper
- Secrets: `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`

### SaaS Billing
- `GET /billing/subscription` — current subscription status + next renewal
- `GET /billing/invoices` — invoice history
- `POST /billing/upgrade` — upgrade plan
- `POST /billing/cancel` — cancel subscription

### Custom Domains
- `GET /domains` — list tenant domains
- `POST /domains` — add custom domain (generates CNAME verification token)
- `POST /domains/verify` — check DNS propagation
- `DELETE /domains/:id` — remove domain

### Tracking Pixels
- Supports: Meta Pixel, Google Analytics (GA4), TikTok Pixel, Snapchat Pixel
- `GET /tracking/snippet/:tenantId` — generates combined JS snippet for storefront injection

### Data Exports
- Async export jobs: orders, products, customers
- `POST /exports/jobs` — enqueue export
- `GET /exports/jobs/:id/download` — download CSV when ready

### SEO Controls (store-settings)
- `PUT /store-settings/seo` — set seoTitle + seoDescription on tenant
- `PUT /store-settings/social` — set social links (instagram, facebook, tiktok, whatsapp) + footer contact (email, phone)
- Live Google SERP preview shown while editing

### Platform Health Scores
- `GET /platform/health-scores` — returns per-tenant composite score (0–100) with issue flags
- Score factors: has products, has orders, onboarding complete, has logo, has domain
- Displayed as progress bars with color coding (green ≥80, yellow ≥50, red <50)

## WhatsApp Operations (Phase 3)

- Provider status: `NOT_CONFIGURED | CONFIGURED_DISABLED | ACTIVE | ERROR | PLAN_DISALLOWED`
- Only `pro` plan tenants can configure WhatsApp
- 6 predefined Arabic templates
- All sends have idempotency key to prevent duplicate messages
- Message logs never expose credentials or raw secrets

## Shipping Rules V2 (Phase 3)

- `GET /shipping/zones` — list tenant shipping zones
- `POST /shipping/zones` — create zone (governorate + optional city override)
- `POST /shipping/calculate` — public endpoint: calculate shipping cost from governorate/city/subtotal
- Free shipping: configured in `shipping_settings.free_shipping_min_subtotal`

## Analytics V2 (Phase 3)

- `GET /analytics/merchant?dateFrom=&dateTo=` — gross revenue, net revenue, AOV, cancellation rate, return rate, repeat customer count, sales by day, top products, low stock products
- `GET /analytics/products` — per-product insights
- `GET /analytics/customers` — customer aggregation

## Frontend Pages

| Path | Description |
|------|-------------|
| `/` | Homepage — hero, trending, featured stores |
| `/pricing` | Public pricing page — 3 plan cards |
| `/login` | Merchant login (Arabic) |
| `/register` | Merchant registration (Arabic) |
| `/dashboard` | Protected — analytics + onboarding checklist + plan usage card |
| `/analytics` | Protected — V2 analytics with date range, KPIs, charts, low stock |
| `/orders` | Protected — order management |
| `/orders/:id` | Protected — order detail + contact attempts + WhatsApp templates |
| `/follow-up` | Protected — follow-up queue with priority indicators |
| `/returns` | Protected — return/exchange case management |
| `/products` | Protected — product catalog (entitlement-enforced) |
| `/customers` | Protected — customer directory with repeat markers |
| `/shipping-rules` | Protected — regional shipping matrix + free shipping settings |
| `/automation` | Protected — automation rules (plan-gated: growth+) |
| `/categories` | Category browser |
| `/store-settings` | Protected — store profile editor + SEO + social links |
| `/staff` | Protected — staff management + invite-by-link + invitations panel |
| `/billing` | Protected — SaaS billing + invoice history + upgrade |
| `/domains` | Protected — custom domain management |
| `/tracking` | Protected — tracking pixels (Meta, GA4, TikTok, Snapchat) |
| `/exports` | Protected — data export jobs (orders/products/customers CSV) |
| `/growth` | Protected — growth tips + feature discovery |
| `/platform` | Protected (platform admin) — stores list + health scores tabs |
| `/store/:slug` | Public storefront |
| `/tenants/:id` | Store detail + platform admin panel |

## High-Value Features (Post Phase 4)

### Discount Codes (`/discounts`)
- DB: `discount_codes` (id, tenantId, code, type, value, minOrderAmount, maxUses, usedCount, startsAt, expiresAt, active) + `discount_code_uses` (tracks each use)
- Backend: CRUD at `/api/discounts` (requireRole owner/manager) + `POST /api/discounts/validate` (public) + `POST /api/discounts/use` (records use + increments counter)
- Frontend: merchant page at `/discounts` — stats cards, create/edit dialog (random code generator, type selector, expiry), active toggle, delete confirm
- Checkout: coupon input field in order summary → validate → shows animated "discount applied" state → records usage after order created

### Product Reviews (`/reviews` merchant + product pages)
- DB: `product_reviews` (id, productId, tenantId, customerName, customerEmail, rating 1-5, body, status: pending/approved/rejected)
- Backend: `GET /reviews/public/:productId` (approved only + avg rating, public), `POST /reviews` (public submit), `GET /reviews` (merchant, filterable by status/productId), `PUT /reviews/:id/status`, `DELETE /reviews/:id`
- Frontend merchant page: tabs (pending/approved/rejected/all), review cards with approve/reject/delete actions, pending badge count
- Product detail page: reviews section below add-to-cart — list of approved reviews + avg stars, inline review submission form with interactive star picker, success state, "awaiting moderation" note

### Abandoned Cart Recovery (`/abandoned-carts`)
- DB: `cart_sessions` (sessionId UUID, tenantId, customerName/Email/Phone, items JSONB, totalAmount, itemCount, status: active/abandoned/converted, lastActivityAt)
- Backend: `POST /api/cart/sync` (public — upsert per-tenant cart from browser), `POST /api/cart/contact` (save customer info when filling checkout form), `POST /api/cart/convert` (mark converted after order), `GET /api/abandoned-carts` (merchant — auto-marks stale >2h as abandoned, returns stats), `POST /api/abandoned-carts/:id/remind` (generate pre-filled wa.me WhatsApp link), `DELETE /api/abandoned-carts/:id`
- use-cart.tsx: generates UUID sessionId stored in localStorage, debounces server sync (1.5s) on every item change, groups by tenantId
- checkout.tsx: syncContact() debounced 1.2s — saves name/email/phone as customer types; calls convert after order
- Frontend merchant page: stats cards (abandoned count, value, with-phone count, active), tab switch (abandoned/active), cart cards with customer avatar, items preview, time-ago, WhatsApp button opens wa.me deep link, delete action, info banner showing how many can be contacted

### Inventory Alerts (`/inventory-alerts`)
- DB: uses existing `products.low_stock_threshold` (nullable per-product override) + `tenants.low_stock_threshold` (global default 5) — no new tables needed
- Backend: `GET /api/inventory-alerts` (lists products where stock ≤ COALESCE(per-product threshold, global threshold), returns stats), `PUT /api/inventory-alerts/settings` (update global threshold on tenant), `PUT /api/inventory-alerts/product/:id` (per-product override; null = revert to global), `POST /api/inventory-alerts/notify` (generate wa.me link with full low-stock summary message)
- Frontend page: stats cards (out-of-stock, critical 1–3, low-stock, total), global threshold editor, product table with stock bar, color-coded badge (نفذ/حرج/منخفض), per-product threshold edit dialog, WhatsApp notify dialog that opens pre-filled message

## Critical Gaps Fixed (Post Phase 4)

### Staff Invitation Acceptance (`/accept-invite?token=xxx`)
- Public page — no auth required
- `GET /api/staff/invitations/preview/:token` — returns `{ invitedEmail, role, tenantName, expiresAt }` without auth
- `POST /api/staff/invitations/:token/accept` — creates merchant account with `{ name, password }`
- Flow: token preview → confirm invitation details → fill name+password → account created → redirect to login
- Handles invalid/expired/revoked tokens gracefully

### Paymob Checkout Fix
- Fixed URL: was calling `/api/payments/paymob/init` (404) → now `/api/paymob/initiate` (correct)
- Fixed response field: was reading `iframeUrl` → now reads `iframeSrc` (what backend actually returns)
- Error message now uses `initData.error` from backend instead of a hardcoded string

### Image Upload System (`POST /api/uploads/image`)
- multer disk storage, 5MB limit, JPG/PNG/WebP/GIF/AVIF
- Files stored in `artifacts/api-server/uploads/` directory
- Served statically at `/api/uploads/<filename>`
- Returns `{ url: "/api/uploads/<filename>" }`
- Protected by `requireRole("owner","manager","catalog_manager","staff")`
- `ImageUpload` component (`src/components/image-upload.tsx`) — dual-mode: URL paste OR file upload with drag-and-drop, preview thumbnail with remove button
- Wired into products.tsx product image field

## Email (Resend)

Password reset emails are sent via [Resend](https://resend.com).

**To activate email sending:**
1. Sign up at resend.com and get your API key
2. Go to the **Secrets** tab in the Replit sidebar (the lock icon)
3. Add a secret named `RESEND_API_KEY` with your key as the value
4. Optionally set `EMAIL_FROM` to your verified sender address (default: `نور <noreply@nour.eg>`)
5. Restart the API server workflow

Without `RESEND_API_KEY`, the forgot-password flow still works — it shows the reset link directly on screen instead of emailing it.

## Important Notes

- `lib/api-zod/src/index.ts` must only export `./generated/api/api` (not `./generated/types` or `./generated/api.schemas`)
- Auth Zod schemas are named `RegisterMerchantBody` / `LoginMerchantBody`
- Arabic fonts (Cairo + Tajawal) loaded via `index.html` link tags, NOT CSS @import
- `bcryptjs` used (not `bcrypt`) to avoid native build issues
- Session cookie is `sameSite: "none"` in production, `"lax"` in dev
- `zod/v4` works in lib/db (tsc-compiled) but NOT in api-server routes (esbuild) — use `@workspace/api-zod` for validation in routes
- `requireRole("owner","manager","staff")` middleware sets `req.merchantTenantId` from session
- Phase 3+ frontend pages use direct React Query `useQuery`/`useMutation` with `fetch` (not Orval-generated hooks)
- DB push is interactive (drizzle-kit) — use SQL migrations directly via `executeSql` code_execution tool

## Sprint 1 — Security Hardening (complete)

- **CSRF**: `csrf-csrf` v4 double-submit cookie pattern in `src/lib/csrf.ts`, wired in `app.ts`. Webhook paths exempted via `isCsrfExempt`. Frontend fetches CSRF token on load via `fetchAndSetCsrfToken` in `custom-fetch.ts`.
- **File uploads**: `src/routes/uploads.ts` uses `memoryStorage` + `file-type` magic-byte validation (JPG/PNG/WebP/GIF/AVIF) + UUID rename. No path traversal possible.
- **AI guardrails**: Locked system prompt (cannot be overridden by user input), 4000-char input truncation, 2000 `max_tokens` cap, per-merchant rate limit (20/hour in-memory map) in `src/lib/ai-rate-limit.ts`. Applied to all 5 AI routes.

## Sprint 2 — Performance & Scalability (complete)

- **Redis session store**: `buildSessionStore()` in `app.ts` — uses `connect-redis` + `redis` (node-redis) when `REDIS_URL` is set, falls back to `connect-pg-simple` (dev-safe, no crash).
- **Subscription cache**: 60-second TTL in-memory `Map<tenantId, SubscriptionCacheEntry>` in `require-role.ts`. Eliminates per-request DB query for auth. Invalidated via `invalidateSubscriptionCache(tenantId)` on suspend/activate/approval in `platform.ts`.
- **DB indexes** (created via SQL migration):
  - `idx_orders_tenant_created_at` ON orders(tenant_id, created_at DESC)
  - `idx_orders_tenant_status` ON orders(tenant_id, status)
  - `idx_products_tenant_status` ON products(tenant_id, status)
  - `idx_products_tenant_featured` ON products(tenant_id, featured)
  - `idx_cart_sessions_tenant_last_activity` ON cart_sessions(tenant_id, last_activity_at DESC)
- **Rate limiters** (`src/lib/rate-limiters.ts`):
  - `storefrontLimiter` — 200 req/min per IP → `GET /store/:slug`
  - `checkoutLimiter` — 10 req/min per IP → `POST /orders`
  - `exportLimiter` — 5 req/hr per tenantId → `POST /exports`
  - `aiLimiter` — 20 req/hr per tenantId → all 5 AI routes
- Phase 4 new enum types: `pixel_provider`, `export_job_type`, `export_job_status`, `invitation_status`
- New roles added to `merchant_role` enum: `catalog_manager`, `order_operator`, `marketing_analyst`
- New columns on `tenants` table: `favicon_url`, `seo_title`, `seo_description`, `social_links`, `footer_contact`, `custom_domain`, `custom_domain_verified`
- Middleware path: `../middleware/require-role` (NOT `../lib/require-role`) in Phase 4 routes

## Sprint 3 — SEO / SSR (complete)

- **`usePageMeta` hook** (`artifacts/fashion-store/src/hooks/use-page-meta.ts`): sets `<title>`, `<meta name="description">`, Open Graph tags (`og:title/description/image/type/url`), Twitter card, canonical `<link rel="canonical">`, and injects a `<script type="application/ld+json">` JSON-LD block. Accepts a `PageMetaOptions | null` and a deps array; cleans up all injected tags on unmount.
- Applied to `storefront.tsx` — OnlineStore JSON-LD with offer catalog item count. Favicon + `--storefront-primary` CSS var are in a separate `useEffect` to avoid conflicts.
- Applied to `product-detail.tsx` — Product JSON-LD with Offer (price, priceCurrency: EGP, availability) + AggregateRating if reviews exist.
- **Bot prerender endpoint** (`artifacts/api-server/src/routes/seo.ts`): detects Googlebot/Bingbot/social crawlers via User-Agent. Renders minimal SSR HTML for `GET /api/seo/store/:slug` and `GET /api/seo/product/:id` with full OG meta + JSON-LD. Bot detection uses 15-entry regex list.
- `seoRouter` registered in `routes/index.ts`.

## Sprint 4 — Tenant Isolation Hardening (complete)

Audited all ~30 routes. Isolation was already correct for: customers (scoped via orders join), analytics, reviews, orders mutations, products list, stock-logs, returns, automation, discounts. **Gaps fixed:**

1. **`GET /orders/:id`** — Added soft tenant check: if the caller is an authenticated merchant (`req.merchantTenantId` set), the order's `tenantId` must match. Unauthenticated storefront customers (order confirmation page) are still allowed through.
2. **`POST /products/:id/variants`** — Added product ownership check before variant creation.
3. **`PUT /products/:id/variants/:variantId`** — Added product ownership check before variant update.
4. **`DELETE /products/:id/variants/:variantId`** — Added product ownership check before variant deletion.
All 4 return `403 + Arabic error` on cross-tenant access.

## Sprint 5 — i18n + Egyptian Features (complete)

- **Egyptian utilities** (`artifacts/api-server/src/lib/egypt.ts`):
  - `isValidEgyptianPhone(raw)` / `normaliseEgyptianPhone(raw)` — validates Egyptian mobile numbers (010/011/012/015 prefixes, all international formats), normalises to E.164 (`+20XXXXXXXXXX`).
  - `formatEGP(amount)` — Arabic locale EGP formatter via `Intl.NumberFormat("ar-EG", { style:"currency", currency:"EGP" })`.
  - `EGYPT_GOVERNORATES` — complete list of all 27 Egyptian governorates with Arabic name, English name, ISO 3166-2:EG code, and geographic region tag.
  - `findGovernorate(name)` — lookup by Arabic or English name.
- **Phone validation in checkout** (`POST /orders`): validates `customerPhone` against Egyptian mobile regex before entering the DB transaction; rejects with `PHONE_ERROR_AR` Arabic message. Valid numbers are stored normalised to E.164.
- **Governorates API** (`GET /egypt/governorates`) — public endpoint returning all 27 governorates for use in shipping-zone dropdowns. Registered in `routes/index.ts`.
- **Arabic error messages**: translated all remaining English `{ error: "..." }` strings across: `categories.ts`, `customers.ts`, `dashboard.ts`, `onboarding.ts`, `plans.ts`, `products.ts`, `orders.ts`, `tenants.ts`, `platform.ts`. All user-facing error strings are now Arabic.
- Platform admin dashboard activity messages left in English (internal only, seen only by platform admins).

## Sprint 6 — Plan Model Fixes (complete)

- **Monthly order limit enforcement** (`POST /orders`): before entering the DB transaction, queries the tenant's `planCode` + `subscriptionStatus`. If the plan has a `monthlyOrderLimit !== -1` and the tenant is `active`, counts orders created this month. If at or over the limit, returns HTTP 429 with Arabic message: `وصل المتجر إلى الحد الأقصى من الطلبات الشهرية (N طلب). يرجى التواصل مع صاحب المتجر.`
- Limit check only applies to `active` subscriptions (trial/suspended/canceled are not throttled by this guard).
- Uses `isAtLimit()` from `entitlements.ts` (already handles `limit === -1` → never block).
- `getPlan()` already falls back to `starter` for unknown plan codes — no change needed.
- `GET /plans/entitlements` error string translated to Arabic.
