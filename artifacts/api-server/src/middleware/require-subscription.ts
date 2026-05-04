import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return next();

  try {
    const [tenant] = await db
      .select({
        subscriptionStatus: tenantsTable.subscriptionStatus,
        trialEndsAt: tenantsTable.trialEndsAt,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!tenant) return res.status(401).json({ error: "المتجر غير موجود" });

    const now = new Date();

    if (tenant.subscriptionStatus === "active") return next();

    if (tenant.subscriptionStatus === "trial") {
      if (!tenant.trialEndsAt || tenant.trialEndsAt > now) return next();
      return res.status(402).json({
        error: "انتهت الفترة التجريبية",
        code: "TRIAL_EXPIRED",
        trialEndsAt: tenant.trialEndsAt.toISOString(),
      });
    }

    if (tenant.subscriptionStatus === "suspended" || tenant.subscriptionStatus === "past_due") {
      return res.status(402).json({
        error: "الاشتراك موقوف — يرجى تجديد الاشتراك للمتابعة",
        code: "SUBSCRIPTION_SUSPENDED",
      });
    }

    if (tenant.subscriptionStatus === "canceled") {
      return res.status(402).json({
        error: "تم إلغاء الاشتراك",
        code: "SUBSCRIPTION_CANCELED",
      });
    }

    return next();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
}
