import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { sendPasswordResetEmail, sendWelcomeEmail, sendNewMerchantNotification } from "../lib/email.js";
import { db, merchantsTable, tenantsTable, categoriesTable, merchantOnboardingTable, passwordResetTokensTable, shippingZonesTable, shippingSettingsTable, DEFAULT_CATEGORIES, DEFAULT_SHIPPING_ZONES_CONFIG } from "@workspace/db";
import { RegisterMerchantBody, LoginMerchantBody } from "@workspace/api-zod";
import { eq, and, gt, ne, sql } from "drizzle-orm";
import { validatePasswordComplexity } from "../lib/password.js";

const router = Router();

// Rate limiting: max 10 attempts per 15 min window on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة جداً — انتظر 15 دقيقة وحاول مجدداً" },
  skip: () => process.env.NODE_ENV === "test" && !process.env.VERCEL,
});

const RESERVED_SLUGS = ["admin", "api", "www", "app", "nour", "matjareg", "support", "help", "store", "login", "register"];
const configuredEmailTimeoutMs = Number(process.env.AUTH_EMAIL_TIMEOUT_MS ?? 3000);
const EMAIL_DELIVERY_TIMEOUT_MS =
  Number.isFinite(configuredEmailTimeoutMs) && configuredEmailTimeoutMs > 0
    ? configuredEmailTimeoutMs
    : 3000;

// ── Per-account login lockout (in-memory; resets on restart) ──
const loginAttempts = new Map<string, { count: number; lockedUntil: number; firstFailedAt: number }>();

// Cleanup old login attempts every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of loginAttempts.entries()) {
    // Delete entries that are older than 15 minutes or whose lockout has expired
    if ((entry.lockedUntil > 0 && entry.lockedUntil <= now) || (entry.lockedUntil === 0 && now - entry.firstFailedAt > 15 * 60 * 1000)) {
      loginAttempts.delete(email);
    }
  }
}, 15 * 60 * 1000).unref();

function checkAccountLockout(email: string): { locked: boolean; retryAfterSeconds?: number } {
  const entry = loginAttempts.get(email);
  if (!entry || entry.lockedUntil <= Date.now()) {
    if (entry?.lockedUntil && entry.lockedUntil <= Date.now()) loginAttempts.delete(email);
    return { locked: false };
  }
  return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
}

function recordFailedLogin(email: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0, firstFailedAt: now };

  // Reset count if the first failure was more than 15 minutes ago
  if (now - entry.firstFailedAt > 15 * 60 * 1000) {
    entry.count = 0;
    entry.firstFailedAt = now;
  }

  entry.count++;
  if (entry.count >= 5) {
    entry.lockedUntil = now + 30 * 60 * 1000; // 30 min lockout after 5 failures
  }
  loginAttempts.set(email, entry);
}

function clearFailedLogins(email: string): void {
  loginAttempts.delete(email);
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function buildAuthResponse(
  merchant: { id: number; email: string; name: string | null; tenantId: number; role: string; isPlatformAdmin: boolean },
  tenant: {
    id: number; name: string; slug: string; category: string; status: string;
    city: string | null; logoUrl: string | null; coverUrl: string | null;
    primaryColor: string | null; description: string;
    planCode: string; subscriptionStatus: string;
    trialEndsAt: Date | null;
  }
) {
  return {
    merchantId: merchant.id,
    email: merchant.email,
    name: merchant.name ?? null,
    role: merchant.role,
    isPlatformAdmin: merchant.isPlatformAdmin,
    tenantId: tenant.id,
    storeName: tenant.name,
    slug: tenant.slug,
    category: tenant.category,
    status: tenant.status,
    city: tenant.city ?? null,
    logoUrl: tenant.logoUrl ?? null,
    coverUrl: tenant.coverUrl ?? null,
    primaryColor: tenant.primaryColor ?? null,
    description: tenant.description,
    planCode: tenant.planCode,
    subscriptionStatus: tenant.subscriptionStatus,
    trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.toISOString() : null,
  };
}

async function seedDefaultShippingRules(tenantId: number): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  await db
    .insert(shippingSettingsTable)
    .values({
      tenantId,
      defaultShippingCost: "50",
    })
    .onConflictDoNothing();

  if (!Array.isArray(DEFAULT_SHIPPING_ZONES_CONFIG) || DEFAULT_SHIPPING_ZONES_CONFIG.length === 0) {
    return;
  }

  const shippingZones = DEFAULT_SHIPPING_ZONES_CONFIG.flatMap((dz) =>
    dz.governorates.map((gov) => ({
      tenantId,
      governorate: gov,
      shippingCost: String(dz.baseCost),
      deliveryDays: dz.deliveryDays,
    })),
  );

  if (shippingZones.length > 0) {
    await db.insert(shippingZonesTable).values(shippingZones);
  }
}

