import { Router } from "express";
import { db } from "@workspace/db";
import { customDomainsTable, tenantsTable, tenantAuditEventsTable } from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const PLAN_ALLOWS_DOMAIN = ["pro"];

// GET /domains/status
router.get("/domains/status", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_DOMAIN.includes(tenant?.planCode ?? "")) {
      return res.json({ planDisallowed: true, planRequired: "pro" });
    }
    const [domain] = await db.select().from(customDomainsTable).where(eq(customDomainsTable.tenantId, tenantId));
    res.json(domain ?? null);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة النطاق" });
  }
});

// POST /domains/request
router.post("/domains/request", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const merchantId = req.session?.merchantId;
    const [tenant] = await db.select({ planCode: tenantsTable.planCode }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    if (!PLAN_ALLOWS_DOMAIN.includes(tenant?.planCode ?? "")) {
      return res.status(402).json({ error: "ربط النطاق المخصص متاح لخطة برو فقط" });
    }

    const { domain } = req.body;
    if (!domain || !/^[a-z0-9][a-z0-9\-\.]+\.[a-z]{2,}$/.test(domain.toLowerCase())) {
      return res.status(400).json({ error: "النطاق المدخل غير صالح" });
    }

    const existing = await db.select().from(customDomainsTable).where(eq(customDomainsTable.tenantId, tenantId));
    if (existing.length > 0 && existing[0].status !== "REMOVED") {
      return res.status(409).json({ error: "يوجد نطاق مخصص بالفعل" });
    }

    const verificationToken = crypto.randomBytes(16).toString("hex");
    const dnsTarget = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "nour.app";

    const [record] = await db.insert(customDomainsTable).values({
      tenantId,
      domain: domain.toLowerCase().trim(),
      status: "PENDING_DNS",
      verificationToken,
      dnsTarget,
      requestedBy: merchantId,
    }).onConflictDoUpdate({
      target: customDomainsTable.tenantId,
      set: { domain: domain.toLowerCase().trim(), status: "PENDING_DNS", verificationToken, dnsTarget, removedAt: null, updatedAt: new Date() },
    }).returning();

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: merchantId,
      actorLabel: "تاجر",
      eventType: "domain_requested",
      summary: `تم طلب ربط النطاق: ${domain}`,
    }).catch(() => {});

    res.status(201).json({
      ...record,
      dnsInstructions: {
        type: "CNAME",
        name: domain,
        value: dnsTarget,
        verificationTxtRecord: `nour-verify=${verificationToken}`,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل طلب ربط النطاق" });
  }
});

// DELETE /domains/remove
router.delete("/domains/remove", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    await db.update(customDomainsTable).set({ status: "REMOVED", removedAt: new Date(), updatedAt: new Date() })
      .where(eq(customDomainsTable.tenantId, tenantId));
    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "تاجر",
      eventType: "domain_removed",
      summary: "تم إزالة النطاق المخصص",
    }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إزالة النطاق" });
  }
});

// PUT /domains/verify/:tenantId — platform admin manually verifies
router.put("/domains/verify/:tenantId", requirePlatformAdmin, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const [domain] = await db.update(customDomainsTable).set({
      status: "ACTIVE",
      verifiedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(customDomainsTable.tenantId, tenantId)).returning();
    if (!domain) return res.status(404).json({ error: "لا يوجد نطاق لهذا المتجر" });
    await db.update(tenantsTable).set({ customDomain: domain.domain, customDomainVerified: true }).where(eq(tenantsTable.id, tenantId));
    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorLabel: "منصة",
      eventType: "domain_verified",
      summary: `تم تفعيل النطاق: ${domain.domain}`,
    }).catch(() => {});
    res.json(domain);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل التحقق من النطاق" });
  }
});

export default router;
