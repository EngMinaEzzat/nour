import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { sendPasswordResetEmail, sendWelcomeEmail, sendNewMerchantNotification } from "../lib/email.js";
import { db, merchantsTable, tenantsTable, categoriesTable, merchantOnboardingTable, passwordResetTokensTable, shippingZonesTable, shippingSettingsTable, DEFAULT_CATEGORIES, DEFAULT_SHIPPING_ZONES_CONFIG } from "@workspace/db";
import { RegisterMerchantBody, LoginMerchantBody } from "@workspace/api-zod";
import { eq, and, gt, ne } from "drizzle-orm";

const router = Router();

// Rate limiting: max 10 attempts per 15 min window on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة جداً — انتظر 15 دقيقة وحاول مجدداً" },
  skip: () => process.env.NODE_ENV === "test",
});

const RESERVED_SLUGS = ["admin", "api", "www", "app", "nour", "support", "help", "store", "login", "register"];
const configuredEmailTimeoutMs = Number(process.env.AUTH_EMAIL_TIMEOUT_MS ?? 3000);
const EMAIL_DELIVERY_TIMEOUT_MS =
  Number.isFinite(configuredEmailTimeoutMs) && configuredEmailTimeoutMs > 0
    ? configuredEmailTimeoutMs
    : 3000;

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

  const { storeName, slug: rawSlug, email, password, category = "both", phone, description = "" } = parsed.data;
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

    req.session.merchantId = result.merchant.id;
    req.log.info({ tenantId: result.tenant.id, slug }, "New merchant registered");

    seedDefaultShippingRules(result.tenant.id).catch((err) =>
      req.log.warn({ err, tenantId: result.tenant.id }, "Default shipping seed failed — non-fatal"),
    );

    const baseUrl = process.env.APP_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
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

    return res.status(201).json(buildAuthResponse(result.merchant, result.tenant));
  } catch (err) {
    req.log.error(err);
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "حدث خطأ أثناء التسجيل", details: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = LoginMerchantBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  try {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.email, email));
    if (!merchant) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, merchant.tenantId));
    if (!tenant) return res.status(500).json({ error: "لم يتم العثور على المتجر" });

    await db
      .update(tenantsTable)
      .set({ lastAdminLoginAt: new Date() })
      .where(eq(tenantsTable.id, tenant.id));

    req.session.merchantId = merchant.id;
    return res.json(buildAuthResponse(merchant, tenant));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
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
  if (provided !== secret) return res.status(403).json({ error: "السر غير صحيح" });
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

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });

  try {
    const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.email, email));
    if (!merchant) {
      return res.json({ ok: true });
    }

    await db.delete(passwordResetTokensTable).where(eq(passwordResetTokensTable.merchantId, merchant.id));

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({ merchantId: merchant.id, token, expiresAt });

    const baseUrl = process.env.APP_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const { sent } = await sendPasswordResetEmail(email, resetLink);

    if (sent) {
      return res.json({ ok: true, emailSent: true });
    }

    return res.json({ ok: true, emailSent: false, resetLink });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) return res.status(400).json({ error: "البيانات ناقصة" });
  if (password.length < 8) return res.status(400).json({ error: "كلمة المرور قصيرة جدًا" });

  try {
    const [record] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        ),
      );

    if (!record) return res.status(400).json({ error: "الرابط غير صالح أو منتهي الصلاحية" });
    if (record.usedAt) return res.status(400).json({ error: "تم استخدام هذا الرابط مسبقًا" });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(merchantsTable).set({ passwordHash }).where(eq(merchantsTable.id, record.merchantId));
    await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, record.id));

    return res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ، حاول مرة أخرى" });
  }
});

export default router;
