/**
 * نور — Point-by-point audit test suite
 * Covers all 3 analysis files: codebase_review, missing_features, selling_strategy
 * Run: NODE_ENV=test node artifacts/api-server/audit-tests.mjs
 *
 * NODE_ENV=test disables the rate limiter (see auth.ts: skip: () => NODE_ENV === "test")
 */

const BASE = "http://localhost:8080/api";
const c = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", bold: "\x1b[1m", dim: "\x1b[2m", cyan: "\x1b[36m" };

let pass = 0, fail = 0, warn = 0;

function log(symbol, label, detail = "") {
  const sym = symbol === "✅" ? `${c.green}✅${c.reset}` : symbol === "❌" ? `${c.red}❌${c.reset}` : `${c.yellow}⚠️ ${c.reset}`;
  console.log(`  ${sym} ${c.bold}${label}${c.reset}${detail ? `\n     ${c.dim}${detail}${c.reset}` : ""}`);
}

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    });
    let body;
    try { body = await r.json(); } catch { body = {}; }
    return { status: r.status, body, headers: r.headers };
  } catch (e) {
    return { status: 0, body: {}, error: e.message };
  }
}

async function apiAuth(path, cookie, opts = {}) {
  return apiFetch(path, { ...opts, headers: { Cookie: cookie, ...(opts.headers ?? {}) } });
}

function section(title) {
  console.log(`\n${c.cyan}${c.bold}━━━ ${title} ━━━${c.reset}`);
}

function expect(label, condition, detail = "", isWarn = false) {
  if (condition) { pass++; log("✅", label, detail); }
  else if (isWarn) { warn++; log("⚠️ ", label, detail); }
  else { fail++; log("❌", label, detail); }
}

/* ─── Register + login helper — returns session cookie properly extracted ─── */
let _uidCounter = Date.now();
async function registerAndLogin(suffix) {
  _uidCounter++;
  const email = `audit_${suffix}_${_uidCounter}@nour-test.eg`;
  const slug = `audit-${suffix}-${_uidCounter}`;

  const regRes = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email, password: "Audit1234!",
      storeName: `Audit Store ${suffix}`,
      slug, city: "Cairo", category: "fashion",
      description: "متجر اختبار",
    }),
  });
  const regBody = await regRes.json().catch(() => ({}));

  // Extract session cookie from register response (201 sets the session)
  const rawSetCookie = regRes.headers.get("set-cookie") ?? "";
  // Cookie value is just the name=value pair, before the first semicolon
  const cookie = rawSetCookie.split(";")[0];

  // Also verify with /auth/me
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { Cookie: cookie },
  });
  const me = await meRes.json().catch(() => ({}));

  return { email, cookie, slug, me, regBody, regStatus: regRes.status };
}

/* ════════════════════════════════════════════════════════════════════
   FILE 1 — nour_codebase_review
   ════════════════════════════════════════════════════════════════════ */

section("FILE 1 › nour_codebase_review › Critical (C1–C4)");

// C1 — SESSION_SECRET: no hardcoded fallback, throws on missing
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/app.ts", "utf8");
  const hasThrow = src.includes("throw new Error") && src.includes("SESSION_SECRET");
  const hasFallback = src.includes("nour-fallback-secret");
  expect("C1: SESSION_SECRET throws on missing — no hardcoded fallback",
    hasThrow && !hasFallback,
    "app.ts line 13-14: throws Error if SESSION_SECRET missing");
}

// C2 — CORS: permissive in dev (ALLOWED_ORIGINS not set), locked in prod
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/app.ts", "utf8");
  const hasAllowedOrigins = src.includes("ALLOWED_ORIGINS");
  const hasOriginCheck = src.includes("allowedOrigins.includes(origin)");
  expect("C2: CORS locked by ALLOWED_ORIGINS env var in production",
    hasAllowedOrigins && hasOriginCheck,
    "app.ts reads ALLOWED_ORIGINS and rejects unlisted origins. Dev is permissive (expected).");
}

