import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, tenantsTable, categoriesTable, productVariantsTable, merchantsTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";
import { eq, and, ilike, desc, count, isNull, or } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { getPlan, isAtLimit } from "../lib/entitlements";

const router = Router();

function formatProduct(p: Record<string, unknown>) {
  return {
    ...p,
    price: parseFloat(p.price as string),
    originalPrice: p.originalPrice ? parseFloat(p.originalPrice as string) : null,
    createdAt: (p.createdAt as Date).toISOString(),
  };
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === "string")
    .map((url) => url.trim())
    .filter(Boolean);
}

function parseVariantImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) return normalizeImageUrls(value);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    return normalizeImageUrls(JSON.parse(value));
  } catch {
    return [];
  }
}

function formatVariant(v: Record<string, unknown>) {
  return {
    ...v,
    imageUrls: parseVariantImageUrls(v.imageUrls),
    createdAt: (v.createdAt as Date).toISOString(),
  };
}

async function syncProductVariantSummary(productId: number) {
  const variants = await db
    .select({
      stock: productVariantsTable.stock,
      imageUrls: productVariantsTable.imageUrls,
    })
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId));

  const stock = variants.reduce((total, variant) => total + (variant.stock ?? 0), 0);
  const firstVariantImage = variants
    .flatMap((variant) => parseVariantImageUrls(variant.imageUrls))
    .find(Boolean);

  const updateData: { stock: number; imageUrl?: string } = { stock };
  if (firstVariantImage) updateData.imageUrl = firstVariantImage;

  await db.update(productsTable).set(updateData).where(eq(productsTable.id, productId));
}

async function fetchProductsWithJoin(conditions: ReturnType<typeof and>[]) {
  const rows = await db
    .select({
      id: productsTable.id,
      tenantId: productsTable.tenantId,
      tenantName: tenantsTable.name,
      tenantSlug: tenantsTable.slug,
      tenantSocialLinks: tenantsTable.socialLinks,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      originalPrice: productsTable.originalPrice,
      imageUrl: productsTable.imageUrl,
      stock: productsTable.stock,
      featured: productsTable.featured,
      status: productsTable.status,
      orderCount: productsTable.orderCount,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.createdAt));
  return rows.map((row) => {
    let tenantWhatsapp: string | null = null;
    try {
      const sl = row.tenantSocialLinks ? JSON.parse(row.tenantSocialLinks) : {};
      tenantWhatsapp = sl.whatsapp || null;
    } catch {}
    const { tenantSocialLinks: _, ...rest } = row;
    return { ...formatProduct(rest as Record<string, unknown>), tenantWhatsapp };
  });
}

router.get("/products/featured", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: productsTable.id,
        tenantId: productsTable.tenantId,
        tenantName: tenantsTable.name,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        originalPrice: productsTable.originalPrice,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        featured: productsTable.featured,
        status: productsTable.status,
        orderCount: productsTable.orderCount,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(productsTable.featured, true))
      .limit(12);
    res.json(rows.map(formatProduct));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات المميزة" });
  }
});

router.get("/products/trending", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: productsTable.id,
        tenantId: productsTable.tenantId,
        tenantName: tenantsTable.name,
        categoryId: productsTable.categoryId,
        categoryName: categoriesTable.name,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        originalPrice: productsTable.originalPrice,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        featured: productsTable.featured,
        status: productsTable.status,
        orderCount: productsTable.orderCount,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .orderBy(desc(productsTable.orderCount))
      .limit(12);
    res.json(rows.map(formatProduct));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات الأكثر طلباً" });
  }
});

router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { tenantId: queryTenantId, categoryId, search } = parsed.data;

  // Tenant isolation: if the request comes from an authenticated merchant session,
  // always scope to their own tenant — ignore any tenantId passed in query params.
  // Note: merchantTenantId is only set by requireRole() middleware, so we must
  // also resolve it from the session directly for this public-ish route.
  let sessionTenantId = req.merchantTenantId ?? null;
  if (!sessionTenantId && req.session?.merchantId) {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, req.session.merchantId));
    sessionTenantId = merchant?.tenantId ?? null;
  }
  const effectiveTenantId = sessionTenantId ?? queryTenantId;

  // Require tenant context — never return unscoped product data
  if (!effectiveTenantId) {
    return res.status(400).json({ error: "tenantId مطلوب" });
  }

  const conditions = [eq(productsTable.tenantId, effectiveTenantId)];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  try {
    const rows = await fetchProductsWithJoin(conditions as ReturnType<typeof and>[]);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات" });
  }
});

/* ─── Mutations — require authenticated session ─── */
router.post("/products", requireRole("owner", "manager", "staff"), async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.price < 0) {
    return res.status(400).json({ error: "لا يمكن أن يكون السعر سالباً" });
  }
  if (parsed.data.stock < 0) {
    return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
  }

  const sessionTenantId = req.merchantTenantId!;
  try {
    const [tenant] = await db
      .select({ planCode: tenantsTable.planCode, subscriptionStatus: tenantsTable.subscriptionStatus })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, sessionTenantId));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    if (tenant.subscriptionStatus === "suspended" || tenant.subscriptionStatus === "canceled") {
      return res.status(402).json({
        error: "حسابك موقوف — تواصل مع الدعم لإعادة تفعيل متجرك",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    const plan = getPlan(tenant.planCode);

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(productsTable)
      .where(eq(productsTable.tenantId, sessionTenantId));

    if (isAtLimit(productCount, plan.productLimit)) {
      return res.status(402).json({
        error: `وصلت إلى الحد الأقصى للمنتجات في خطة ${plan.nameAr} (${plan.productLimit} منتج) — يرجى الترقية للاستمرار`,
        code: "PRODUCT_LIMIT_REACHED",
        currentPlan: plan.code,
        limit: plan.productLimit,
        usage: productCount,
      });
    }

    // Category ownership: ensure the categoryId belongs to this tenant or is global
    if (parsed.data.categoryId) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, parsed.data.categoryId),
            or(eq(categoriesTable.tenantId, sessionTenantId), isNull(categoriesTable.tenantId)),
          ),
        );
      if (!cat) {
        return res.status(400).json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
      }
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        ...parsed.data,
        tenantId: sessionTenantId,
        price: String(parsed.data.price),
        originalPrice: parsed.data.originalPrice ? String(parsed.data.originalPrice) : null,
      })
      .returning();
    const [row] = await fetchProductsWithJoin([eq(productsTable.id, product.id)] as ReturnType<typeof and>[]);
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء المنتج" });
  }
});

