import { Router } from "express";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";
import { requireRole } from "../middleware/require-role";
import { cache } from "../lib/cache.js";
import { ProductService } from "../services/ProductService";
import { resolveStorefrontTenantId } from "../lib/storefront-context.js";

const router = Router();

router.get("/products/featured", async (req, res) => {
  try {
    const result = await ProductService.getFeaturedProducts();
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات المميزة" });
  }
});

router.get("/products/trending", async (req, res) => {
  try {
    const result = await ProductService.getTrendingProducts();
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب المنتجات الأكثر طلباً" });
  }
});

router.get("/products", async (req, res) => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { tenantId: queryTenantId, categoryId, search } = parsed.data;

  let hasVariants: boolean | undefined;
  if (req.query.hasVariants === "true") hasVariants = true;
  else if (req.query.hasVariants === "false") hasVariants = false;
  else hasVariants = parsed.data.hasVariants;

  try {
    const sessionTenantId = await ProductService.resolveSessionTenantId(
      req.merchantTenantId,
      req.session?.merchantId
    );
    const effectiveTenantId = sessionTenantId ?? queryTenantId;

    if (!effectiveTenantId) {
      return res.status(400).json({ error: "tenantId مطلوب" });
    }

    const cacheKey = `tenant:${effectiveTenantId}:products:cat=${categoryId || "all"}:search=${search || "none"}:variants=${hasVariants ?? "any"}`;
    const canCache = !sessionTenantId || sessionTenantId !== effectiveTenantId;

    if (canCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const result = await ProductService.listProducts({
      effectiveTenantId,
      sessionTenantId,
      categoryId,
      search,
      hasVariants,
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
    const product = await ProductService.createProduct(
      sessionTenantId,
      parsed.data,
      req.session?.merchantId
    );
    await cache.invalidateTenant(sessionTenantId);
    res.status(201).json(product);
  } catch (err: any) {
    if (err.message === "TENANT_NOT_FOUND") {
      return res.status(404).json({ error: "المتجر غير موجود" });
    }
    if (err.message === "ACCOUNT_SUSPENDED") {
      return res.status(402).json({
        error: "حسابك موقوف — تواصل مع الدعم لإعادة تفعيل متجرك",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    if (err.message === "PRODUCT_LIMIT_REACHED") {
      return res.status(402).json({
        error: "وصلت إلى الحد الأقصى للمنتجات — يرجى الترقية للاستمرار",
        code: "PRODUCT_LIMIT_REACHED",
      });
    }
    if (err.message === "CATEGORY_INVALID") {
      return res.status(400).json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
    }
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء المنتج" });
  }
});

router.post("/products/seed-samples", requireRole("owner", "manager", "staff"), async (req, res) => {
  const sessionTenantId = req.merchantTenantId!;
  try {
    await ProductService.seedSampleProducts(sessionTenantId, req.session.merchantId!, req.log);
    await cache.invalidateTenant(sessionTenantId);
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إضافة المنتجات التجريبية" });
  }
});

router.delete("/products/clear-samples", requireRole("owner", "manager", "staff"), async (req, res) => {
  const sessionTenantId = req.merchantTenantId!;
  try {
    await ProductService.clearSampleProducts(sessionTenantId, req.session.merchantId!, req.log);
    await cache.invalidateTenant(sessionTenantId);
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المنتجات التجريبية" });
  }
});

router.get("/products/:id", async (req, res) => {
  const parsed = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const sessionTenantId = await ProductService.resolveSessionTenantId(
      req.merchantTenantId,
      req.session?.merchantId
    );
    const storefrontTenantId = await resolveStorefrontTenantId(req, { allowTestFallback: false });
    const effectiveTenantId = sessionTenantId || storefrontTenantId || null;
    const product = await ProductService.getProduct(parsed.data.id, effectiveTenantId);
    res.json(product);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }
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
    const product = await ProductService.updateProduct(paramsParsed.data.id, req.merchantTenantId!, bodyParsed.data);
    await cache.invalidateTenant(req.merchantTenantId!);
    res.json(product);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "لا يمكنك تعديل منتجات متجر آخر" });
    if (err.message === "CATEGORY_INVALID") return res.status(400).json({ error: "الفئة المحددة غير موجودة أو لا تنتمي لمتجرك" });
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث المنتج" });
  }
});

router.delete("/products/:id", requireRole("owner", "manager", "staff"), async (req, res) => {
  const parsed = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });

  try {
    await ProductService.deleteProduct(parsed.data.id, req.merchantTenantId!, req.session.merchantId!, req.log);
    await cache.invalidateTenant(req.merchantTenantId!);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "لا يمكنك حذف منتجات متجر آخر" });
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المنتج" });
  }
});

/* ─── Product Variants ─── */
router.get("/products/:id/variants", async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const sessionTenantId = await ProductService.resolveSessionTenantId(
      req.merchantTenantId,
      req.session?.merchantId
    );
    const storefrontTenantId = await resolveStorefrontTenantId(req, { allowTestFallback: false });
    const effectiveTenantId = sessionTenantId || storefrontTenantId || null;
    const variants = await ProductService.getVariants(productId, effectiveTenantId);
    res.json(variants);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب متغيرات المنتج" });
  }
});

router.post("/products/:id/variants", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  const { size, color, colorHex, imageUrls, stock } = req.body as {
    size?: string;
    color?: string;
    colorHex?: string;
    imageUrls?: unknown;
    stock?: number;
  };
  
  if (stock === undefined || stock === null) return res.status(400).json({ error: "stock مطلوب" });
  if (typeof stock !== "number" || stock < 0) return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });

  try {
    const variant = await ProductService.createVariant(productId, req.merchantTenantId!, {
      size, color, colorHex, imageUrls, stock
    });
    await cache.invalidateTenant(req.merchantTenantId!);
    res.status(201).json(variant);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "لا يمكنك إضافة متغيرات لمنتج متجر آخر" });
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء المتغير" });
  }
});

router.put("/products/:id/variants/:variantId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  if (isNaN(productId) || isNaN(variantId)) return res.status(400).json({ error: "معرّف غير صحيح" });
  
  const { size, color, colorHex, imageUrls, stock } = req.body as {
    size?: string | null;
    color?: string | null;
    colorHex?: string | null;
    imageUrls?: unknown;
    stock?: number;
  };

  if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
    return res.status(400).json({ error: "لا يمكن أن يكون المخزون سالباً" });
  }

  try {
    const variant = await ProductService.updateVariant(productId, variantId, req.merchantTenantId!, {
      size, color, colorHex, imageUrls, stock
    }, req.session.merchantId!, req.log);
    
    await cache.invalidateTenant(req.merchantTenantId!);
    res.json(variant);
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "لا يمكنك تعديل متغيرات منتج متجر آخر" });
    if (err.message === "VARIANT_NOT_FOUND") return res.status(404).json({ error: "المتغير غير موجود" });
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث المتغير" });
  }
});

router.delete("/products/:id/variants/:variantId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  if (isNaN(productId) || isNaN(variantId)) return res.status(400).json({ error: "معرّف غير صحيح" });

  try {
    await ProductService.deleteVariant(productId, variantId, req.merchantTenantId!);
    await cache.invalidateTenant(req.merchantTenantId!);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === "PRODUCT_NOT_FOUND") return res.status(404).json({ error: "المنتج غير موجود" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ error: "لا يمكنك حذف متغيرات منتج متجر آخر" });
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف المتغير" });
  }
});

export default router;
