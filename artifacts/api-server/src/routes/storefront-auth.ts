import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db, customersTable } from "@workspace/db";
import { RegisterCustomerBody, LoginCustomerBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { normaliseEgyptianPhone, PHONE_ERROR_AR } from "../lib/egypt";
import { validatePasswordComplexity } from "../lib/password.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة جداً — انتظر 15 دقيقة وحاول مجدداً" },
  skip: () => process.env.NODE_ENV === "test" && !process.env.VERCEL,
});

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

function buildCustomerResponse(customer: { id: number; name: string; email: string; phone: string | null; marketingConsent: boolean; createdAt: Date }) {
  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      marketingConsent: customer.marketingConsent,
      createdAt: customer.createdAt.toISOString(),
    }
  };
}

router.post("/storefront-auth/register", authLimiter, async (req, res) => {
  const rawPhone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const parsed = RegisterCustomerBody.safeParse({
    ...req.body,
    name: typeof req.body?.name === "string" ? req.body.name.trim() : req.body?.name,
    email: typeof req.body?.email === "string" ? req.body.email.trim() : req.body?.email,
    phone: "01012345678",
  });
  if (!parsed.success) {
    req.log.error({ body: req.body, error: parsed.error.flatten() }, "Validation failed for customer registration");
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { name, password } = parsed.data;
  const complexityError = validatePasswordComplexity(password);
  if (complexityError) {
    return res.status(400).json({
      error: {
        fieldErrors: { password: [complexityError] },
        formErrors: [],
      },
    });
  }
  const email = parsed.data.email.toLowerCase();
  const normalisedPhone = normaliseEgyptianPhone(rawPhone);
  if (!normalisedPhone) {
    return res.status(400).json({
      error: {
        formErrors: [],
        fieldErrors: { phone: [PHONE_ERROR_AR] },
      },
    });
  }

  try {
    const existing = await db.select().from(customersTable).where(eq(customersTable.email, email));
    if (existing.length > 0) return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقًا" });

    const passwordHash = await bcrypt.hash(password, 12);

    const [customer] = await db
      .insert(customersTable)
      .values({
        name,
        email,
        passwordHash,
        phone: normalisedPhone,
      })
      .returning();

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.customerId = customer.id;
    req.log.info({ customerId: customer.id }, "New customer registered");

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return res.status(201).json(buildCustomerResponse(customer));
  } catch (err: any) {
    req.log.error(err);
    if (err?.code === "23505" && err.constraint === "customers_email_unique") {
      return res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقًا" });
    }
    return res.status(500).json({ error: "حدث خطأ أثناء التسجيل" });
  }
});

router.post("/storefront-auth/login", authLimiter, async (req, res) => {
  const parsed = LoginCustomerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email: rawEmail, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();

  // Per-account lockout check
  const lockout = checkAccountLockout(email);
  if (lockout.locked) {
    return res.status(429).json({ error: `تم قفل الحساب مؤقتاً — حاول بعد ${lockout.retryAfterSeconds} ثانية` });
  }

  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, email));
    if (!customer || !customer.passwordHash) {
      recordFailedLogin(email);
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      recordFailedLogin(email);
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    clearFailedLogins(email);

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.customerId = customer.id;
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    return res.json(buildCustomerResponse(customer));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

router.post("/storefront-auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

router.get("/storefront-auth/me", async (req, res) => {
  const customerId = req.session.customerId;
  if (!customerId) return res.status(401).json({ error: "غير مسجل الدخول" });

  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (!customer) return res.status(401).json({ error: "الجلسة غير صالحة" });

    return res.json(buildCustomerResponse(customer));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
