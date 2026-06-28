import { Router } from "express";
import { db } from "@workspace/db";
import {
  tenantsTable,
  productsTable,
  ordersTable,
  merchantOnboardingTable,
  whatsappProvidersTable,
  whatsappMessageLogsTable,
  merchantsTable,
  billingTransferRequestsTable,
  billingInvoicesTable,
} from "@workspace/db";
import { eq, count, sql, desc, and, asc, sum, inArray } from "drizzle-orm";
import {
  requirePlatformAdmin,
  invalidateSubscriptionCache,
} from "../middleware/require-role";
import { getPlan } from "../lib/entitlements";
import { sendSubscriptionSuspendedEmail } from "../lib/email.js";

const router = Router();

router.get("/platform/stats", requirePlatformAdmin, async (req, res) => {
  try {
    // ⚡ Bolt Optimization: Use Promise.all to fetch independent analytics data concurrently
    // This eliminates sequential N+1 query waterfall delays and reduces endpoint latency.
    const [allTenants, productCounts, orderCounts, onboardingRows] =
      await Promise.all([
        db
          .select({
            id: tenantsTable.id,
            planCode: tenantsTable.planCode,
            subscriptionStatus: tenantsTable.subscriptionStatus,
          })
          .from(tenantsTable),
        db
          .select({ tenantId: productsTable.tenantId, cnt: count() })
          .from(productsTable)
          .groupBy(productsTable.tenantId),
        db
          .select({ tenantId: ordersTable.tenantId, cnt: count() })
          .from(ordersTable)
          .groupBy(ordersTable.tenantId),
        db
          .select({
            tenantId: merchantOnboardingTable.tenantId,
            storeIdentityDone: merchantOnboardingTable.storeIdentityDone,
            homepageMessageDone: merchantOnboardingTable.homepageMessageDone,
            firstProductDone: merchantOnboardingTable.firstProductDone,
            shippingSetupDone: merchantOnboardingTable.shippingSetupDone,
            integrationsReviewDone:
              merchantOnboardingTable.integrationsReviewDone,
            launchReviewDone: merchantOnboardingTable.launchReviewDone,
          })
          .from(merchantOnboardingTable),
      ]);

    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter(
      (t) => t.subscriptionStatus === "active",
    ).length;
    const trialTenants = allTenants.filter(
      (t) => t.subscriptionStatus === "trial",
    ).length;
    const suspendedTenants = allTenants.filter(
      (t) =>
        t.subscriptionStatus === "suspended" ||
        t.subscriptionStatus === "past_due",
    ).length;

    const planBreakdownMap: Record<string, number> = {};
    for (const t of allTenants) {
      planBreakdownMap[t.planCode] = (planBreakdownMap[t.planCode] ?? 0) + 1;
    }
    const planBreakdown = Object.entries(planBreakdownMap).map(
      ([planCode, cnt]) => ({
        planCode,
        count: cnt,
      }),
    );

    const tenantIds = allTenants.map((t) => t.id);

    let tenantsWithNoProducts = 0;
    let tenantsWithNoOrders = 0;
    let tenantsNearProductLimit = 0;

    if (tenantIds.length > 0) {
      const productCountMap: Record<number, number> = {};
      for (const row of productCounts) {
        productCountMap[row.tenantId] = row.cnt;
      }
      const orderCountMap: Record<number, number> = {};
      for (const row of orderCounts) {
        orderCountMap[row.tenantId] = row.cnt;
      }

      for (const tenant of allTenants) {
        const pc = productCountMap[tenant.id] ?? 0;
        const oc = orderCountMap[tenant.id] ?? 0;
        const plan = getPlan(tenant.planCode);

        if (pc === 0) tenantsWithNoProducts++;
        if (oc === 0) tenantsWithNoOrders++;

        if (plan.productLimit !== -1 && plan.productLimit > 0) {
          if (pc / plan.productLimit >= 0.8) tenantsNearProductLimit++;
        }
      }
    }

    let complete = 0,
      partial = 0,
      notStarted = 0;
    for (const row of onboardingRows) {
      const completedCount = [
        row.storeIdentityDone,
        row.homepageMessageDone,
        row.firstProductDone,
        row.shippingSetupDone,
        row.integrationsReviewDone,
        row.launchReviewDone,
      ].filter(Boolean).length;
      if (completedCount === 6) complete++;
      else if (completedCount > 0) partial++;
      else notStarted++;
    }

    res.json({
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      tenantsWithNoProducts,
      tenantsWithNoOrders,
      tenantsNearProductLimit,
      planBreakdown,
      onboardingCompletion: { complete, partial, notStarted },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إحصائيات المنصة" });
  }
});

/* ─── Provider health: list WhatsApp providers with recent failures ─── */
router.get(
  "/platform/provider-health",
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const providers = await db
        .select({
          id: whatsappProvidersTable.id,
          tenantId: whatsappProvidersTable.tenantId,
          tenantName: tenantsTable.name,
          tenantSlug: tenantsTable.slug,
          status: whatsappProvidersTable.status,
          phoneNumberId: whatsappProvidersTable.phoneNumberId,
          isMockAllowed: whatsappProvidersTable.isMockAllowed,
          updatedAt: whatsappProvidersTable.updatedAt,
        })
        .from(whatsappProvidersTable)
        .leftJoin(
          tenantsTable,
          eq(whatsappProvidersTable.tenantId, tenantsTable.id),
        )
        .orderBy(whatsappProvidersTable.updatedAt);

      // ⚡ Bolt Optimization: Fix N+1 queries by batching stats and recent logs
      const tenantIds = providers.map((p) => p.tenantId);

      const statsMap = new Map<number, { total: number; failed: number; sent: number }>();
      const recentMap = new Map<number, any[]>();

      if (tenantIds.length > 0) {
        const sq = db
          .select({
            id: whatsappMessageLogsTable.id,
            tenantId: whatsappMessageLogsTable.tenantId,
            messageType: whatsappMessageLogsTable.messageType,
            status: whatsappMessageLogsTable.status,
            errorMessage: whatsappMessageLogsTable.errorMessage,
            createdAt: whatsappMessageLogsTable.createdAt,
            rn: sql<number>`row_number() over (partition by ${whatsappMessageLogsTable.tenantId} order by ${whatsappMessageLogsTable.createdAt} desc)`.as('rn')
          })
          .from(whatsappMessageLogsTable)
          .where(inArray(whatsappMessageLogsTable.tenantId, tenantIds))
          .as('sq');

        const [statsData, recentData] = await Promise.all([
          db
            .select({
              tenantId: whatsappMessageLogsTable.tenantId,
              total: count(),
              failed: sql<number>`count(*) filter (where ${whatsappMessageLogsTable.status} = 'FAILED')`,
              sent: sql<number>`count(*) filter (where ${whatsappMessageLogsTable.status} = 'SENT')`,
            })
            .from(whatsappMessageLogsTable)
            .where(inArray(whatsappMessageLogsTable.tenantId, tenantIds))
            .groupBy(whatsappMessageLogsTable.tenantId),
          db
            .select({
              id: sq.id,
              tenantId: sq.tenantId,
              messageType: sq.messageType,
              status: sq.status,
              errorMessage: sq.errorMessage,
              createdAt: sq.createdAt,
            })
            .from(sq)
            .where(sql`${sq.rn} <= 5`)
            .orderBy(desc(sq.createdAt))
        ]);

        for (const stat of statsData) {
          statsMap.set(stat.tenantId, {
            total: stat.total,
            failed: Number(stat.failed ?? 0),
            sent: Number(stat.sent ?? 0),
          });
        }

        for (const r of recentData) {
          if (!recentMap.has(r.tenantId)) {
            recentMap.set(r.tenantId, []);
          }
          recentMap.get(r.tenantId)!.push({
            ...r,
            createdAt: r.createdAt.toISOString(),
          });
        }
      }

      const withStats = providers.map((p) => {
        const stats = statsMap.get(p.tenantId) || { total: 0, failed: 0, sent: 0 };
        const recentLogs = recentMap.get(p.tenantId) || [];

        return {
          ...p,
          updatedAt: p.updatedAt.toISOString(),
          messageStats: stats,
          recentLogs,
        };
      });

      res.json(withStats);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب صحة المزودين" });
    }
  },
);

