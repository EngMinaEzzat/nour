import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, merchantsTable, ordersTable, tenantsTable } from "@workspace/db";
import { eq, count, and, gte, sql } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { getPlansArray, getPlan, isAtLimit, isNearLimit } from "../lib/entitlements";

const router = Router();

router.get("/plans", (_req, res) => {
  res.json(getPlansArray());
});

router.get("/plans/entitlements", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode, subscriptionStatus: tenantsTable.subscriptionStatus })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    const plan = getPlan(tenant.planCode);

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(productsTable)
      .where(eq(productsTable.tenantId, tenantId));

    const [{ staffCount }] = await db
      .select({ staffCount: count() })
      .from(merchantsTable)
      .where(eq(merchantsTable.tenantId, tenantId));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ monthlyOrderCount }] = await db
      .select({ monthlyOrderCount: count() })
      .from(ordersTable)
      .where(and(
        eq(ordersTable.tenantId, tenantId),
        gte(ordersTable.createdAt, startOfMonth)
      ));

    res.json({
      planCode: tenant.planCode,
      subscriptionStatus: tenant.subscriptionStatus,
      plan,
      usage: { productCount, staffCount, monthlyOrderCount },
      atProductLimit: isAtLimit(productCount, plan.productLimit),
      nearProductLimit: isNearLimit(productCount, plan.productLimit),
      atStaffLimit: isAtLimit(staffCount, plan.staffSeatLimit),
      nearStaffLimit: isNearLimit(staffCount, plan.staffSeatLimit),
      atMonthlyOrderLimit: isAtLimit(monthlyOrderCount, plan.monthlyOrderLimit),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب صلاحيات الخطة" });
  }
});

export default router;
