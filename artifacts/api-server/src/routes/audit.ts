import { Router } from "express";
import { db } from "@workspace/db";
import { tenantAuditEventsTable, tenantsTable } from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET /audit/events — platform admin sees all tenant events
router.get("/audit/events", requirePlatformAdmin, async (req, res) => {
  try {
    const { tenantId, eventType, limit = 100 } = req.query;
    const conds: any[] = [];
    if (tenantId) conds.push(eq(tenantAuditEventsTable.tenantId, Number(tenantId)));
    if (eventType) conds.push(eq(tenantAuditEventsTable.eventType, eventType as any));

    const events = await db.select({
      id: tenantAuditEventsTable.id,
      tenantId: tenantAuditEventsTable.tenantId,
      actorId: tenantAuditEventsTable.actorId,
      actorLabel: tenantAuditEventsTable.actorLabel,
      eventType: tenantAuditEventsTable.eventType,
      summary: tenantAuditEventsTable.summary,
      metadata: tenantAuditEventsTable.metadata,
      createdAt: tenantAuditEventsTable.createdAt,
    }).from(tenantAuditEventsTable)
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(tenantAuditEventsTable.createdAt))
      .limit(Number(limit));

    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب سجل الأحداث" });
  }
});

// GET /audit/events/my — merchant sees their own tenant audit events
router.get("/audit/events/my", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const events = await db.select().from(tenantAuditEventsTable)
      .where(eq(tenantAuditEventsTable.tenantId, tenantId))
      .orderBy(desc(tenantAuditEventsTable.createdAt))
      .limit(50);
    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب السجل" });
  }
});

export default router;
