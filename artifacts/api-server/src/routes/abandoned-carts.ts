import { Router } from "express";
import { db } from "@workspace/db";
import { cartSessionsTable, tenantsTable } from "@workspace/db";
import { eq, and, lt, sql, desc, ne } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

const ABANDON_THRESHOLD_HOURS = 2;
const CART_SESSION_STATUSES = ["active", "abandoned", "converted"] as const;
type CartSessionStatus = (typeof CART_SESSION_STATUSES)[number];

async function upsertCartSession(
  sessionId: string,
  tenantId: number,
  values: Partial<typeof cartSessionsTable.$inferInsert>,
) {
  const [existing] = await db
    .select({ id: cartSessionsTable.id })
    .from(cartSessionsTable)
    .where(
      and(
        eq(cartSessionsTable.sessionId, sessionId),
        eq(cartSessionsTable.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(cartSessionsTable)
      .set(values)
      .where(and(eq(cartSessionsTable.id, existing.id), eq(cartSessionsTable.tenantId, tenantId)));
  } else {
    await db.insert(cartSessionsTable).values({
      sessionId,
      tenantId,
      items: [],
      totalAmount: "0",
      itemCount: 0,
      ...values,
    });
  }
}

// POST /api/cart/sync — public: upsert cart session per tenant
router.post("/cart/sync", async (req, res) => {
  const { sessionId, tenantId, items, totalAmount, itemCount } = req.body;
  if (!sessionId || !tenantId)
    return res.status(400).json({ error: "sessionId and tenantId required" });

  try {
    await upsertCartSession(sessionId, Number(tenantId), {
      items: items ?? [],
      totalAmount: String(totalAmount ?? 0),
      itemCount: itemCount ?? 0,
      status: "active",
      lastActivityAt: new Date(),
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حفظ السلة" });
  }
});

// POST /api/cart/contact — public: save customer contact info to session
router.post("/cart/contact", async (req, res) => {
  const { sessionId, tenantId, customerName, customerEmail, customerPhone } =
    req.body;
  if (!sessionId || !tenantId)
    return res.status(400).json({ error: "sessionId and tenantId required" });

  try {
    const updates: Record<string, unknown> = { lastActivityAt: new Date() };
    if (customerName) updates.customerName = customerName;
    if (customerEmail) updates.customerEmail = customerEmail;
    if (customerPhone) updates.customerPhone = customerPhone;

    await upsertCartSession(sessionId, Number(tenantId), updates);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حفظ البيانات" });
  }
});

// POST /api/cart/convert — public: mark session as converted
router.post("/cart/convert", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  try {
    await db
      .update(cartSessionsTable)
      .set({ status: "converted", convertedAt: new Date() })
      .where(eq(cartSessionsTable.sessionId, sessionId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل" });
  }
});

// GET /api/abandoned-carts — merchant: list abandoned/active carts with items
router.get(
  "/abandoned-carts",
  requireRole("owner", "manager"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });

    try {
      // Auto-mark stale active carts as abandoned
      const threshold = new Date(
        Date.now() - ABANDON_THRESHOLD_HOURS * 60 * 60 * 1000,
      );
      await db
        .update(cartSessionsTable)
        .set({ status: "abandoned" })
        .where(
          and(
            eq(cartSessionsTable.tenantId, tenantId),
            eq(cartSessionsTable.status, "active"),
            lt(cartSessionsTable.lastActivityAt, threshold),
          ),
        );

      const statusFilter =
        typeof req.query.status === "string" ? req.query.status : undefined;

      const conditions = [
        eq(cartSessionsTable.tenantId, tenantId),
        ne(cartSessionsTable.status, "converted"),
      ];
      if (
        statusFilter &&
        CART_SESSION_STATUSES.includes(statusFilter as CartSessionStatus)
      ) {
        conditions.push(
          eq(cartSessionsTable.status, statusFilter as CartSessionStatus),
        );
      }

      const rows = await db
        .select()
        .from(cartSessionsTable)
        .where(and(...conditions))
        .orderBy(desc(cartSessionsTable.lastActivityAt));

      const [stats] = await db
        .select({
          totalAbandoned: sql<number>`COUNT(*) FILTER (WHERE status = 'abandoned')`,
          totalActive: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`,
          totalValue: sql<string>`COALESCE(SUM(total_amount) FILTER (WHERE status = 'abandoned'), 0)`,
          withPhone: sql<number>`COUNT(*) FILTER (WHERE status = 'abandoned' AND customer_phone IS NOT NULL)`,
        })
        .from(cartSessionsTable)
        .where(
          and(
            eq(cartSessionsTable.tenantId, tenantId),
            ne(cartSessionsTable.status, "converted"),
          ),
        );

      res.json({
        carts: rows.map((r) => ({
          ...r,
          totalAmount: parseFloat(r.totalAmount as string),
          lastActivityAt: r.lastActivityAt.toISOString(),
          convertedAt: r.convertedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        stats: {
          totalAbandoned: Number(stats?.totalAbandoned ?? 0),
          totalActive: Number(stats?.totalActive ?? 0),
          totalValue: parseFloat(String(stats?.totalValue ?? "0")),
          withPhone: Number(stats?.withPhone ?? 0),
        },
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "خطأ في السيرفر" });
    }
  },
);

// POST /api/abandoned-carts/:id/remind — generate WhatsApp link
router.post(
  "/abandoned-carts/:id/remind",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });

    try {
      const [cart] = await db
        .select({
          id: cartSessionsTable.id,
          customerPhone: cartSessionsTable.customerPhone,
          customerName: cartSessionsTable.customerName,
          totalAmount: cartSessionsTable.totalAmount,
          tenantId: cartSessionsTable.tenantId,
        })
        .from(cartSessionsTable)
        .where(
          and(
            eq(cartSessionsTable.id, id),
            eq(cartSessionsTable.tenantId, tenantId),
          ),
        );

      if (!cart) return res.status(404).json({ error: "السلة غير موجودة" });
      if (!cart.customerPhone)
        return res.status(400).json({ error: "لا يوجد رقم واتساب للعميل" });

      const [tenant] = await db
        .select({ name: tenantsTable.name, slug: tenantsTable.slug })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId));

      const name = cart.customerName ?? "عزيزنا";
      const total = parseFloat(cart.totalAmount as string).toLocaleString(
        "ar-EG",
      );
      const storeName = tenant?.name ?? "متجرنا";
      const storeUrl = tenant?.slug
        ? `https://matjareg.com/store/${tenant.slug}`
        : "";

      const message = `مرحباً ${name} 👋\n\nلاحظنا أن سلة تسوقك في ${storeName} بقيمة ${total} ج.م لا تزال تنتظرك! 🛒\n\nأكملي الشراء الآن:\n${storeUrl}\n\nنحن هنا لأي مساعدة 💬`;

      const phone = cart.customerPhone.replace(/\D/g, "");
      const waUrl = `https://wa.me/${phone.startsWith("0") ? "2" + phone : phone}?text=${encodeURIComponent(message)}`;

      res.json({ waUrl, message, phone: cart.customerPhone });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "خطأ في السيرفر" });
    }
  },
);

// DELETE /api/abandoned-carts/:id — merchant: dismiss/delete cart
router.delete(
  "/abandoned-carts/:id",
  requireRole("owner", "manager"),
  async (req, res) => {
    const tenantId = req.merchantTenantId;
    if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صالح" });
    try {
      await db
        .delete(cartSessionsTable)
        .where(
          and(
            eq(cartSessionsTable.id, id),
            eq(cartSessionsTable.tenantId, tenantId),
          ),
        );
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل الحذف" });
    }
  },
);

export default router;
