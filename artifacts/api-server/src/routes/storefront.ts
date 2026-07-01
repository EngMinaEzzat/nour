import { Router } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable,
  ordersTable,
  productsTable,
  productVariantsTable,
  tenantsTable,
  trackingSettingsTable,
} from "@workspace/db";
import { and, count, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { cache } from "../lib/cache.js";
import { storefrontLimiter } from "../lib/rate-limiters";

const router = Router();

router.get("/store/:slug", storefrontLimiter, async (req, res) => {
  const slug = String(req.params.slug);
  const searchQ = (req.query.search as string | undefined)?.trim() ?? null;
  const categoryIdQ = req.query.categoryId
    ? Number(req.query.categoryId)
    : null;

  try {
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(
        and(eq(tenantsTable.slug, slug), eq(tenantsTable.status, "active")),
      );

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    const cacheKey = `tenant:${tenant.id}:storefront:slug=${slug}:q=${searchQ ?? ""}:c=${categoryIdQ ?? ""}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const conditions = [
      eq(productsTable.tenantId, tenant.id),
      eq(productsTable.status, "active"),
    ];
    if (searchQ) conditions.push(ilike(productsTable.name, `%${searchQ.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`));

    // ⚡ Bolt Optimization: Group independent sub-queries in Promise.all to avoid blocking IO
    const [
      { products, variantCounts },
      categoryRows,
      categoryProductCounts,
      [orderStats],
      [trackingSettings]
    ] = await Promise.all([
      (async () => {
        if (categoryIdQ) {
          const subcategories = await db
            .select({ id: categoriesTable.id })
            .from(categoriesTable)
            .where(eq(categoriesTable.parentId, categoryIdQ));

          const categoryIds = [categoryIdQ, ...subcategories.map((s) => s.id)];
          conditions.push(inArray(productsTable.categoryId, categoryIds));
        }

        const products = await db
          .select({
            id: productsTable.id,
            name: productsTable.name,
            description: productsTable.description,
            price: productsTable.price,
            originalPrice: productsTable.originalPrice,
            imageUrl: productsTable.imageUrl,
            stock: productsTable.stock,
            status: productsTable.status,
            categoryId: productsTable.categoryId,
          })
          .from(productsTable)
          .where(and(...conditions) as any)
          .orderBy(productsTable.createdAt);

        const productIds = products.map((p) => p.id);
        let variantCounts: { productId: number; count: number }[] = [];
        if (productIds.length > 0) {
          variantCounts = await db
            .select({
              productId: productVariantsTable.productId,
              count: count(),
            })
            .from(productVariantsTable)
            .where(inArray(productVariantsTable.productId, productIds))
            .groupBy(productVariantsTable.productId);
        }
        return { products, variantCounts };
      })(),
      db
        .select({
          id: categoriesTable.id,
          name: categoriesTable.name,
          nameAr: categoriesTable.nameAr,
          parentId: categoriesTable.parentId,
          type: categoriesTable.type,
          imageUrl: categoriesTable.imageUrl,
        })
        .from(categoriesTable)
        .where(
          or(
            eq(categoriesTable.tenantId, tenant.id),
            isNull(categoriesTable.tenantId),
          ),
        )
        .orderBy(categoriesTable.name),
      db
        .select({ categoryId: productsTable.categoryId, total: count() })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.tenantId, tenant.id),
            eq(productsTable.status, "active"),
          ),
        )
        .groupBy(productsTable.categoryId),
      db
        .select({ totalOrders: count() })
        .from(ordersTable)
        .where(eq(ordersTable.tenantId, tenant.id)),
      db
        .select({
          ga4MeasurementId: trackingSettingsTable.ga4MeasurementId,
          ga4Enabled: trackingSettingsTable.ga4Enabled,
          metaPixelId: trackingSettingsTable.metaPixelId,
          metaEnabled: trackingSettingsTable.metaEnabled,
          tiktokPixelId: trackingSettingsTable.tiktokPixelId,
          tiktokEnabled: trackingSettingsTable.tiktokEnabled,
          googleAdsConversionId: trackingSettingsTable.googleAdsConversionId,
          googleAdsEnabled: trackingSettingsTable.googleAdsEnabled,
        })
        .from(trackingSettingsTable)
        .where(eq(trackingSettingsTable.tenantId, tenant.id)),
    ]);

    const variantCountMap = new Map(
      variantCounts.map((v) => [v.productId, v.count]),
    );

    const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

    const categoryProductCountMap = new Map(
      categoryProductCounts.map((row) => [row.categoryId, row.total]),
    );

    let whatsappNumber: string | null = null;
    let socialLinks: Record<string, string> = {};
    try {
      socialLinks = tenant.socialLinks ? JSON.parse(tenant.socialLinks) : {};
      whatsappNumber = socialLinks.whatsapp || null;
    } catch {}

    const productsWithCategory = products.map((p) => ({
      ...p,
      price: parseFloat(String(p.price)),
      originalPrice: p.originalPrice
        ? parseFloat(String(p.originalPrice))
        : null,
      categoryName: p.categoryId
        ? (categoryMap.get(p.categoryId) ?? null)
        : null,
      hasVariants: (variantCountMap.get(p.id) ?? 0) > 0,
      variantCount: variantCountMap.get(p.id) ?? 0,
    }));

    const responsePayload = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      category: tenant.category,
      status: tenant.status,
      city: tenant.city ?? null,
      logoUrl: tenant.logoUrl ?? null,
      coverUrl: tenant.coverUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
      secondaryColor: tenant.secondaryColor ?? null,
      theme: tenant.theme ?? "classic",
      faviconUrl: tenant.faviconUrl ?? null,
      seoTitle: tenant.seoTitle ?? null,
      seoDescription: tenant.seoDescription ?? null,
      socialLinks,
      storeConfig: tenant.storeConfig ?? null,
      trackingSettings: trackingSettings ?? {
        ga4MeasurementId: null,
        ga4Enabled: false,
        metaPixelId: null,
        metaEnabled: false,
        tiktokPixelId: null,
        tiktokEnabled: false,
        googleAdsConversionId: null,
        googleAdsEnabled: false,
      },
      whatsappNumber,
      createdAt: tenant.createdAt.toISOString(),
      products: productsWithCategory,
      totalProducts: products.length,
      totalOrders: orderStats.totalOrders,
      categories: categoryRows.map((category) => ({
        ...category,
        productCount: categoryProductCountMap.get(category.id) ?? 0,
      })),
    };

    await cache.set(cacheKey, JSON.stringify(responsePayload), 60);
    return res.json(responsePayload);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/store/:slug/customer-orders", async (req, res) => {
  const customerId = req.session.customerId;
  const sessionTenantId = req.session.customerTenantId;
  if (!customerId) return res.status(401).json({ error: "غير مسجل الدخول" });

  const slug = String(req.params.slug);

  try {
    const [tenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(and(eq(tenantsTable.slug, slug), eq(tenantsTable.status, "active")));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    if (sessionTenantId && sessionTenantId !== tenant.id) {
      return res.status(403).json({ error: "غير مصرح بالدخول لبيانات هذا المتجر" });
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.tenantId, tenant.id),
          eq(ordersTable.customerId, customerId)
        )
      )
      .orderBy(ordersTable.createdAt);

    return res.json(orders);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء استرجاع الطلبات" });
  }
});

export default router;
