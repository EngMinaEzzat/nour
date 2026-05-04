import { Router } from "express";
import { db } from "@workspace/db";
import {
  merchantOnboardingTable, merchantsTable, tenantsTable,
  productsTable, categoriesTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middleware/require-role";

const router = Router();

const MANUAL_STEPS = [
  "homepage_message",
  "shipping_setup",
  "integrations_review",
  "launch_review",
] as const;

type ManualStep = (typeof MANUAL_STEPS)[number];

const STEP_TO_FIELD: Record<ManualStep, keyof typeof merchantOnboardingTable.$inferSelect> = {
  homepage_message: "homepageMessageDone",
  shipping_setup: "shippingSetupDone",
  integrations_review: "integrationsReviewDone",
  launch_review: "launchReviewDone",
};

async function getOrCreateRecord(tenantId: number) {
  const [existing] = await db
    .select()
    .from(merchantOnboardingTable)
    .where(eq(merchantOnboardingTable.tenantId, tenantId));
  if (existing) return existing;
  const [created] = await db
    .insert(merchantOnboardingTable)
    .values({ tenantId })
    .returning();
  return created;
}

router.get("/onboarding", requireAuth, async (req, res) => {
  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "غير مصرح" });

    const tenantId = merchant.tenantId;
    const record = await getOrCreateRecord(tenantId);

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId));
    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(productsTable)
      .where(eq(productsTable.tenantId, tenantId));

    const storeIdentityDone =
      !!tenant?.name &&
      (tenant?.description?.length ?? 0) > 10 &&
      !!(tenant?.logoUrl || tenant?.coverUrl || tenant?.primaryColor);

    const firstProductDone = productCount > 0;

    const steps = [
      {
        key: "store_identity",
        label: "هوية المتجر",
        description: "أضف شعار متجرك وألوانه ووصفه التعريفي",
        done: storeIdentityDone,
        href: "/store-settings",
      },
      {
        key: "homepage_message",
        label: "رسالة الصفحة الرئيسية",
        description: "خصّص رسالة الترحيب التي يراها عملاؤك أول ما يفتحون متجرك",
        done: record.homepageMessageDone,
        href: "/store-settings",
      },
      {
        key: "first_product",
        label: "أضف منتجك الأول",
        description: "أضف منتجاً بصورة وسعر ومخزون ليراه عملاؤك",
        done: firstProductDone,
        href: "/products",
      },
      {
        key: "shipping_setup",
        label: "إعداد الشحن والتوصيل",
        description: "راجع خيارات التوصيل وتكلفة الشحن للمحافظات",
        done: record.shippingSetupDone,
        href: "/store-settings",
      },
      {
        key: "integrations_review",
        label: "مراجعة وسائل الدفع",
        description: "الدفع عند الاستلام جاهز — راجع حالة وسائل الدفع الأخرى",
        done: record.integrationsReviewDone,
        href: "/store-settings",
      },
      {
        key: "launch_review",
        label: "مراجعة الإطلاق",
        description: "اعرض متجرك بعيون عميلك وتأكد أن كل شيء جاهز",
        done: record.launchReviewDone,
        href: tenant ? `/store/${tenant.slug}` : "/",
      },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    res.json({ tenantId, steps, completedCount, totalCount: 6, isComplete: completedCount === 6 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب خطوات البدء" });
  }
});

router.patch("/onboarding", requireAuth, async (req, res) => {
  const { step, done } = req.body as { step?: string; done?: boolean };
  if (!step || typeof done !== "boolean") {
    return res.status(400).json({ error: "step و done مطلوبان" });
  }
  if (!MANUAL_STEPS.includes(step as ManualStep)) {
    return res.status(400).json({ error: "خطوة غير صالحة" });
  }

  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));
    if (!merchant) return res.status(401).json({ error: "غير مصرح" });

    const tenantId = merchant.tenantId;
    await getOrCreateRecord(tenantId);

    const field = STEP_TO_FIELD[step as ManualStep];
    await db
      .update(merchantOnboardingTable)
      .set({ [field]: done, updatedAt: new Date() })
      .where(eq(merchantOnboardingTable.tenantId, tenantId));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث خطوات البدء" });
  }
});

export default router;
