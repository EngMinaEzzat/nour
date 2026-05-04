import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, productsTable, ordersTable, categoriesTable, productVariantsTable } from "@workspace/db";
import { eq, count, inArray, ilike, and } from "drizzle-orm";
import { storefrontLimiter } from "../lib/rate-limiters";

const router = Router();

router.get("/store/:slug", storefrontLimiter, async (req, res) => {
  const { slug } = req.params;
  const searchQ = (req.query.search as string | undefined)?.trim() ?? null;
  const categoryIdQ = req.query.categoryId ? Number(req.query.categoryId) : null;

  try {
    const [tenant] = await db
      .select()
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    // Build product conditions — always scope to tenant, optionally filter by name/category
    const conditions = [eq(productsTable.tenantId, tenant.id)];
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

    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))] as number[];
    let categoryRows: { id: number; name: string }[] = [];
    if (categoryIds.length > 0) {
      categoryRows = await db
        .select({ id: categoriesTable.id, name: categoriesTable.name })
        .from(categoriesTable)
        .where(inArray(categoriesTable.id, categoryIds));
    }

    const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name]));

    // Parse WhatsApp number from tenant socialLinks
    let whatsappNumber: string | null = null;
    try {
      const sl = tenant.socialLinks ? JSON.parse(tenant.socialLinks) : {};
      whatsappNumber = sl.whatsapp || null;
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
      faviconUrl: tenant.faviconUrl ?? null,
      seoTitle: tenant.seoTitle ?? null,
      seoDescription: tenant.seoDescription ?? null,
      whatsappNumber,
      createdAt: tenant.createdAt.toISOString(),
      products: productsWithCategory,
      totalProducts: products.length,
      totalOrders: orderStats.totalOrders,
      categories: categoryRows,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