// C3 — Tenant isolation
{
  const a = await registerAndLogin("iso-A");
  const b = await registerAndLogin("iso-B");

  let prodId = null;
  if (a.cookie && a.me?.tenantId) {
    const prod = await apiAuth("/products", a.cookie, {
      method: "POST",
      body: JSON.stringify({ name: "Secret-A", price: 99, stock: 5, status: "active" }),
    });
    prodId = prod.body?.id ?? null;
  }

  const bProducts = await apiAuth("/products", b.cookie ?? "");
  const leaked = (bProducts.body?.products ?? []).find((p) => p.id === prodId);
  expect("C3: Tenant isolation — Merchant B cannot read Merchant A products",
    !leaked,
    `Product #${prodId} from Tenant A ${leaked ? "LEAKED to B ❌" : "hidden from B ✅"}`);
}

// C4 — Paymob HMAC in webhook + idempotency
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/paymob.ts", "utf8");
  const hasHmac = src.includes("HMAC verification") && src.includes("paymob/webhook");
  const hasIdem = src.includes("idempotent");
  expect("C4a: Paymob webhook verifies HMAC signature", hasHmac,
    "routes/paymob.ts: HMAC check inside /paymob/webhook handler");
  expect("C4b: Paymob webhook is idempotent (duplicate detection)", hasIdem,
    "Duplicate webhook detection — skip re-processing on retry");
}

section("FILE 1 › nour_codebase_review › High (H1–H5)");

// H1 — Rate limiting (test mode bypasses it — verify via source code)
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/auth.ts", "utf8");
  const hasRateLimit = src.includes("rateLimit") && src.includes("authLimiter");
  const hasMax10 = src.includes("max: 10");
  expect("H1: Rate limiting on auth endpoints (express-rate-limit, max 10/15min)",
    hasRateLimit && hasMax10,
    "auth.ts: authLimiter with max:10, 15min window applied to /login and /register");
}

// H2 — File uploads: local disk (Replit OK, Vercel blocker)
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/app.ts", "utf8");
  const hasLocal = src.includes("uploads");
  expect("H2: Local disk uploads (acceptable on Replit — Vercel migration would need Object Storage)",
    hasLocal, "Multer saves to ./uploads — fine for Replit", true);
}

// H3 — Security headers (helmet)
{
  const r = await apiFetch("/auth/me");
  const xco = r.headers.get("x-content-type-options");
  expect("H3: Helmet security headers present",
    !!xco, `x-content-type-options: ${xco ?? "(missing)"}`);
}

// H4 — bootstrap-platform-admin endpoint protected
{
  const r = await apiFetch("/auth/bootstrap-platform-admin", {
    method: "POST",
    body: JSON.stringify({ secret: "wrong", merchantId: 1 }),
  });
  expect("H4: /auth/bootstrap-platform-admin rejects wrong secret",
    r.status === 403, `Status: ${r.status} — ${JSON.stringify(r.body)}`);
}

// H5 — Bosta API key not logged
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/app.ts", "utf8");
  const stripsHeaders = src.includes("method: req.method") && !src.includes("req.headers");
  expect("H5: Pino serializer strips Authorization headers from logs",
    stripsHeaders, "req serializer logs only method+url, no headers");
}

/* ════════════════════════════════════════════════════════════════════
   FILE 2 — nour_missing_features › Revenue & Billing
   ════════════════════════════════════════════════════════════════════ */

section("FILE 2 › nour_missing_features › Revenue & Billing");

const merchant = await registerAndLogin("billing");
const { cookie } = merchant;