router.get("/auth/check-slug", async (req, res) => {
  const raw = typeof req.query.slug === "string" ? req.query.slug : "";
  const slug = normalizeSlug(raw);

  if (!slug) return res.json({ available: false, reason: "invalid" });
  if (RESERVED_SLUGS.includes(slug)) return res.json({ available: false, reason: "reserved" });

  try {
    const existing = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, slug));
    return res.json({ available: existing.length === 0, slug });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/auth/register", authLimiter, async (req, res) => {
  const parsed = RegisterMerchantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { storeName, slug: rawSlug, email: rawEmail, password, category = "both", phone, description = "" } = parsed.data;
  const complexityError = validatePasswordComplexity(password);
  if (complexityError) {
    return res.status(400).json({
      error: {
        fieldErrors: { password: [complexityError] },
        formErrors: [],
      },
    });
  }
  const email = rawEmail.toLowerCase().trim();
  const slug = normalizeSlug(rawSlug);

  if (!slug) return res.status(400).json({ error: "الرابط يحتوي على أحرف غير مقبولة" });
  if (RESERVED_SLUGS.includes(slug)) return res.status(400).json({ error: "هذا الرابط محجوز — اختر رابطاً آخر" });

  try {
    const existing = await db.select().from(merchantsTable).where(eq(merchantsTable.email, email));
    if (existing.length > 0) return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقًا" });

    const slugExists = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug));
    if (slugExists.length > 0) return res.status(409).json({ error: "اسم المتجر (الرابط) مستخدم مسبقًا" });

    const passwordHash = await bcrypt.hash(password, 12);

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const result = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenantsTable)
        .values({
          name: storeName,
          slug,
          description,
          category: category as "fashion" | "cosmetics" | "both",
          theme: category === "cosmetics" ? "cosmetics" : "classic",
          coverUrl: category === "cosmetics" ? "/product-cosmetics.png" : null,
          primaryColor: category === "cosmetics" ? "#DDA7A5" : null,
          secondaryColor: category === "cosmetics" ? "#8A5A58" : null,
          status: "active",
          subscriptionStatus: "trial",
          trialEndsAt,
        })
        .returning();

      const [merchant] = await tx
        .insert(merchantsTable)
        .values({ email, phone, passwordHash, tenantId: tenant.id })
        .returning();

      if (DEFAULT_CATEGORIES && Array.isArray(DEFAULT_CATEGORIES)) {
        const categoriesToInsert = DEFAULT_CATEGORIES.filter((c) => category === "both" || c.type === category);
        if (categoriesToInsert.length > 0) {
          await tx.insert(categoriesTable).values(
            categoriesToInsert.map((c) => ({ ...c, tenantId: tenant.id }))
          );
        }
      }

      await tx.insert(merchantOnboardingTable).values({ tenantId: tenant.id });

      return { tenant, merchant };
    });

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.merchantId = result.merchant.id;
    req.log.info({ tenantId: result.tenant.id, slug }, "New merchant registered");

    seedDefaultShippingRules(result.tenant.id).catch((err) =>
      req.log.warn({ err, tenantId: result.tenant.id }, "Default shipping seed failed — non-fatal"),
    );

    const baseUrl = (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim() !== "")
      ? process.env.APP_BASE_URL
      : `${req.protocol}://${req.get("host")}`;
    const storeUrl = `${baseUrl}/store/${slug}`;

    // Wait briefly for Vercel delivery, but never let email latency block signup.
    try {
      const [emailResult, adminNotifyResult] = await Promise.allSettled([
        withTimeout(sendWelcomeEmail(email, storeName, storeUrl), EMAIL_DELIVERY_TIMEOUT_MS, "Welcome email"),
        withTimeout(
          db
            .select({ email: merchantsTable.email })
            .from(merchantsTable)
            .where(and(eq(merchantsTable.isPlatformAdmin, true), ne(merchantsTable.email, email)))
            .then((admins) => {
              const adminEmails = admins.map((a) => a.email);
              return sendNewMerchantNotification(adminEmails, storeName, storeUrl, email, phone ?? null);
            }),
          EMAIL_DELIVERY_TIMEOUT_MS,
          "Admin notification email",
        ),
      ]);

      if (emailResult.status === "fulfilled") {
        const res = emailResult.value;
        if (res.sent) {
          req.log.info({ emailId: res.id }, "Welcome email sent");
        } else {
          req.log.warn(
            {
              reason: res.reason,
              recipientDomain: email.split("@")[1] ?? null,
              from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
            },
            "Welcome email was not sent",
          );
        }
      } else {
        req.log.warn({ err: emailResult.reason }, "Welcome email failed — non-fatal");
      }

      if (adminNotifyResult.status === "rejected") {
        req.log.warn({ err: adminNotifyResult.reason }, "Admin notification email failed — non-fatal");
      }
    } catch (err) {
      req.log.warn({ err }, "Email processing failed — non-fatal");
    }

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return res.status(201).json(buildAuthResponse(result.merchant, result.tenant));
  } catch (err: any) {
    req.log.error(err);

    if (err?.code === "23505") {
      if (err.constraint === "tenants_slug_unique") {
        return res.status(409).json({ error: "اسم المتجر (الرابط) مستخدم مسبقًا" });
      }
      if (err.constraint === "merchants_email_unique") {
        return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقًا" });
      }
    }

    const details = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `حدث خطأ أثناء التسجيل: ${details}` });
  }
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = LoginMerchantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  // Per-account lockout check
  const lockout = checkAccountLockout(email);
  if (lockout.locked) {
    return res.status(429).json({ error: `تم قفل الحساب مؤقتاً — حاول بعد ${lockout.retryAfterSeconds} ثانية` });
  }

  try {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.email, email));
    if (!merchant) {
      recordFailedLogin(email);
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) {
      recordFailedLogin(email);
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    clearFailedLogins(email);

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, merchant.tenantId));
    if (!tenant) return res.status(500).json({ error: "لم يتم العثور على المتجر" });

    await db
      .update(tenantsTable)
      .set({ lastAdminLoginAt: new Date() })
      .where(eq(tenantsTable.id, tenant.id));

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.merchantId = merchant.id;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    return res.json(buildAuthResponse(merchant, tenant));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("matjareg.sid");
    res.status(204).send();
  });
});