/* ─── Disable provider for a tenant ─── */
router.put(
  "/platform/provider-health/:tenantId/disable",
  requirePlatformAdmin,
  async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId))
      return res.status(400).json({ error: "معرّف المتجر غير صحيح" });

    try {
      await db
        .update(whatsappProvidersTable)
        .set({ status: "CONFIGURED_DISABLED", updatedAt: new Date() })
        .where(eq(whatsappProvidersTable.tenantId, tenantId));
      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل تعطيل المزود" });
    }
  },
);

/* ─── Tenant health scores ─── */
router.get(
  "/platform/health-scores",
  requirePlatformAdmin,
  async (req, res) => {
    try {
      // ⚡ Bolt Optimization: Fetch tenant aggregates concurrently to reduce response times
      const [allTenants, productCounts, orderCounts] = await Promise.all([
        db
          .select({
            id: tenantsTable.id,
            name: tenantsTable.name,
            slug: tenantsTable.slug,
            planCode: tenantsTable.planCode,
            subscriptionStatus: tenantsTable.subscriptionStatus,
            createdAt: tenantsTable.createdAt,
          })
          .from(tenantsTable),
        db
          .select({ tenantId: productsTable.tenantId, cnt: count() })
          .from(productsTable)
          .groupBy(productsTable.tenantId),
        db
          .select({ tenantId: ordersTable.tenantId, cnt: count() })
          .from(ordersTable)
          .groupBy(ordersTable.tenantId),
      ]);

      const productMap: Record<number, number> = {};
      for (const r of productCounts) productMap[r.tenantId] = r.cnt;
      const orderMap: Record<number, number> = {};
      for (const r of orderCounts) orderMap[r.tenantId] = r.cnt;

      const scores = allTenants.map((t) => {
        const pc = productMap[t.id] ?? 0;
        const oc = orderMap[t.id] ?? 0;
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(t.createdAt).getTime()) / 86400000,
        );

        let score = 0;
        const signals: string[] = [];

        if (t.subscriptionStatus === "active") {
          score += 30;
          signals.push("اشتراك نشط");
        } else if (t.subscriptionStatus === "trial") {
          score += 10;
          signals.push("فترة تجريبية");
        }

        if (pc >= 10) {
          score += 25;
          signals.push(`${pc} منتج`);
        } else if (pc > 0) {
          score += 10;
          signals.push(`${pc} منتج`);
        } else signals.push("لا توجد منتجات");

        if (oc >= 20) {
          score += 30;
          signals.push(`${oc} طلب`);
        } else if (oc >= 5) {
          score += 20;
          signals.push(`${oc} طلب`);
        } else if (oc > 0) {
          score += 10;
          signals.push(`${oc} طلب`);
        } else signals.push("لا توجد طلبات");

        if (daysSinceCreated > 30 && oc === 0) score -= 10;

        const healthLabel =
          score >= 70
            ? "ممتاز"
            : score >= 40
              ? "جيد"
              : score >= 20
                ? "ضعيف"
                : "حرج";
        return {
          tenantId: t.id,
          name: t.name,
          slug: t.slug,
          planCode: t.planCode,
          subscriptionStatus: t.subscriptionStatus,
          score: Math.max(0, Math.min(100, score)),
          healthLabel,
          signals,
          productCount: pc,
          orderCount: oc,
        };
      });

      scores.sort((a, b) => a.score - b.score);
      res.json(scores);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل حساب درجات الصحة" });
    }
  },
);

