import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db, customersTable } from "@workspace/db";
import { RegisterCustomerBody, LoginCustomerBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "محاولات كثيرة جداً — انتظر 15 دقيقة وحاول مجدداً" },
  skip: () => process.env.NODE_ENV === "test",
});

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
  const parsed = RegisterCustomerBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password, phone } = parsed.data;

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
        phone,
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

  const { email, password } = parsed.data;

  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, email));
    if (!customer || !customer.passwordHash) {
      return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.customerId = customer.id;
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
