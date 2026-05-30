import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  tenantsTable,
  categoriesTable,
  productVariantsTable,
  merchantsTable,
} from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";
import { eq, and, ilike, desc, count, isNull, or, exists, not } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";
import { getPlan, isAtLimit } from "../lib/entitlements";
import { cache } from "../lib/cache.js";
import { recordAuditEvent } from "../lib/audit.js";

const router = Router();

function formatProduct(p: Record<string, unknown>) {
  return {
    ...p,
    price: parseFloat(p.price as string),
    originalPrice: p.originalPrice
      ? parseFloat(p.originalPrice as string)
      : null,
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

async function resolveSessionTenantId(req: { merchantTenantId?: number; session?: { merchantId?: number } }): Promise<number | null> {
  if (req.merchantTenantId) return req.merchantTenantId;
  if (!req.session?.merchantId) return null;

  const [merchant] = await db
    .select({ tenantId: merchantsTable.tenantId })
    .from(merchantsTable)
    .where(eq(merchantsTable.id, req.session.merchantId));
  return merchant?.tenantId ?? null;
}

async function syncProductVariantSummary(productId: number) {
  const variants = await db
    .select({
      stock: productVariantsTable.stock,
      imageUrls: productVariantsTable.imageUrls,
    })
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId));

  const stock = variants.reduce(
    (total, variant) => total + (variant.stock ?? 0),
    0,
  );
  const firstVariantImage = variants
    .flatMap((variant) => parseVariantImageUrls(variant.imageUrls))
    .find(Boolean);

  const updateData: { stock: number; imageUrl?: string } = { stock };
  if (firstVariantImage) updateData.imageUrl = firstVariantImage;

  await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, productId));
}

async function fetchProductsWithJoin(conditions: ReturnType<typeof and>[]) {
  const rows = await db
    .select({
      id: productsTable.id,
      tenantId: productsTable.tenantId,
      tenantName: tenantsTable.name,
      tenantSlug: tenantsTable.slug,
      tenantSocialLinks: tenantsTable.socialLinks,
      tenantStatus: tenantsTable.status,
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
      isSample: productsTable.isSample,
      hasVariants: exists(
        db.select({ id: productVariantsTable.id })
          .from(productVariantsTable)
          .where(eq(productVariantsTable.productId, productsTable.id))
      ),
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
    const { tenantSocialLinks: _, tenantStatus, ...rest } = row;
    return {
      ...formatProduct(rest as Record<string, unknown>),
      tenantId: row.tenantId,
      tenantWhatsapp,
      tenantStatus,
    };
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
      .leftJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(
        and(
          eq(productsTable.featured, true),
          eq(tenantsTable.status, "active")
        )
      )
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
      .leftJoin(
        categoriesTable,
        eq(productsTable.categoryId, categoriesTable.id),
      )
      .where(eq(tenantsTable.status, "active"))
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
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });
  const { tenantId: queryTenantId, categoryId, search } = parsed.data;
  
  // Safe parsing for boolean query param which might be coerced to true for "false" string
  let hasVariants: boolean | undefined;
  if (req.query.hasVariants === "true") hasVariants = true;
  else if (req.query.hasVariants === "false") hasVariants = false;
  else hasVariants = parsed.data.hasVariants;

  // Tenant isolation: if the request comes from an authenticated merchant session,
  // always scope to their own tenant — ignore any tenantId passed in query params.
  // Note: merchantTenantId is only set by requireRole() middleware, so we must
  // also resolve it from the session directly for this public-ish route.
  const sessionTenantId = await resolveSessionTenantId(req);
  const effectiveTenantId = sessionTenantId ?? queryTenantId;

  // Require tenant context — never return unscoped product data
  if (!effectiveTenantId) {
    return res.status(400).json({ error: "tenantId مطلوب" });
  }

  const conditions = [eq(productsTable.tenantId, effectiveTenantId)];
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

  if (hasVariants === true) {
    conditions.push(exists(
      db.select({ id: productVariantsTable.id })
        .from(productVariantsTable)
        .where(eq(productVariantsTable.productId, productsTable.id))
    ));
  } else if (hasVariants === false) {
    conditions.push(not(exists(
      db.select({ id: productVariantsTable.id })
        .from(productVariantsTable)
        .where(eq(productVariantsTable.productId, productsTable.id))
    )));
  }

  if (!sessionTenantId || sessionTenantId !== effectiveTenantId) {
    conditions.push(eq(tenantsTable.status, "active"));
  }

  try {
    const cacheKey = `tenant:${effectiveTenantId}:products:cat=${categoryId || 'all'}:search=${search || 'none'}:variants=${hasVariants ?? 'any'}`;
    
    // Only cache active tenant products for public consumers
    const canCache = !sessionTenantId || sessionTenantId !== effectiveTenantId;
    if (canCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const rows = await fetchProductsWithJoin(
      conditions as ReturnType<typeof and>[],
    );
    // Strip tenantStatus from the response
    const result = rows.map((r: any) => {
      const { tenantStatus: _, ...safeRow } = r;
      return safeRow;
    });

    if (canCache) {
      await cache.set(cacheKey, JSON.stringify(result), 300); // 5 minutes TTL
    }

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات" });
  }
});