router.get("/auth/me", async (req, res) => {
  const merchantId = req.session.merchantId;
  if (!merchantId) return res.status(401).json({ error: "غير مسجل الدخول" });

  try {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "الجلسة غير صالحة" });

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, merchant.tenantId));
    if (!tenant) return res.status(500).json({ error: "لم يتم العثور على المتجر" });

    return res.json(buildAuthResponse(merchant, tenant));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

/* ─── Bootstrap platform admin — disabled in production ─── */
// This route is only active in development and requires both:
// - NODE_ENV !== "production"
// - PLATFORM_ADMIN_SECRET env var set
// In production, set isPlatformAdmin via direct DB query.
router.post("/auth/bootstrap-platform-admin", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  const secret = process.env.PLATFORM_ADMIN_SECRET;
  if (!secret) return res.status(403).json({ error: "PLATFORM_ADMIN_SECRET غير مُهيأ" });

  const { secret: provided, merchantId } = req.body as { secret?: string; merchantId?: number };
  const providedBuf = Buffer.from(String(provided ?? ""));
  const secretBuf = Buffer.from(secret);
  if (providedBuf.length !== secretBuf.length || !crypto.timingSafeEqual(providedBuf, secretBuf)) {
    return res.status(403).json({ error: "السر غير صحيح" });
  }
  if (!merchantId) return res.status(400).json({ error: "merchantId مطلوب" });

  try {
    const [updated] = await db
      .update(merchantsTable)
      .set({ isPlatformAdmin: true })
      .where(eq(merchantsTable.id, merchantId))
      .returning({ id: merchantsTable.id, email: merchantsTable.email });

    if (!updated) return res.status(404).json({ error: "التاجر غير موجود" });
    res.json({ ok: true, merchantId: updated.id, email: updated.email });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/auth/forgot-password", authLimiter, async (req, res) => {
  const { email: rawEmail } = req.body as { email?: string };
  if (!rawEmail) return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
  const email = rawEmail.toLowerCase().trim();

  try {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.email, email));
    if (!merchant) {
      return res.json({ ok: true });
    }

    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.merchantId, merchant.id));

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({ merchantId: merchant.id, token: tokenHash, expiresAt });

    const baseUrl = (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim() !== "")
      ? process.env.APP_BASE_URL
      : `${req.protocol}://${req.get("host")}`;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const { sent } = await sendPasswordResetEmail(email, resetLink);

    if (sent) {
      return res.json({ ok: true, emailSent: true });
    }

    // SECURITY: Do not leak the reset link in the API response when email delivery fails.
    return res.json({ ok: true, emailSent: false });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
  }
});

router.post("/auth/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "البيانات ناقصة" });
  const complexityError = validatePasswordComplexity(password);
  if (complexityError) return res.status(400).json({ error: complexityError });

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, tokenHash),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      );

    if (!record) return res.status(400).json({ error: "الرابط غير صالح أو منتهي الصلاحية" });
    if (record.usedAt) return res.status(400).json({ error: "تم استخدام هذا الرابط مسبقًا" });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(merchantsTable).set({ passwordHash }).where(eq(merchantsTable.id, record.merchantId));
    await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, record.id));

    // Invalidate sessions — works for PG session store
    try {
      await db.execute(
        sql`DELETE FROM sessions WHERE sess->>'merchantId' = ${record.merchantId.toString()}`
      );
    } catch {
      // If using Redis session store, PG sessions table may not exist.
      // Redis sessions will expire naturally based on TTL.
      req.log.warn(
        { merchantId: record.merchantId },
        "PG session cleanup skipped — if using Redis, old sessions expire based on TTL"
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
  }
});

export default router;