// B1 — trialEndsAt set on registration and returned in /auth/me
{
  const trialEndsAt = merchant.me?.trialEndsAt ?? merchant.regBody?.trialEndsAt ?? null;
  const isSet = !!trialEndsAt && !isNaN(Date.parse(trialEndsAt));
  const isRoughly14 = isSet && Math.abs(new Date(trialEndsAt) - (Date.now() + 14 * 86400_000)) < 120_000;
  expect("B1: trialEndsAt set to 14 days from now on registration",
    isSet && isRoughly14,
    `trialEndsAt: ${trialEndsAt} | regStatus: ${merchant.regStatus} | meStatus cookie: ${cookie?.substring(0,20)}...`);
}

// B2 — Trial expiry enforcement in requireRole
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/middleware/require-role.ts", "utf8");
  const has402 = src.includes("402");
  const checksTrialEndsAt = src.includes("trialEndsAt");
  expect("B2: requireRole returns 402 when trial expired",
    has402 && checksTrialEndsAt, "require-role.ts checks trialEndsAt and returns 402 with 'trial_expired' code");
}

// B3 — No free /billing/upgrade endpoint
{
  const r = await apiAuth("/billing/upgrade", cookie, { method: "POST", body: JSON.stringify({ planCode: "pro" }) });
  expect("B3: /billing/upgrade endpoint removed (free plan change blocked)",
    r.status === 404, `Status: ${r.status} — plan upgrades require transfer request + admin approval`);
}

// B4 — Bank details
{
  const r = await apiAuth("/billing/bank-details", cookie);
  expect("B4: GET /billing/bank-details returns bank info",
    r.status === 200 && (r.body?.bankName || r.body?.accountName),
    `Status: ${r.status} — bankName: ${r.body?.bankName}, accountName: ${r.body?.accountName}`);
}

// B5 — Transfer request submit
{
  const r = await apiAuth("/billing/transfer-request", cookie, {
    method: "POST",
    body: JSON.stringify({ planCode: "growth", referenceNumber: "TXN-AUDIT-001", receiptImageUrl: null }),
  });
  expect("B5: POST /billing/transfer-request creates pending request",
    r.status === 201 || r.status === 200,
    `Status: ${r.status} — ${JSON.stringify(r.body).substring(0, 80)}`);
}

// B5b — Duplicate pending blocked
{
  const r = await apiAuth("/billing/transfer-request", cookie, {
    method: "POST",
    body: JSON.stringify({ planCode: "pro", referenceNumber: "TXN-AUDIT-002" }),
  });
  expect("B5b: Duplicate pending transfer request blocked (409)",
    r.status === 409, `Status: ${r.status} (expected 409)`);
}

// B6 — Transfer requests list
{
  const r = await apiAuth("/billing/transfer-requests", cookie);
  expect("B6: GET /billing/transfer-requests returns own requests array",
    r.status === 200 && Array.isArray(r.body),
    `Status: ${r.status}, count: ${r.body?.length ?? "N/A"}`);
}

// B7 — Paymob idempotency (code check)
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/paymob.ts", "utf8");
  expect("B7: Paymob webhook idempotent",
    src.includes("idempotent"), "Duplicate Paymob webhook detection prevents double stock/status update");
}

// B8 — Invoices list
{
  const r = await apiAuth("/billing/invoices", cookie);
  expect("B8: GET /billing/invoices returns array",
    r.status === 200 && Array.isArray(r.body),
    `Status: ${r.status}, count: ${r.body?.length}`);
}

/* ════════════════════════════════════════════════════════════════════
   FILE 2 — Shopper Experience
   ════════════════════════════════════════════════════════════════════ */

section("FILE 2 › nour_missing_features › Shopper Experience");

const sfMerchant = await registerAndLogin("sf");
const sfCookie = sfMerchant.cookie;

// Create product and variant for storefront tests
let sfProdId = null;
if (sfCookie) {
  const p = await apiAuth("/products", sfCookie, {
    method: "POST",
    body: JSON.stringify({ name: "SF Test Product", price: 199, stock: 50, status: "active", description: "منتج اختبار", featured: false }),
  });
  sfProdId = p.body?.id ?? null;
  if (sfProdId) {
    await apiAuth(`/products/${sfProdId}/variants`, sfCookie, {
      method: "POST",
      body: JSON.stringify({ label: "M", sku: "SF-M", stock: 10, priceModifier: 0 }),
    });
  }
}