/* ─── Mutations — require authenticated session ─── */
router.post(
  "/products",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });

    if (parsed.data.price < 0) {
      return res.status(400).json({ error: "لا يمكن أن يكون السعر سالباً" });
    }
    if (parsed.data.stock < 0) {
      return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
    }

    const sessionTenantId = req.merchantTenantId!;
    try {
      const [tenant] = await db
        .select({
          planCode: tenantsTable.planCode,
          subscriptionStatus: tenantsTable.subscriptionStatus,
        })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, sessionTenantId));

      if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

      if (
        tenant.subscriptionStatus === "suspended" ||
        tenant.subscriptionStatus === "canceled"
      ) {
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
              or(
                eq(categoriesTable.tenantId, sessionTenantId),
                isNull(categoriesTable.tenantId),
              ),
            ),
          );
        if (!cat) {
          return res
            .status(400)
            .json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
        }
      }

      const [product] = await db
        .insert(productsTable)
        .values({
          ...parsed.data,
          tenantId: sessionTenantId,
          price: String(parsed.data.price),
          originalPrice: parsed.data.originalPrice
            ? String(parsed.data.originalPrice)
            : null,
        })
        .returning();
      const [row] = await fetchProductsWithJoin([
        eq(productsTable.id, product.id),
      ] as ReturnType<typeof and>[]);
      await cache.invalidateTenant(sessionTenantId);
      res.status(201).json(row);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل إنشاء المنتج" });
    }
  },
);