/* ─── Manual suspend / reactivate ─── */
router.put(
  "/platform/merchants/:tenantId/status",
  requirePlatformAdmin,
  async (req, res) => {
    const tenantId = Number(req.params.tenantId);
    if (isNaN(tenantId))
      return res.status(400).json({ error: "معرّف المتجر غير صحيح" });

    const { action } = req.body as { action?: string };
    if (action !== "suspend" && action !== "activate") {
      return res
        .status(400)
        .json({ error: "action must be 'suspend' or 'activate'" });
    }

    const newStatus = action === "suspend" ? "suspended" : "active";

    try {
      const [updated] = await db
        .update(tenantsTable)
        .set({ subscriptionStatus: newStatus })
        .where(eq(tenantsTable.id, tenantId))
        .returning({
          id: tenantsTable.id,
          subscriptionStatus: tenantsTable.subscriptionStatus,
        });

      if (!updated) return res.status(404).json({ error: "Tenant not found" });

      // Evict cached subscription status so the next auth request sees the new state
      invalidateSubscriptionCache(tenantId);

      if (action === "suspend") {
        const [owner] = await db
          .select({ email: merchantsTable.email, name: tenantsTable.name })
          .from(merchantsTable)
          .innerJoin(tenantsTable, eq(merchantsTable.tenantId, tenantsTable.id))
          .where(
            and(
              eq(merchantsTable.tenantId, tenantId),
              eq(merchantsTable.role, "owner"),
            ),
          );

        if (owner?.email) {
          const baseUrl = (process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim() !== "")
            ? process.env.APP_BASE_URL
            : "https://matjareg.com";
          sendSubscriptionSuspendedEmail(
            owner.email,
            owner.name,
            `${baseUrl}/billing`,
          ).catch((err) => req.log.warn({ err }, "Suspension email failed"));
        }
      }

      res.json({ success: true, subscriptionStatus: newStatus });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل تحديث الحالة" });
    }
  },
);

