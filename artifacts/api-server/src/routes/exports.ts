import fs from "node:fs/promises";
import { Router } from "express";
import {
  backgroundJobsTable,
  db,
  exportJobsTable,
  merchantsTable,
} from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { exportLimiter } from "../lib/rate-limiters";
import { requirePlatformAdmin, requireRole } from "../middleware/require-role";
import {
  buildExportRows,
  getExportFilePath,
  toCsv,
  type ExportType,
} from "../lib/export-csv.js";

const router = Router();

const TYPE_LABELS: Record<ExportType, string> = {
  orders: "الطلبات",
  order_items: "عناصر الطلبات",
  products: "المنتجات",
  customers: "العملاء",
  inventory_adjustments: "تعديلات المخزون",
  returns: "المرتجعات",
};

function isValidExportType(value: unknown): value is ExportType {
  return typeof value === "string" && value in TYPE_LABELS;
}

function safeDate(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function publicJob(job: typeof exportJobsTable.$inferSelect) {
  const { downloadToken: _downloadToken, ...safe } = job;
  return safe;
}

router.post(
  "/exports",
  requireRole("owner", "manager"),
  exportLimiter,
  async (req, res) => {
    try {
      const tenantId = req.merchantTenantId!;
      const merchantId = req.session?.merchantId;
      if (!merchantId) return res.status(401).json({ error: "غير مصرح" });
      const [merchant] = await db
        .select()
        .from(merchantsTable)
        .where(eq(merchantsTable.id, merchantId));
      if (!merchant || merchant.tenantId !== tenantId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const { exportType } = req.body;
      const dateFrom = safeDate(req.body.dateFrom);
      const dateTo = safeDate(req.body.dateTo);
      const asyncExport = req.body.async === true;

      if (!isValidExportType(exportType)) {
        return res.status(400).json({ error: "نوع التصدير غير صالح" });
      }

      const downloadToken = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (asyncExport) {
        const [job] = await db
          .insert(exportJobsTable)
          .values({
            tenantId,
            requestedBy: merchantId,
            exportType,
            status: "queued",
            dateFrom,
            dateTo,
            downloadToken,
            expiresAt,
          })
          .returning();

        await db.insert(backgroundJobsTable).values({
          tenantId,
          jobType: "export.csv",
          payload: { exportJobId: job.id },
          idempotencyKey: `export-${job.id}`,
        });

        return res.status(202).json({
          message: "تم وضع طلب التصدير في قائمة الانتظار",
          jobId: job.id,
          downloadUrl: `/api/exports/${job.id}/download`,
        });
      }

      const [job] = await db
        .insert(exportJobsTable)
        .values({
          tenantId,
          requestedBy: merchantId,
          exportType,
          status: "processing",
          dateFrom,
          dateTo,
          downloadToken,
          expiresAt,
          startedAt: new Date(),
        })
        .returning();

      try {
        const rows = await buildExportRows({
          tenantId,
          exportType,
          dateFrom,
          dateTo,
        });
        await db
          .update(exportJobsTable)
          .set({
            status: "complete",
            rowCount: rows.length,
            completedAt: new Date(),
          })
          .where(eq(exportJobsTable.id, job.id));

        const csv = toCsv(rows);
        res.set("Content-Type", "text/csv; charset=utf-8");
        res.set(
          "Content-Disposition",
          `attachment; filename="${exportType}-${tenantId}-${Date.now()}.csv"`,
        );
        return res.send(csv);
      } catch (innerErr) {
        await db
          .update(exportJobsTable)
          .set({
            status: "failed",
            errorMessage: String(innerErr),
            completedAt: new Date(),
          })
          .where(eq(exportJobsTable.id, job.id));
        throw innerErr;
      }
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل التصدير" });
    }
  },
);

router.get(
  "/exports",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    try {
      const tenantId = req.merchantTenantId!;
      const merchantId = req.session?.merchantId;
      if (!merchantId) return res.status(401).json({ error: "غير مصرح" });
      const [merchant] = await db
        .select()
        .from(merchantsTable)
        .where(eq(merchantsTable.id, merchantId));
      if (!merchant || merchant.tenantId !== tenantId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      const jobs = await db
        .select()
        .from(exportJobsTable)
        .where(eq(exportJobsTable.tenantId, tenantId))
        .orderBy(desc(exportJobsTable.createdAt))
        .limit(30);
      res.json(jobs.map(publicJob));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب سجلات التصدير" });
    }
  },
);

router.get(
  "/exports/:id/download",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: "معرف التصدير غير صالح" });
    const merchantId = req.session?.merchantId;
    if (!merchantId) return res.status(401).json({ error: "غير مصرح" });

    try {
      const [merchant] = await db
        .select()
        .from(merchantsTable)
        .where(eq(merchantsTable.id, merchantId));
      if (!merchant || merchant.tenantId !== req.merchantTenantId) {
        return res.status(403).json({ error: "غير مصرح" });
      }

      const [job] = await db
        .select()
        .from(exportJobsTable)
        .where(and(eq(exportJobsTable.id, id), eq(exportJobsTable.tenantId, req.merchantTenantId!)));

      if (!job || job.tenantId !== req.merchantTenantId) {
        return res.status(404).json({ error: "ملف التصدير غير موجود" });
      }
      if (job.status !== "complete" || !job.downloadToken) {
        return res.status(409).json({ error: "ملف التصدير غير جاهز بعد" });
      }
      if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
        return res.status(410).json({ error: "انتهت صلاحية ملف التصدير" });
      }

      const filePath = getExportFilePath(job.id, job.downloadToken);
      const csv = await fs.readFile(filePath, "utf8");
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set(
        "Content-Disposition",
        `attachment; filename="${job.exportType}-${job.tenantId}-${job.id}.csv"`,
      );
      return res.send(csv);
    } catch (err) {
      req.log.error(err);
      res.status(404).json({ error: "ملف التصدير غير موجود" });
    }
  },
);

router.get("/exports/platform", requirePlatformAdmin, async (req, res) => {
  try {
    const jobs = await db
      .select()
      .from(exportJobsTable)
      .orderBy(desc(exportJobsTable.createdAt))
      .limit(100);
    res.json(jobs.map(publicJob));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل" });
  }
});

export default router;