router.post(
  "/products/seed-samples",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const sessionTenantId = req.merchantTenantId!;
    try {
      const categories = await db
        .select()
        .from(categoriesTable)
        .where(
          or(
            eq(categoriesTable.tenantId, sessionTenantId),
            isNull(categoriesTable.tenantId)
          )
        );

      const findCategoryId = (nameAr: string) => {
        const cat = categories.find(
          c => c.nameAr === nameAr || c.name?.toLowerCase() === nameAr.toLowerCase()
        );
        return cat ? cat.id : null;
      };

      const sampleProducts = [
        {
          name: "معطف شتوي أنيق",
          description: "معطف شتوي طويل أنيق ومصنوع من أجود أنواع الصوف التركي الفاخر. يتميز بتصميم عصري يناسب الإطلالات الرسمية واليومية مع بطانة داخلية دافئة.",
          price: "1450.00",
          originalPrice: "1850.00",
          imageUrl: "/product-fashion-optimized.jpg",
          stock: 15,
          featured: true,
          status: "active" as const,
          categoryNameAr: "ملابس",
        },
        {
          name: "فستان صيفي زهري",
          description: "فستان صيفي خفيف وأنيق بنقشة زهور مميزة. مصنوع من خامة قطنية ناعمة وباردة لتوفر لكِ أقصى درجات الراحة والأناقة في الأيام الحارة.",
          price: "850.00",
          originalPrice: "1100.00",
          imageUrl: "/images/categories/fashion.png",
          stock: 22,
          featured: false,
          status: "active" as const,
          categoryNameAr: "ملابس",
        },
        {
          name: "حقيبة يد جلدية فاخرة",
          description: "حقيبة يد كلاسيكية مصنوعة من الجلد الطبيعي المقاوم للخدش. تحتوي على جيوب متعددة لتنظيم أغراضك اليومية بكل سهولة وأناقة.",
          price: "720.00",
          originalPrice: "950.00",
          imageUrl: "/images/categories/accessories.png",
          stock: 8,
          featured: true,
          status: "active" as const,
          categoryNameAr: "إكسسوارات",
        },
        {
          name: "سيروم العناية بالبشرة الطبيعي",
          description: "سيروم مغذي غني بفيتامين C وحمض الهيالورونيك لترطيب البشرة بعمق، توحيد لونها وإعادة النضارة والإشراق الطبيعي.",
          price: "380.00",
          originalPrice: "500.00",
          imageUrl: "/images/categories/care.png",
          stock: 45,
          featured: false,
          status: "active" as const,
          categoryNameAr: "مستحضرات تجميل",
        },
        {
          name: "عطر الياسمين والمسك",
          description: "مزيج عطري ساحر يجمع بين رقة زهور الياسمين الشرقي وفخامة المسك الأبيض. عطر ثابت ويدوم طويلاً ليعطيك جاذبية فريدة في كل مناسبة.",
          price: "950.00",
          originalPrice: "1200.00",
          imageUrl: "/images/categories/perfumes.png",
          stock: 12,
          featured: true,
          status: "active" as const,
          categoryNameAr: "عطور",
        },
      ];

      for (const sp of sampleProducts) {
        const categoryId = findCategoryId(sp.categoryNameAr);
        await db.insert(productsTable).values({
          tenantId: sessionTenantId,
          categoryId,
          name: sp.name,
          description: sp.description,
          price: sp.price,
          originalPrice: sp.originalPrice,
          imageUrl: sp.imageUrl,
          stock: sp.stock,
          featured: sp.featured,
          status: sp.status,
          isSample: true,
        });
      }

      await recordAuditEvent({
        tenantId: sessionTenantId,
        actorId: req.session.merchantId,
        actorLabel: "merchant",
        eventType: "sample_products_seeded",
        summary: `Seeded 5 sample products`,
        metadata: {},
        log: req.log,
      });

      await cache.invalidateTenant(sessionTenantId);
      res.status(201).json({ success: true });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل إضافة المنتجات التجريبية" });
    }
  }
);

router.delete(
  "/products/clear-samples",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const sessionTenantId = req.merchantTenantId!;
    try {
      await db
        .delete(productsTable)
        .where(
          and(
            eq(productsTable.tenantId, sessionTenantId),
            eq(productsTable.isSample, true)
          )
        );

      await recordAuditEvent({
        tenantId: sessionTenantId,
        actorId: req.session.merchantId,
        actorLabel: "merchant",
        eventType: "sample_products_cleared",
        summary: `Cleared sample products`,
        metadata: {},
        log: req.log,
      });

      await cache.invalidateTenant(sessionTenantId);
      res.status(204).send();
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل حذف المنتجات التجريبية" });
    }
  }
);

router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success)
    return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const sessionTenantId = await resolveSessionTenantId(req);
    const [row] = await fetchProductsWithJoin([
      eq(productsTable.id, parsed.data.id),
    ] as ReturnType<typeof and>[]);
    if (!row) return res.status(404).json({ error: "المنتج غير موجود" });

    // Security check: if the product belongs to another tenant, hide it if the tenant is suspended.
    // If it belongs to the current logged-in merchant, they should see it regardless of status.
    const isPublicQuery = sessionTenantId !== row.tenantId;
    if (isPublicQuery && (row as any).tenantStatus !== "active") {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    // Strip tenantStatus from the response to match the original API shape
    const { tenantStatus: _ts, ...safeRow } = row as any;
    res.json(safeRow);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتج" });
  }
});

