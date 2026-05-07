import { Router } from "express";
import { db } from "@workspace/db";
import {
  exportJobsTable, ordersTable, orderItemsTable, productsTable,
  customersTable, stockAdjustmentLogsTable, returnCasesTable,
} from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import crypto from "crypto";
import { exportLimiter } from "../lib/rate-limiters";

const router = Router();

const TYPE_LABELS: Record<string, string> = {
  orders: "الطلبات",
  order_items: "عناصر الطلبات",
  products: "المنتجات",
  customers: "العملاء",
  inventory_adjustments: "تعديلات المخزون",
  returns: "المرتجعات",
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

// POST /exports — create export job and run synchronously (small tenants)
router.post("/exports", requireRole("owner", "manager"), exportLimiter, async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const { exportType, dateFrom, dateTo } = req.body;

    const VALID_TYPES = Object.keys(TYPE_LABELS);
    if (!VALID_TYPES.includes(exportType)) return res.status(400).json({ error: "نوع التصدير غير صالح" });

    const downloadToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [job] = await db.insert(exportJobsTable).values({
      tenantId,
      requestedBy: merchantId,
      exportType,
      status: "processing",
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      downloadToken,
      expiresAt,
      startedAt: new Date(),
    }).returning();

    let rows: Record<string, unknown>[] = [];
    const dateFilter = (col: any) => {
      const conds = [eq(col, tenantId)];
      return conds;
    };

    try {
      if (exportType === "orders") {
        const data = await db.select().from(ordersTable).where(eq(ordersTable.tenantId, tenantId)).orderBy(desc(ordersTable.createdAt));
        rows = data.map((o) => ({ id: o.id, status: o.status, total: o.totalAmount, payment: o.paymentMethod, customer: o.customerName, phone: o.customerPhone, governorate: o.shippingGovernorate, created: o.createdAt }));
      } else if (exportType === "products") {
        const data = await db.select().from(productsTable).where(eq(productsTable.tenantId, tenantId));
        rows = data.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, status: p.status }));
      } else if (exportType === "customers") {
        const data = await db.select().from(customersTable);
        rows = data.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, city: c.city }));
      } else if (exportType === "returns") {
        const data = await db.select().from(returnCasesTable).where(eq(returnCasesTable.tenantId, tenantId));
        rows = data.map((r) => ({ id: r.id, orderId: r.orderId, status: r.status, reason: r.reason, created: r.createdAt }));
      } else if (exportType === "inventory_adjustments") {
        const data = await db.select().from(stockAdjustmentLogsTable).where(eq(stockAdjustmentLogsTable.tenantId, tenantId));
        rows = data.map((s) => ({ id: s.id, productId: s.productId, delta: s.delta, source: s.source, reason: s.reason, created: s.createdAt }));
      }

      await db.update(exportJobsTable).set({
        status: "complete",
        rowCount: rows.length,
        completedAt: new Date(),
      }).where(eq(exportJobsTable.id, job.id));

      const csv = toCsv(rows);
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="${exportType}-${tenantId}-${Date.now()}.csv"`);
      res.send(csv);
    } catch (innerErr) {
      await db.update(exportJobsTable).set({ status: "failed", errorMessage: String(innerErr), completedAt: new Date() }).where(eq(exportJobsTable.id, job.id));
      throw innerErr;
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل التصدير" });
  }
});

// GET /exports — list export jobs
router.get("/exports", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const jobs = await db.select().from(exportJobsTable)
      .where(eq(exportJobsTable.tenantId, tenantId))
      .orderBy(desc(exportJobsTable.createdAt))
      .limit(30);
    res.json(jobs.map((j) => ({ ...j, downloadToken: undefined })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب سجلات التصدير" });
  }
});

// GET /exports/platform — platform admin sees all export jobs
router.get("/exports/platform", requirePlatformAdmin, async (req, res) => {
  try {
    const jobs = await db.select().from(exportJobsTable).orderBy(desc(exportJobsTable.createdAt)).limit(100);
    res.json(jobs.map((j) => ({ ...j, downloadToken: undefined })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل" });
  }
});

export default router;
