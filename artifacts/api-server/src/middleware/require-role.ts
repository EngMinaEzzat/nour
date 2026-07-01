import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { merchantsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Subscription status cache (60-second TTL per tenant) ───────────────────
interface SubscriptionCacheEntry {
  status: string;
  trialEndsAt: Date | null;
  cachedAt: number;
}

const subscriptionCache = new Map<number, SubscriptionCacheEntry>();
const CACHE_TTL_MS = 60_000;

export function invalidateSubscriptionCache(tenantId: number): void {
  subscriptionCache.delete(tenantId);
}

export type MerchantRole = "owner" | "manager" | "staff" | "catalog_manager" | "order_operator" | "marketing_analyst";

const ROLE_RANK: Record<MerchantRole, number> = {
  owner: 5,
  manager: 4,
  catalog_manager: 3,
  order_operator: 3,
  marketing_analyst: 3,
  staff: 2,
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.merchantId) {
    return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
  }
  return next();
}

export function requireRole(...roles: MerchantRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const merchantId = req.session.merchantId;
    if (!merchantId) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });

    try {
      const [merchant] = await db
        .select({ role: merchantsTable.role, tenantId: merchantsTable.tenantId })
        .from(merchantsTable)
        .where(eq(merchantsTable.id, merchantId));

      if (!merchant) return res.status(401).json({ error: "الجلسة غير صالحة" });

      const hasRole = roles.some((r) => ROLE_RANK[merchant.role as MerchantRole] >= ROLE_RANK[r]);
      if (!hasRole) {
        return res.status(403).json({ error: "ليس لديك صلاحية للقيام بهذا الإجراء" });
      }

      req.merchantRole = merchant.role as MerchantRole;
      req.merchantTenantId = merchant.tenantId;

      // Subscription gate: check tenant subscription status, using a 60-second cache
      // to avoid a DB round-trip on every authenticated request.
      const tenantId = merchant.tenantId;
      const now = Date.now();
      const cached = subscriptionCache.get(tenantId);

      let subscriptionStatus: string;
      let trialEndsAt: Date | null;

      if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
        subscriptionStatus = cached.status;
        trialEndsAt = cached.trialEndsAt;
      } else {
        const [tenant] = await db
          .select({
            subscriptionStatus: tenantsTable.subscriptionStatus,
            trialEndsAt: tenantsTable.trialEndsAt,
          })
          .from(tenantsTable)
          .where(eq(tenantsTable.id, tenantId));

        if (!tenant) return res.status(401).json({ error: "المتجر غير موجود" });

        subscriptionStatus = tenant.subscriptionStatus;
        trialEndsAt = tenant.trialEndsAt;
        subscriptionCache.set(tenantId, {
          status: subscriptionStatus,
          trialEndsAt,
          cachedAt: now,
        });
      }

      const nowDate = new Date();

      if (subscriptionStatus === "active") return next();

      // Bypass subscription gate for billing-related requests, plan entitlements, and image uploads
      const isBypassRoute =
        req.path.startsWith("/billing/") ||
        req.path === "/plans/entitlements" ||
        req.path === "/uploads/image";

      if (isBypassRoute) return next();

      if (subscriptionStatus === "trial") {
        if (!trialEndsAt || trialEndsAt > nowDate) return next();
        return res.status(402).json({
          error: "انتهت الفترة التجريبية — يرجى الاشتراك للمتابعة",
          code: "TRIAL_EXPIRED",
          trialEndsAt: trialEndsAt.toISOString(),
        });
      }

      if (subscriptionStatus === "suspended" || subscriptionStatus === "past_due") {
        return res.status(402).json({
          error: "الاشتراك موقوف — يرجى تجديد الاشتراك للمتابعة",
          code: "SUBSCRIPTION_SUSPENDED",
        });
      }

      if (subscriptionStatus === "canceled") {
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
  };
}

export async function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const merchantId = req.session.merchantId;
  if (!merchantId) return res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });

  try {
    const [merchant] = await db
      .select({ isPlatformAdmin: merchantsTable.isPlatformAdmin, tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant) return res.status(401).json({ error: "الجلسة غير صالحة" });
    if (!merchant.isPlatformAdmin) {
      return res.status(403).json({ error: "هذه الصفحة للمشغلين فقط" });
    }

    req.merchantTenantId = merchant.tenantId;
    return next();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
}
