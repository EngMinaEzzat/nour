import { db } from "@workspace/db";
import {
  productsTable,
  tenantsTable,
  categoriesTable,
  productVariantsTable,
  merchantsTable,
} from "@workspace/db";
import {
  eq,
  and,
  ilike,
  desc,
  count,
  isNull,
  or,
  exists,
  not,
} from "drizzle-orm";
import { getPlan, isAtLimit } from "../lib/entitlements";
import { recordAuditEvent } from "../lib/audit";
import type { Logger } from "pino";

export class ProductService {
  static formatProduct(p: Record<string, unknown>) {
    return {
      ...p,
      price: parseFloat(p.price as string),
      originalPrice: p.originalPrice
        ? parseFloat(p.originalPrice as string)
        : null,
      createdAt: (p.createdAt as Date).toISOString(),
    };
  }

  static normalizeImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((url): url is string => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  static parseVariantImageUrls(value: unknown): string[] {
    if (Array.isArray(value)) return this.normalizeImageUrls(value);
    if (typeof value !== "string" || !value.trim()) return [];
    try {
      return this.normalizeImageUrls(JSON.parse(value));
    } catch {
      return [];
    }
  }

  static formatVariant(v: Record<string, unknown>) {
    return {
      ...v,
      imageUrls: this.parseVariantImageUrls(v.imageUrls),
      createdAt: (v.createdAt as Date).toISOString(),
    };
  }

  static async resolveSessionTenantId(
    merchantTenantId?: number,
    sessionMerchantId?: number
  ): Promise<number | null> {
    if (merchantTenantId) return merchantTenantId;
    if (!sessionMerchantId) return null;

    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, sessionMerchantId));
    return merchant?.tenantId ?? null;
  }

  static async syncProductVariantSummary(productId: number, tenantId?: number) {
    const variants = await db
      .select({
        stock: productVariantsTable.stock,
        imageUrls: productVariantsTable.imageUrls,
      })
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId));

    const stock = variants.reduce(
      (total, variant) => total + (variant.stock ?? 0),
      0
    );
    const firstVariantImage = variants
      .flatMap((variant) => this.parseVariantImageUrls(variant.imageUrls))
      .find(Boolean);

    const updateData: { stock: number; imageUrl?: string } = { stock };
    if (firstVariantImage) updateData.imageUrl = firstVariantImage;

    const conditions = [eq(productsTable.id, productId)];
    if (tenantId !== undefined) conditions.push(eq(productsTable.tenantId, tenantId));

    await db
      .update(productsTable)
      .set(updateData)
      .where(and(...conditions));
  }

  static async fetchProductsWithJoin(conditions: ReturnType<typeof and>[]) {
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
          db
            .select({ id: productVariantsTable.id })
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
        ...this.formatProduct(rest as Record<string, unknown>),
        tenantId: row.tenantId,
        tenantWhatsapp,
        tenantStatus,
      };
    });
  }

  static async getFeaturedProducts() {
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
      .where(and(eq(productsTable.featured, true), eq(tenantsTable.status, "active")))
      .limit(12);
    return rows.map((r) => this.formatProduct(r as Record<string, unknown>));
  }

  static async getTrendingProducts() {
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
      .where(eq(tenantsTable.status, "active"))
      .orderBy(desc(productsTable.orderCount))
      .limit(12);
    return rows.map((r) => this.formatProduct(r as Record<string, unknown>));
  }

  static async listProducts(options: {
    effectiveTenantId: number;
    sessionTenantId: number | null;
    categoryId?: number;
    search?: string;
    hasVariants?: boolean;
  }) {
    const conditions = [eq(productsTable.tenantId, options.effectiveTenantId)];
    if (options.categoryId) conditions.push(eq(productsTable.categoryId, options.categoryId));
    if (options.search) conditions.push(ilike(productsTable.name, `%${options.search}%`));

    if (options.hasVariants === true) {
      conditions.push(
        exists(
          db
            .select({ id: productVariantsTable.id })
            .from(productVariantsTable)
            .where(eq(productVariantsTable.productId, productsTable.id))
        )
      );
    } else if (options.hasVariants === false) {
      conditions.push(
        not(
          exists(
            db
              .select({ id: productVariantsTable.id })
              .from(productVariantsTable)
              .where(eq(productVariantsTable.productId, productsTable.id))
          )
        )
      );
    }

    if (!options.sessionTenantId || options.sessionTenantId !== options.effectiveTenantId) {
      conditions.push(eq(tenantsTable.status, "active"));
    }

    const rows = await this.fetchProductsWithJoin(conditions as ReturnType<typeof and>[]);
    return rows.map((r: any) => {
      const { tenantStatus: _, ...safeRow } = r;
      return safeRow;
    });
  }

  static async createProduct(
    tenantId: number,
    data: any,
    sessionMerchantId?: number
  ) {
    const [tenant] = await db
      .select({
        planCode: tenantsTable.planCode,
        subscriptionStatus: tenantsTable.subscriptionStatus,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    if (!tenant) throw new Error("TENANT_NOT_FOUND");

    if (
      tenant.subscriptionStatus === "suspended" ||
      tenant.subscriptionStatus === "canceled"
    ) {
      throw new Error("ACCOUNT_SUSPENDED");
    }

    const plan = getPlan(tenant.planCode);

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(productsTable)
      .where(eq(productsTable.tenantId, tenantId));

    if (isAtLimit(productCount, plan.productLimit)) {
      throw new Error("PRODUCT_LIMIT_REACHED");
    }

    if (data.categoryId) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, data.categoryId),
            or(eq(categoriesTable.tenantId, tenantId), isNull(categoriesTable.tenantId))
          )
        );
      if (!cat) throw new Error("CATEGORY_INVALID");
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        ...data,
        tenantId,
        price: String(data.price),
        originalPrice: data.originalPrice ? String(data.originalPrice) : null,
      })
      .returning();

    const [row] = await this.fetchProductsWithJoin([
      eq(productsTable.id, product.id),
    ] as ReturnType<typeof and>[]);
    
    return row;
  }

  static async seedSampleProducts(tenantId: number, sessionMerchantId: number, log: Logger) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(
        or(eq(categoriesTable.tenantId, tenantId), isNull(categoriesTable.tenantId))
      );

    const findCategoryId = (nameAr: string) => {
      const cat = categories.find(
        (c) =>
          c.nameAr === nameAr ||
          c.name?.toLowerCase() === nameAr.toLowerCase()
      );
      return cat ? cat.id : null;
    };

    const sampleProducts = [
      {
        name: "معطف شتوي أنيق",
        description:
          "معطف شتوي طويل أنيق ومصنوع من أجود أنواع الصوف التركي الفاخر. يتميز بتصميم عصري يناسب الإطلالات الرسمية واليومية مع بطانة داخلية دافئة.",
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
        description:
          "فستان صيفي خفيف وأنيق بنقشة زهور مميزة. مصنوع من خامة قطنية ناعمة وباردة لتوفر لكِ أقصى درجات الراحة والأناقة في الأيام الحارة.",
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
        description:
          "حقيبة يد كلاسيكية مصنوعة من الجلد الطبيعي المقاوم للخدش. تحتوي على جيوب متعددة لتنظيم أغراضك اليومية بكل سهولة وأناقة.",
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
        description:
          "سيروم مغذي غني بفيتامين C وحمض الهيالورونيك لترطيب البشرة بعمق، توحيد لونها وإعادة النضارة والإشراق الطبيعي.",
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
        description:
          "مزيج عطري ساحر يجمع بين رقة زهور الياسمين الشرقي وفخامة المسك الأبيض. عطر ثابت ويدوم طويلاً ليعطيك جاذبية فريدة في كل مناسبة.",
        price: "950.00",
        originalPrice: "1200.00",
        imageUrl: "/images/categories/perfumes.png",
        stock: 12,
        featured: true,
        status: "active" as const,
        categoryNameAr: "عطور",
      },
    ];

    const valuesToInsert = sampleProducts.map((sp) => ({
      tenantId,
      categoryId: findCategoryId(sp.categoryNameAr),
      name: sp.name,
      description: sp.description,
      price: sp.price,
      originalPrice: sp.originalPrice,
      imageUrl: sp.imageUrl,
      stock: sp.stock,
      featured: sp.featured,
      status: sp.status,
      isSample: true,
    }));

    if (valuesToInsert.length > 0) {
      await db.insert(productsTable).values(valuesToInsert);
    }

    await recordAuditEvent({
      tenantId,
      actorId: sessionMerchantId,
      actorLabel: "merchant",
      eventType: "sample_products_seeded",
      summary: `Seeded 5 sample products`,
      metadata: {},
      log,
    });
  }

  static async clearSampleProducts(tenantId: number, sessionMerchantId: number, log: Logger) {
    await db
      .delete(productsTable)
      .where(and(eq(productsTable.tenantId, tenantId), eq(productsTable.isSample, true)));

    await recordAuditEvent({
      tenantId,
      actorId: sessionMerchantId,
      actorLabel: "merchant",
      eventType: "sample_products_cleared",
      summary: `Cleared sample products`,
      metadata: {},
      log,
    });
  }

  static async getProduct(productId: number, sessionTenantId: number | null) {
    const conditions: ReturnType<typeof and>[] = [
      eq(productsTable.id, productId),
    ];
    // If a tenant context is available, scope the query to that tenant for security
    if (sessionTenantId !== null) {
      conditions.push(
        or(eq(productsTable.tenantId, sessionTenantId), undefined) as any
      );
    }
    const [row] = await this.fetchProductsWithJoin(
      conditions as ReturnType<typeof and>[]
    );
    if (!row) throw new Error("PRODUCT_NOT_FOUND");

    const isPublicQuery = sessionTenantId !== row.tenantId;
    if (isPublicQuery && (row as any).tenantStatus !== "active") {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const { tenantStatus: _ts, ...safeRow } = row as any;
    return safeRow;
  }

  static async updateProduct(productId: number, tenantId: number, data: any) {
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!existing) throw new Error("PRODUCT_NOT_FOUND");
    if (existing.tenantId !== tenantId) throw new Error("FORBIDDEN");

    if (data.categoryId) {
      const [cat] = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(
          and(
            eq(categoriesTable.id, data.categoryId),
            or(eq(categoriesTable.tenantId, tenantId), isNull(categoriesTable.tenantId))
          )
        );
      if (!cat) throw new Error("CATEGORY_INVALID");
    }

    const updateData: Record<string, unknown> = { ...data };
    if (updateData.price) updateData.price = String(updateData.price);
    if (updateData.originalPrice) updateData.originalPrice = String(updateData.originalPrice);

    await db
      .update(productsTable)
      .set(updateData)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    
    const [row] = await this.fetchProductsWithJoin([
      eq(productsTable.id, productId),
    ] as ReturnType<typeof and>[]);
    return row;
  }

  static async deleteProduct(productId: number, tenantId: number, sessionMerchantId: number, log: Logger) {
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!existing) throw new Error("PRODUCT_NOT_FOUND");
    if (existing.tenantId !== tenantId) throw new Error("FORBIDDEN");

    await db.delete(productsTable).where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    await recordAuditEvent({
      tenantId,
      actorId: sessionMerchantId,
      actorLabel: "merchant",
      eventType: "product_deleted",
      summary: `Deleted product #${productId}`,
      metadata: { productId },
      log,
    });
  }

  /* ─── Product Variants ─── */
  static async getVariants(productId: number, sessionTenantId: number | null) {
    const productConditions = [eq(productsTable.id, productId)];
    if (sessionTenantId !== null) {
      productConditions.push(eq(productsTable.tenantId, sessionTenantId) as any);
    }
    const [product] = await db
      .select({
        tenantId: productsTable.tenantId,
        tenantStatus: tenantsTable.status,
      })
      .from(productsTable)
      .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
      .where(and(...productConditions));

    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    if (sessionTenantId !== product.tenantId && product.tenantStatus !== "active") {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, productId))
      .orderBy(productVariantsTable.createdAt);
    return variants.map((v) => this.formatVariant(v as Record<string, unknown>));
  }

  static async createVariant(productId: number, tenantId: number, data: any) {
    const [existing] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    if (!existing) throw new Error("PRODUCT_NOT_FOUND");

    const [variant] = await db
      .insert(productVariantsTable)
      .values({
        productId,
        size: data.size ?? null,
        color: data.color ?? null,
        colorHex: data.colorHex ?? null,
        imageUrls: JSON.stringify(this.normalizeImageUrls(data.imageUrls)),
        stock: data.stock,
      })
      .returning();
    await this.syncProductVariantSummary(productId);
    return this.formatVariant(variant as Record<string, unknown>);
  }

  static async updateVariant(productId: number, variantId: number, tenantId: number, data: any, sessionMerchantId: number, log: Logger) {
    const [existingProduct] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    if (!existingProduct) throw new Error("PRODUCT_NOT_FOUND");

    const [existingVariant] = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, variantId));

    if (!existingVariant) throw new Error("VARIANT_NOT_FOUND");

    const updateData: Record<string, unknown> = {};
    if (data.size !== undefined) updateData.size = data.size;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.colorHex !== undefined) updateData.colorHex = data.colorHex;
    if (data.imageUrls !== undefined) updateData.imageUrls = JSON.stringify(this.normalizeImageUrls(data.imageUrls));
    if (data.stock !== undefined) updateData.stock = data.stock;

    const [variant] = await db
      .update(productVariantsTable)
      .set(updateData)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)))
      .returning();
    if (!variant) throw new Error("VARIANT_NOT_FOUND");
    await this.syncProductVariantSummary(productId);

    if (data.stock !== undefined && existingVariant && existingVariant.stock !== data.stock) {
      await recordAuditEvent({
        tenantId,
        actorId: sessionMerchantId,
        actorLabel: "تاجر",
        eventType: "variant_stock_changed",
        summary: `تم تعديل مخزون المتغير #${variant.id} للمنتج #${productId}`,
        metadata: {
          variantId: variant.id,
          oldStock: existingVariant.stock,
          newStock: data.stock,
        },
        log,
      });
    }

    return this.formatVariant(variant as Record<string, unknown>);
  }

  static async deleteVariant(productId: number, variantId: number, tenantId: number) {
    const [existingProduct] = await db
      .select({ tenantId: productsTable.tenantId })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    if (!existingProduct) throw new Error("PRODUCT_NOT_FOUND");
    await db
      .delete(productVariantsTable)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)));
    await this.syncProductVariantSummary(productId);
  }
}