router.put(
  "/products/:id",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const paramsParsed = UpdateProductParams.safeParse({
      id: Number(req.params.id),
    });
    if (!paramsParsed.success)
      return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
    const bodyParsed = UpdateProductBody.safeParse(req.body);
    if (!bodyParsed.success)
      return res.status(400).json({ error: bodyParsed.error.flatten() });

    try {
      const [existing] = await db
        .select({ tenantId: productsTable.tenantId })
        .from(productsTable)
        .where(eq(productsTable.id, paramsParsed.data.id));
      if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
      if (existing.tenantId !== req.merchantTenantId) {
        return res
          .status(403)
          .json({ error: "لا يمكنك تعديل منتجات متجر آخر" });
      }

      // Category ownership: ensure the categoryId belongs to this tenant or is global
      if (bodyParsed.data.categoryId) {
        const [cat] = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(
            and(
              eq(categoriesTable.id, bodyParsed.data.categoryId),
              or(
                eq(categoriesTable.tenantId, req.merchantTenantId!),
                isNull(categoriesTable.tenantId),
              ),
            ),
          );
        if (!cat) {
          return res
            .status(400)
            .json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
        }
      }

      const updateData: Record<string, unknown> = { ...bodyParsed.data };
      if (updateData.price) updateData.price = String(updateData.price);
      if (updateData.originalPrice)
        updateData.originalPrice = String(updateData.originalPrice);

      await db
        .update(productsTable)
        .set(updateData)
        .where(eq(productsTable.id, paramsParsed.data.id));
      await cache.invalidateTenant(req.merchantTenantId!);
      const [row] = await fetchProductsWithJoin([
        eq(productsTable.id, paramsParsed.data.id),
      ] as ReturnType<typeof and>[]);
      if (!row) return res.status(404).json({ error: "المنتج غير موجود" });
      res.json(row);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل تحديث المنتج" });
    }
  },
);

router.delete(
  "/products/:id",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success)
      return res.status(400).json({ error: "معرّف المنتج غير صحيح" });

    try {
      const [existing] = await db
        .select({ tenantId: productsTable.tenantId })
        .from(productsTable)
        .where(eq(productsTable.id, parsed.data.id));
      if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
      if (existing.tenantId !== req.merchantTenantId) {
        return res.status(403).json({ error: "لا يمكنك حذف منتجات متجر آخر" });
      }

      await db
        .delete(productsTable)
        .where(eq(productsTable.id, parsed.data.id));
      await recordAuditEvent({
        tenantId: req.merchantTenantId!,
        actorId: req.session.merchantId,
        actorLabel: "merchant",
        eventType: "product_deleted",
        summary: `Deleted product #${parsed.data.id}`,
        metadata: { productId: parsed.data.id },
        log: req.log,
      });
      await cache.invalidateTenant(req.merchantTenantId!);
      res.status(204).send();
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل حذف المنتج" });
    }
  },
);

/* ─── Product Variants ─── */

router.get("/products/:id/variants", async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId))
    return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const sessionTenantId = await resolveSessionTenantId(req);
    const [product] = await db
      .select({
        tenantId: productsTable.tenantId,
        tenantStatus: tenantsTable.status,
      })
      .from(productsTable)
      .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
      .where(eq(productsTable.id, productId));

    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });
    if (sessionTenantId !== product.tenantId && product.tenantStatus !== "active") {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId))
      .orderBy(productVariantsTable.createdAt);
    res.json(
      variants.map((variant) =>
        formatVariant(variant as Record<string, unknown>),
      ),
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب متغيرات المنتج" });
  }
});

router.post(
  "/products/:id/variants",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const productId = Number(req.params.id);
    if (isNaN(productId))
      return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
    const { size, color, colorHex, imageUrls, stock } = req.body as {
      size?: string;
      color?: string;
      colorHex?: string;
      imageUrls?: unknown;
      stock?: number;
    };
    if (stock === undefined || stock === null)
      return res.status(400).json({ error: "stock مطلوب" });
    if (typeof stock !== "number" || stock < 0)
      return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
    try {
      // Tenant ownership check — must own the parent product
      const [existing] = await db
        .select({ tenantId: productsTable.tenantId })
        .from(productsTable)
        .where(eq(productsTable.id, productId));
      if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });
      if (existing.tenantId !== req.merchantTenantId) {
        return res
          .status(403)
          .json({ error: "لا يمكنك إضافة متغيرات لمنتج متجر آخر" });
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
      await cache.invalidateTenant(req.merchantTenantId!);

      res.status(201).json(formatVariant(variant as Record<string, unknown>));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل إنشاء المتغير" });
    }
  },
);