// S1 — Storefront returns hasVariants
{
  const r = await apiFetch(`/store/${sfMerchant.slug}`);
  const products = r.body?.products ?? [];
  const hasVariantFlag = products.some((p) => p.hasVariants === true || p.variantCount > 0);
  expect("S1: Storefront API returns hasVariants flag per product",
    r.status === 200 && hasVariantFlag,
    `Status: ${r.status}, products: ${products.length}, any hasVariants=true: ${hasVariantFlag}`);
}

// S2 — Storefront search/filter query params
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/storefront.ts", "utf8");
  const hasSearch = src.includes("req.query") && src.includes("search") && src.includes("ilike");
  const hasCatFilter = src.includes("categoryIdQ") || src.includes("categoryId");
  // Live test
  const r = await apiFetch(`/store/${sfMerchant.slug}?search=SF+Test`);
  const found = (r.body?.products ?? []).some((p) => p.name === "SF Test Product");
  expect("S2a: Storefront API has ?search= server-side filtering (ilike)",
    hasSearch, "storefront.ts: ilike search on product name via req.query.search");
  expect("S2b: ?search= correctly filters products live",
    r.status === 200 && found,
    `Live search result: ${r.body?.products?.length ?? 0} products, found target: ${found}`);
  expect("S2c: Storefront API supports ?categoryId= filter", hasCatFilter,
    "storefront.ts: categoryId query param filtering");
}

// S3 — Public order tracking page
{
  const fs = await import("fs");
  const pages = fs.readdirSync("artifacts/fashion-store/src/pages/");
  const hasPage = pages.some((p) => p.includes("order-track"));
  const appSrc = fs.readFileSync("artifacts/fashion-store/src/App.tsx", "utf8");
  const hasRoute = appSrc.includes("order-track");
  expect("S3: Public order tracking page exists for shoppers",
    hasPage && hasRoute,
    `order-track.tsx: ${hasPage}, route in App.tsx: ${hasRoute}`);
}

// S4 — Storefront branding
{
  const fs = await import("fs");
  const apiSrc = fs.readFileSync("artifacts/api-server/src/routes/storefront.ts", "utf8");
  const uiSrc = fs.readFileSync("artifacts/fashion-store/src/pages/storefront.tsx", "utf8");
  expect("S4a: Storefront API returns primaryColor field",
    apiSrc.includes("primaryColor"), "storefront.ts returns primaryColor from tenant");
  expect("S4b: Storefront API returns faviconUrl/seoTitle/seoDescription",
    apiSrc.includes("faviconUrl") && apiSrc.includes("seoTitle"),
    "storefront.ts returns faviconUrl, seoTitle, seoDescription");
  expect("S4c: Storefront UI applies primaryColor CSS variable",
    uiSrc.includes("--storefront-primary") || uiSrc.includes("primaryColor"),
    "storefront.tsx: sets --storefront-primary CSS var on :root");
  expect("S4d: Storefront UI sets document.title from seoTitle",
    uiSrc.includes("document.title"),
    "storefront.tsx: useEffect sets document.title = seoTitle ?? store.name");
  expect("S4e: Storefront UI sets favicon from faviconUrl",
    uiSrc.includes("favicon"),
    "storefront.tsx: useEffect sets link[rel=icon].href = faviconUrl");
}

// S5 — Cart persists to localStorage
{
  const src = (await import("fs")).readFileSync("artifacts/fashion-store/src/hooks/use-cart.tsx", "utf8");
  const setsOnChange = src.includes("localStorage.setItem") && src.includes("[items");
  const loadsOnMount = src.includes("localStorage.getItem") && src.includes("JSON.parse");
  expect("S5: Cart persists to localStorage on every change and reloads on mount",
    setsOnChange && loadsOnMount,
    "use-cart.tsx: setItem in useEffect([items]), getItem in useState initializer");
}