/* ─── Merchant list with owner email ─── */
router.get("/platform/merchants", requirePlatformAdmin, async (req, res) => {
  try {
    // ⚡ Bolt Optimization: Group independent sub-queries in Promise.all to avoid blocking IO
    const [productCounts, orderStats, rows] = await Promise.all([
      db
        .select({
          tenantId: productsTable.tenantId,
          productCount: count(),
        })
        .from(productsTable)
        .groupBy(productsTable.tenantId),
      db
        .select({
          tenantId: ordersTable.tenantId,
          orderCount: count(),
          totalRevenue: sum(ordersTable.totalAmount),
        })
        .from(ordersTable)
        .groupBy(ordersTable.tenantId),
      db
        .select({
          tenantId: tenantsTable.id,
          storeName: tenantsTable.name,
          slug: tenantsTable.slug,
          city: tenantsTable.city,
          planCode: tenantsTable.planCode,
          subscriptionStatus: tenantsTable.subscriptionStatus,
          status: tenantsTable.status,
          createdAt: tenantsTable.createdAt,
          ownerEmail: merchantsTable.email,
          ownerName: merchantsTable.name,
        })
        .from(tenantsTable)
        .leftJoin(
          merchantsTable,
          and(
            eq(merchantsTable.tenantId, tenantsTable.id),
            eq(merchantsTable.role, "owner"),
          ),
        )
        .orderBy(desc(tenantsTable.createdAt)),
    ]);

    const productCountByTenant = new Map(
      productCounts.map((row) => [row.tenantId, row.productCount]),
    );
    const orderStatsByTenant = new Map(
      orderStats.map((row) => [
        row.tenantId,
        {
          orderCount: row.orderCount,
          totalRevenue: Number(row.totalRevenue ?? 0),
        },
      ]),
    );

    res.json(
      rows.map((r) => ({
        ...r,
        productCount: productCountByTenant.get(r.tenantId) ?? 0,
        orderCount: orderStatsByTenant.get(r.tenantId)?.orderCount ?? 0,
        totalRevenue: orderStatsByTenant.get(r.tenantId)?.totalRevenue ?? 0,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب التجار" });
  }
});

/* ─── Admin: list all transfer requests ─── */
router.get(
  "/platform/transfer-requests",
  requirePlatformAdmin,
  async (req, res) => {
    try {
      const rows = await db
        .select({
          id: billingTransferRequestsTable.id,
          tenantId: billingTransferRequestsTable.tenantId,
          planCode: billingTransferRequestsTable.planCode,
          amount: billingTransferRequestsTable.amount,
          referenceNumber: billingTransferRequestsTable.referenceNumber,
          receiptImageUrl: billingTransferRequestsTable.receiptImageUrl,
          status: billingTransferRequestsTable.status,
          adminNote: billingTransferRequestsTable.adminNote,
          createdAt: billingTransferRequestsTable.createdAt,
          reviewedAt: billingTransferRequestsTable.reviewedAt,
          storeName: tenantsTable.name,
          slug: tenantsTable.slug,
          ownerEmail: merchantsTable.email,
        })
        .from(billingTransferRequestsTable)
        .leftJoin(
          tenantsTable,
          eq(billingTransferRequestsTable.tenantId, tenantsTable.id),
        )
        .leftJoin(
          merchantsTable,
          and(
            eq(merchantsTable.tenantId, billingTransferRequestsTable.tenantId),
            eq(merchantsTable.role, "owner"),
          ),
        )
        .orderBy(asc(billingTransferRequestsTable.createdAt));

      res.json(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        })),
      );
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل جلب طلبات التحويل" });
    }
  },
);

/* ─── Admin: approve transfer request ─── */
router.put(
  "/platform/transfer-requests/:id/approve",
  requirePlatformAdmin,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صحيح" });

    try {
      const [request] = await db
        .select()
        .from(billingTransferRequestsTable)
        .where(eq(billingTransferRequestsTable.id, id));
      if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
      if (request.status !== "pending")
        return res.status(409).json({ error: "الطلب تمت مراجعته مسبقًا" });

      const [tenant] = await db
        .select({
          subscriptionStatus: tenantsTable.subscriptionStatus,
          trialEndsAt: tenantsTable.trialEndsAt,
          subscriptionStartedAt: tenantsTable.subscriptionStartedAt,
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, request.tenantId));

      if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

      const now = new Date();
      const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

      let periodStart: Date;
      let newSubscriptionStartedAt: Date;

      if (
        tenant.subscriptionStatus === "trial" &&
        tenant.trialEndsAt &&
        tenant.trialEndsAt > now
      ) {
        periodStart = tenant.trialEndsAt;
      } else if (tenant.subscriptionStartedAt) {
        const prevEnd = new Date(
          tenant.subscriptionStartedAt.getTime() + MONTH_MS,
        );
        periodStart = prevEnd > now ? prevEnd : now;
      } else {
        periodStart = now;
      }

      const periodEnd = new Date(periodStart.getTime() + MONTH_MS);
      newSubscriptionStartedAt = periodStart;

      await db.transaction(async (tx) => {
        await tx
          .update(billingTransferRequestsTable)
          .set({
            status: "approved",
            reviewedBy: req.session.merchantId,
            reviewedAt: now,
            updatedAt: now,
          })
          .where(eq(billingTransferRequestsTable.id, id));

        await tx
          .update(tenantsTable)
          .set({
            subscriptionStatus: "active",
            planCode: request.planCode,
            subscriptionStartedAt: newSubscriptionStartedAt,
          })
          .where(eq(tenantsTable.id, request.tenantId));

        const invoiceNumber = `INV-${request.tenantId}-${Date.now()}`;
        await tx.insert(billingInvoicesTable).values({
          tenantId: request.tenantId,
          invoiceNumber,
          planCode: request.planCode,
          amount: String(request.amount),
          status: "paid",
          providerReference: request.referenceNumber,
          periodStart,
          periodEnd,
          issuedAt: now,
          paidAt: now,
          createdBy: req.session.merchantId,
        });
      });

      // Evict cached subscription so merchant is unblocked immediately after approval
      invalidateSubscriptionCache(request.tenantId);

      res.json({
        success: true,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل قبول الطلب" });
    }
  },
);

/* ─── Admin: reject transfer request ─── */
router.put(
  "/platform/transfer-requests/:id/reject",
  requirePlatformAdmin,
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "معرّف غير صحيح" });
    const { note } = req.body as { note?: string };

    try {
      const [request] = await db
        .select({
          id: billingTransferRequestsTable.id,
          status: billingTransferRequestsTable.status,
        })
        .from(billingTransferRequestsTable)
        .where(eq(billingTransferRequestsTable.id, id));
      if (!request) return res.status(404).json({ error: "الطلب غير موجود" });
      if (request.status !== "pending")
        return res.status(409).json({ error: "الطلب تمت مراجعته مسبقًا" });

      await db
        .update(billingTransferRequestsTable)
        .set({
          status: "rejected",
          adminNote: note ?? null,
          reviewedBy: req.session.merchantId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(billingTransferRequestsTable.id, id));

      res.json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل رفض الطلب" });
    }
  },
);

export default router;