router.put(
  "/products/:id/variants/:variantId",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const productId = Number(req.params.id);
    const variantId = Number(req.params.variantId);
    if (isNaN(productId) || isNaN(variantId))
      return res.status(400).json({ error: "معرّف غير صحيح" });
    const { size, color, colorHex, imageUrls, stock } = req.body as {
      size?: string | null;
      color?: string | null;
      colorHex?: string | null;
      imageUrls?: unknown;
      stock?: number;
    };
    try {
      // Tenant ownership check
      const [existingProduct] = await db
        .select({ tenantId: productsTable.tenantId })
        .from(productsTable)
        .where(eq(productsTable.id, productId));
      if (!existingProduct)
        return res.status(404).json({ error: "المنتج غير موجود" });
      if (existingProduct.tenantId !== req.merchantTenantId) {
        return res
          .status(403)
          .json({ error: "لا يمكنك تعديل متغيرات منتج متجر آخر" });
      }

      const [existingVariant] = await db
        .select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, variantId));

      if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
        return res
          .status(400)
          .json({ error: "لا يمكن أن يكون المخزون سالباً" });
      }
      const updateData: Record<string, unknown> = {};
      if (size !== undefined) updateData.size = size;
      if (color !== undefined) updateData.color = color;
      if (colorHex !== undefined) updateData.colorHex = colorHex;
      if (imageUrls !== undefined)
        updateData.imageUrls = JSON.stringify(normalizeImageUrls(imageUrls));
      if (stock !== undefined) updateData.stock = stock;
      const [variant] = await db
        .update(productVariantsTable)
        .set(updateData)
        .where(
          and(
            eq(productVariantsTable.id, variantId),
            eq(productVariantsTable.productId, productId),
          ),
        )
        .returning();
      if (!variant) return res.status(404).json({ error: "المتغير غير موجود" });
      await syncProductVariantSummary(productId);

      if (
        stock !== undefined &&
        existingVariant &&
        existingVariant.stock !== stock
      ) {
        await recordAuditEvent({
          tenantId: req.merchantTenantId!,
          actorId: req.session.merchantId,
          actorLabel: "تاجر",
          eventType: "variant_stock_changed",
          summary: `تم تعديل مخزون المتغير #${variant.id} للمنتج #${productId}`,
          metadata: {
            variantId: variant.id,
            oldStock: existingVariant.stock,
            newStock: stock,
          },
          log: req.log,
        });
      }

      await cache.invalidateTenant(req.merchantTenantId!);
      res.json(formatVariant(variant as Record<string, unknown>));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل تحديث المتغير" });
    }
  },
);

router.delete(
  "/products/:id/variants/:variantId",
  requireRole("owner", "manager", "staff"),
  async (req, res) => {
    const productId = Number(req.params.id);
    const variantId = Number(req.params.variantId);
    if (isNaN(productId) || isNaN(variantId))
      return res.status(400).json({ error: "معرّف غير صحيح" });
    try {
      // Tenant ownership check
      const [existingProduct] = await db
        .select({ tenantId: productsTable.tenantId })
        .from(productsTable)
        .where(eq(productsTable.id, productId));
      if (!existingProduct)
        return res.status(404).json({ error: "المنتج غير موجود" });
      if (existingProduct.tenantId !== req.merchantTenantId) {
        return res
          .status(403)
          .json({ error: "لا يمكنك حذف متغيرات منتج متجر آخر" });
      }
      await db
        .delete(productVariantsTable)
        .where(
          and(
            eq(productVariantsTable.id, variantId),
            eq(productVariantsTable.productId, productId),
          ),
        );
      await syncProductVariantSummary(productId);
      await cache.invalidateTenant(req.merchantTenantId!);
      res.status(204).send();
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "فشل حذف المتغير" });
    }
  },
);

export default router;