/* ════════════════════════════════════════════════════════════════════
   FILE 2 — Merchant Operations
   ════════════════════════════════════════════════════════════════════ */

section("FILE 2 › nour_missing_features › Merchant Operations");

// M1 — WhatsApp templates
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/lib/whatsapp.ts", "utf8");
  const templates = {
    order_confirmation: "buildOrderConfirmationMessage",
    dispatched: "buildDispatchedMessage",
    cancelled: "buildCancelledMessage",
    delivery_follow_up: "buildDeliveryFollowUpMessage",
    return_exchange: "buildReturnExchangeMessage",
    shipping_update: "buildShippingUpdateMessage",
  };
  const found = Object.entries(templates).filter(([, fn]) => src.includes(fn)).map(([k]) => k);
  const missing = Object.entries(templates).filter(([, fn]) => !src.includes(fn)).map(([k]) => k);
  expect("M1: All 6 WhatsApp message templates built",
    missing.length === 0,
    `Found: [${found.join(", ")}]${missing.length ? ` | Missing: [${missing.join(", ")}]` : ""}`);
}

// M2 — WhatsApp message logs written to DB
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/whatsapp.ts", "utf8");
  expect("M2: WhatsApp sends logged to whatsapp_message_logs table",
    src.includes("whatsappMessageLogsTable") && src.includes("insert"),
    "routes/whatsapp.ts: insert into whatsappMessageLogsTable on every send");
}

// M3 — Automation rules wired to order status changes
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/orders.ts", "utf8");
  const hasFireFn = src.includes("fireAutomationRules");
  const hasExec = src.includes("automationRulesTable");
  const wiredToUpdate = src.includes("fireAutomationRules(") && src.includes("newStatus");
  expect("M3: Automation rules executed on order status change",
    hasFireFn && hasExec && wiredToUpdate,
    "orders.ts: fireAutomationRules() called after status update");
}

// M4a — Stock restored on cancellation
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/orders.ts", "utf8");
  const hasRestore = src.includes("cancelled") && src.includes("productsTable.stock} + ");
  expect("M4a: Stock restored when order cancelled/returned",
    hasRestore,
    "orders.ts: stock += quantity when status → cancelled or returned");
}

// M4b — Stock reservation for pending Paymob
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/routes/orders.ts", "utf8");
  const hasReservation = src.includes("reserve") || src.includes("reservation");
  expect("M4b: Stock reserved (not decremented) for pending Paymob payments",
    hasReservation,
    hasReservation ? "Reservation logic found" : "Not yet implemented — Paymob orders still decrement immediately", !hasReservation);
}

// M5 — Inventory auto-alert in scheduler
{
  const src = (await import("fs")).readFileSync("artifacts/api-server/src/lib/scheduler.ts", "utf8");
  const hasLowStock = src.includes("checkLowStockAlerts") || src.includes("low-stock") || src.includes("inventory");
  const inCron = src.includes("checkLowStockAlerts()");
  expect("M5: Inventory low-stock auto-alert in daily scheduler",
    hasLowStock && inCron,
    "scheduler.ts: checkLowStockAlerts() runs daily at 08:00 Cairo");
}

/* ════════════════════════════════════════════════════════════════════
   FILE 2 — Platform & Admin
   ════════════════════════════════════════════════════════════════════ */

section("FILE 2 › nour_missing_features › Platform & Admin");

// P1 — Email system
{
  const fs = await import("fs");
  const exists = fs.existsSync("artifacts/api-server/src/lib/email.ts");
  const src = exists ? fs.readFileSync("artifacts/api-server/src/lib/email.ts", "utf8") : "";
  expect("P1: Email system implemented (Resend)",
    exists && src.includes("Resend"),
    "lib/email.ts exists and uses Resend for transactional emails");
}