router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const [row] = await fetchProductsWithJoin([eq(productsTable.id, parsed.data.id)] as ReturnType<typeof and>[]);
    if (!row) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتج" });
  }
});

router.put("/products/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const paramsParsed = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  const bodyParsed = UpdateProductBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: bodyParsed.error.flatten() });

  try {
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, paramsParsed.data.id));
    if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
    if (existing.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك تعديل منتجات متجر آخر" });
    }

    // Category ownership: ensure the categoryId belongs to this tenant or is global
    if (bodyParsed.data.categoryId) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, bodyParsed.data.categoryId),
            or(eq(categoriesTable.tenantId, req.merchantTenantId!), isNull(categoriesTable.tenantId)),
          ),
        );
      if (!cat) {
        return res.status(400).json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
      }
    }

    const updateData: Record<string, unknown> = { ...bodyParsed.data };
    if (updateData.price) updateData.price = String(updateData.price);
    if (updateData.originalPrice) updateData.originalPrice = String(updateData.originalPrice);

    await db.update(productsTable).set(updateData).where(eq(productsTable.id, paramsParsed.data.id));
    const [row] = await fetchProductsWithJoin([eq(productsTable.id, paramsParsed.data.id)] as ReturnType<typeof and>[]);
    if (!row) return res.status(404).json({ error: "المنتج غير موجود" });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث المنتج" });
  }
});

router.delete("/products/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });

  try {
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, parsed.data.id));
    if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
    if (existing.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك حذف منتجات متجر آخر" });
    }

    await db.delete(productsTable).where(eq(productsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المنتج" });
  }
});

/* ─── Product Variants ─── */

router.get("/products/:id/variants", async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId))
      .orderBy(productVariantsTable.createdAt);
    res.json(variants.map((variant) => formatVariant(variant as Record<string, unknown>)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب متغيرات المنتج" });
  }
});

router.post("/products/:id/variants", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  const { size, color, colorHex, imageUrls, stock } = req.body as {
    size?: string; color?: string; colorHex?: string; imageUrls?: unknown; stock?: number;
  };
  if (stock === undefined || stock === null) return res.status(400).json({ error: "stock مطلوب" });
  if (typeof stock !== "number" || stock < 0) return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
  try {
    // Tenant ownership check — must own the parent product
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
    if (existing.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك إضافة متغيرات لمنتج متجر آخر" });
    }
    const [variant] = await db
      .insert(productVariantsTable)
      .values({
        productId,
        size: size ?? null,
        color: color ?? null,
        colorHex: colorHex ?? null,
        imageUrls: JSON.stringify(normalizeImageUrls(imageUrls)),
        stock,
      })
      .returning();
    await syncProductVariantSummary(productId);
    res.status(201).json(formatVariant(variant as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء المتغير" });
  }
});

router.put("/products/:id/variants/:variantId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  if (isNaN(productId) || isNaN(variantId)) return res.status(400).json({ error: "معرّف غير صحيح" });
  const { size, color, colorHex, imageUrls, stock } = req.body as {
    size?: string | null; color?: string | null; colorHex?: string | null; imageUrls?: unknown; stock?: number;
  };
  try {
    // Tenant ownership check
    const [existingProduct] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!existingProduct) return res.status(404).json({ error: "المنتج غير موجود" });
    if (existingProduct.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك تعديل متغيرات منتج متجر آخر" });
    }
    if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
      return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
    }
    const updateData: Record<string, unknown> = {};
    if (size !== undefined) updateData.size = size;
    if (color !== undefined) updateData.color = color;
    if (colorHex !== undefined) updateData.colorHex = colorHex;
    if (imageUrls !== undefined) updateData.imageUrls = JSON.stringify(normalizeImageUrls(imageUrls));
    if (stock !== undefined) updateData.stock = stock;
    const [variant] = await db
      .update(productVariantsTable)
      .set(updateData)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)))
      .returning();
    if (!variant) return res.status(404).json({ error: "المتغير غير موجود" });
    await syncProductVariantSummary(productId);
    res.json(formatVariant(variant as Record<string, unknown>));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث المتغير" });
  }
});

router.delete("/products/:id/variants/:variantId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  if (isNaN(productId) || isNaN(variantId)) return res.status(400).json({ error: "معرّف غير صحيح" });
  try {
    // Tenant ownership check
    const [existingProduct] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!existingProduct) return res.status(404).json({ error: "المنتج غير موجود" });
    if (existingProduct.tenantId !== req.merchantTenantId) {
      return res.status(403).json({ error: "لا يمكنك حذف متغيرات منتج متجر آخر" });
    }
    await db
      .delete(productVariantsTable)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)));
    await syncProductVariantSummary(productId);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المتغير" });
  }
});

export default router;
