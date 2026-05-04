import { Router } from "express";
import { db } from "@workspace/db";
import { automationRulesTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

const PLAN_ORDER: Record<string, number> = { starter: 0, growth: 1, pro: 2 };

function planAllows(tenantPlan: string, required: string): boolean {
  return (PLAN_ORDER[tenantPlan] ?? 0) >= (PLAN_ORDER[required] ?? 0);
}

/* ─── List automation rules ─── */
router.get("/automation/rules", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const rules = await db
      .select()
      .from(automationRulesTable)
      .where(eq(automationRulesTable.tenantId, tenantId))
      .orderBy(automationRulesTable.createdAt);

    res.json(rules.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب قواعد الأتمتة" });
  }
});

/* ─── Create automation rule ─── */
router.post("/automation/rules", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { name, trigger, action, config, isEnabled, planRequired } = req.body as {
    name?: string;
    trigger?: string;
    action?: string;
    config?: unknown;
    isEnabled?: boolean;
    planRequired?: string;
  };

  if (!name) return res.status(400).json({ error: "الاسم مطلوب" });
  if (!trigger) return res.status(400).json({ error: "المُشغِّل مطلوب" });
  if (!action) return res.status(400).json({ error: "الإجراء مطلوب" });

  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    const required = planRequired ?? "growth";
    if (!planAllows(tenant?.planCode ?? "starter", required)) {
      return res.status(402).json({ error: `قواعد الأتمتة تتطلب خطة ${required} أو أعلى` });
    }

    const validTriggers = [
      "order_created", "status_changed_to_confirmed", "status_changed_to_dispatched",
      "status_changed_to_delivered", "status_changed_to_cancelled",
      "awaiting_confirmation_timeout", "failed_contact_attempt",
    ];
    const validActions = ["send_whatsapp", "mark_follow_up", "alert_merchant"];

    if (!validTriggers.includes(trigger)) return res.status(400).json({ error: "مُشغِّل غير صالح" });
    if (!validActions.includes(action)) return res.status(400).json({ error: "إجراء غير صالح" });

    const [rule] = await db
      .insert(automationRulesTable)
      .values({
        tenantId,
        name: name.trim(),
        trigger: trigger as typeof automationRulesTable.$inferInsert["trigger"],
        action: action as typeof automationRulesTable.$inferInsert["action"],
        config: config ?? null,
        isEnabled: isEnabled ?? true,
        planRequired: required,
      })
      .returning();

    res.status(201).json({
      ...rule,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء قاعدة الأتمتة" });
  }
});

/* ─── Update automation rule ─── */
router.put("/automation/rules/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const ruleId = Number(req.params.id);
  if (isNaN(ruleId)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [existing] = await db
      .select({ id: automationRulesTable.id, tenantId: automationRulesTable.tenantId })
      .from(automationRulesTable)
      .where(eq(automationRulesTable.id, ruleId));

    if (!existing) return res.status(404).json({ error: "القاعدة غير موجودة" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "غير مصرح" });

    const { name, config, isEnabled } = req.body as {
      name?: string;
      config?: unknown;
      isEnabled?: boolean;
    };

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (config !== undefined) updateData.config = config;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const [updated] = await db
      .update(automationRulesTable)
      .set(updateData)
      .where(eq(automationRulesTable.id, ruleId))
      .returning();

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تعديل قاعدة الأتمتة" });
  }
});

/* ─── Delete automation rule ─── */
router.delete("/automation/rules/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const ruleId = Number(req.params.id);
  if (isNaN(ruleId)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [existing] = await db
      .select({ id: automationRulesTable.id, tenantId: automationRulesTable.tenantId })
      .from(automationRulesTable)
      .where(eq(automationRulesTable.id, ruleId));

    if (!existing) return res.status(404).json({ error: "القاعدة غير موجودة" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "غير مصرح" });

    await db.delete(automationRulesTable).where(eq(automationRulesTable.id, ruleId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف قاعدة الأتمتة" });
  }
});

export default router;