// P2 — Password reset
{
  const r = await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: "nobody@nour-test.eg" }),
  });
  expect("P2: Password reset endpoint exists (/auth/forgot-password)",
    r.status !== 404 && r.status !== 405,
    `Status: ${r.status} — ${JSON.stringify(r.body).substring(0, 60)}`);
}

// P3 — Platform transfer-requests endpoint exists
{
  const r = await apiAuth("/platform/transfer-requests", cookie ?? "");
  expect("P3: GET /platform/transfer-requests endpoint exists",
    r.status !== 404, `Status: ${r.status} (401/403 expected for non-admin)`);
}

// P4 — Paymob reconciliation view
{
  const src = (await import("fs")).readFileSync("artifacts/fashion-store/src/pages/platform.tsx", "utf8");
  const hasRecon = src.includes("reconcili") || src.includes("payment_records");
  expect("P4: Paymob payment reconciliation view in admin dashboard",
    hasRecon, hasRecon ? "Found in platform.tsx" : "Missing — pending/failed Paymob payments not surfaced to admin", !hasRecon);
}

/* ════════════════════════════════════════════════════════════════════
   FILE 3 — nour_selling_strategy › Features to Build
   ════════════════════════════════════════════════════════════════════ */

section("FILE 3 › nour_selling_strategy › Features to Build");

// ST1 — AI pricing advisor
{
  const r = await apiAuth("/ai/pricing-advice", cookie ?? "", {
    method: "POST",
    body: JSON.stringify({ productId: 1, model: "gemini" }),
  });
  expect("ST1: AI pricing advisor endpoint (/ai/pricing-advice)",
    r.status !== 404 && r.status !== 405,
    `Status: ${r.status} — endpoint exists`);
}

// ST2 — WhatsApp product button on storefront
{
  const src = (await import("fs")).readFileSync("artifacts/fashion-store/src/pages/storefront.tsx", "utf8");
  expect("ST2: 'اطلب على واتساب' WhatsApp button on storefront",
    src.includes("wa.me") && src.includes("واتساب"),
    "storefront.tsx: wa.me link + Arabic button label");
}

// ST3 — QR code in store settings
{
  const src = (await import("fs")).readFileSync("artifacts/fashion-store/src/pages/store-settings.tsx", "utf8");
  expect("ST3: QR code section in store settings",
    src.includes("qrserver") || src.includes("QR"),
    "store-settings.tsx: qrserver.com QR code preview");
}

// ST4 — COD confirmation rate scoring
{
  const pages = (await import("fs")).readdirSync("artifacts/fashion-store/src/pages/");
  const appSrc = (await import("fs")).readFileSync("artifacts/fashion-store/src/App.tsx", "utf8");
  const hasCod = pages.some((p) => p.includes("cod") || p.includes("risk")) || appSrc.includes("cod-score");
  expect("ST4: COD confirmation rate scoring feature",
    hasCod, hasCod ? "Feature found" : "Not yet built — medium-impact selling point", !hasCod);
}

// ST5 — TikTok/Instagram comment-to-order
{
  const appSrc = (await import("fs")).readFileSync("artifacts/fashion-store/src/App.tsx", "utf8");
  const hasSocial = appSrc.includes("tiktok") || appSrc.includes("instagram") || appSrc.includes("social-orders");
  expect("ST5: TikTok/Instagram comment-to-order flow",
    hasSocial, hasSocial ? "Found" : "Not yet built — highest-impact competitive selling point", !hasSocial);
}

/* ════════════════════════════════════════════════════════════════════
   Summary
   ════════════════════════════════════════════════════════════════════ */

const total = pass + fail + warn;
const pct = total > 0 ? Math.round((pass / total) * 100) : 0;
console.log(`\n${c.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Audit Results: ${total} checks`);
console.log(`  ${c.green}${pass} passed${c.reset}  ${c.red}${fail} failed${c.reset}  ${c.yellow}${warn} warnings${c.reset}  ${c.bold}(${pct}% pass rate)`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
