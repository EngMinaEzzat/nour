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
      status: "queued",
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      downloadToken,
      expiresAt,
      startedAt: new Date(),
    }).returning();

    const { backgroundJobsTable } = await import("@workspace/db");
    await db.insert(backgroundJobsTable).values({
      tenantId,
      jobType: "export.csv",
      payload: { exportJobId: job.id },
      idempotencyKey: `export-${job.id}-${crypto.randomBytes(4).toString("hex")}`
    });

    res.status(202).json({ message: "تم وضع طلب التصدير في قائمة الانتظار", jobId: job.id });
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
