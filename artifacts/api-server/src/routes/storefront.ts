import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, productsTable, ordersTable, categoriesTable, productVariantsTable, trackingSettingsTable } from "@workspace/db";
import { eq, count, inArray, ilike, and, or, isNull } from "drizzle-orm";
import { storefrontLimiter } from "../lib/rate-limiters";

const router = Router();

router.get("/store/:slug", storefrontLimiter, async (req, res) => {
  const slug = String(req.params.slug);
  const searchQ = (req.query.search as string | undefined)?.trim() ?? null;
  const categoryIdQ = req.query.categoryId ? Number(req.query.categoryId) : null;

  try {
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(and(eq(tenantsTable.slug, slug), eq(tenantsTable.status, "active")));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    // Build product conditions — always scope to tenant, optionally filter by name/category
    const conditions = [eq(productsTable.tenantId, tenant.id), eq(productsTable.status, "active")];
    if (searchQ) conditions.push(ilike(productsTable.name, `%${searchQ}%`));
    if (categoryIdQ) conditions.push(eq(productsTable.categoryId, categoryIdQ));

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
      .where(and(...conditions))
      .orderBy(productsTable.createdAt);

    const productIds = products.map((p) => p.id);

    // Count variants per product to determine which products require variant selection
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
    const variantCountMap = new Map(variantCounts.map((v) => [v.productId, v.count]));

    const categoryRows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        nameAr: categoriesTable.nameAr,
        type: categoriesTable.type,
        imageUrl: categoriesTable.imageUrl,
      })
      .from(categoriesTable)
      .where(or(eq(categoriesTable.tenantId, tenant.id), isNull(categoriesTable.tenantId)))
      .orderBy(categoriesTable.name);
    const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));
    const categoryProductCounts = await Promise.all(
      categoryRows.map(async (category) => {
        const [{ total }] = await db
          .select({ total: count() })
          .from(productsTable)
          .where(and(
            eq(productsTable.tenantId, tenant.id),
            eq(productsTable.status, "active"),
            eq(productsTable.categoryId, category.id),
          ));
        return { categoryId: category.id, total };
      }),
    );
    const categoryProductCountMap = new Map(categoryProductCounts.map((row) => [row.categoryId, row.total]));

    // Parse WhatsApp number from tenant socialLinks
    let whatsappNumber: string | null = null;
    let socialLinks: Record<string, string> = {};
    try {
      socialLinks = tenant.socialLinks ? JSON.parse(tenant.socialLinks) : {};
      whatsappNumber = socialLinks.whatsapp || null;
    } catch {}

    const productsWithCategory = products.map((p) => ({
      ...p,
      price: parseFloat(String(p.price)),
      originalPrice: p.originalPrice ? parseFloat(String(p.originalPrice)) : null,
      categoryName: p.categoryId ? (categoryMap.get(p.categoryId) ?? null) : null,
      hasVariants: (variantCountMap.get(p.id) ?? 0) > 0,
      variantCount: variantCountMap.get(p.id) ?? 0,
    }));

    const [orderStats] = await db
      .select({ totalOrders: count() })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenant.id));

    const [trackingSettings] = await db
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
      .where(eq(trackingSettingsTable.tenantId, tenant.id));

    return res.json({
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
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
