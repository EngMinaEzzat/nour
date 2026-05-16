import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, tenantAuditEventsTable } from "@workspace/db";
import { requireRole } from "../middleware/require-role";
import { eq } from "drizzle-orm";
import { cache } from "../lib/cache.js";

const router = Router();

// GET /store-settings — full tenant branding + SEO profile
router.get("/store-settings", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const [tenant] = await db.select({
      id: tenantsTable.id,
      name: tenantsTable.name,
      slug: tenantsTable.slug,
      description: tenantsTable.description,
      logoUrl: tenantsTable.logoUrl,
      coverUrl: tenantsTable.coverUrl,
      primaryColor: tenantsTable.primaryColor,
      secondaryColor: tenantsTable.secondaryColor,
      theme: tenantsTable.theme,
      category: tenantsTable.category,
      city: tenantsTable.city,
      faviconUrl: tenantsTable.faviconUrl,
      seoTitle: tenantsTable.seoTitle,
      seoDescription: tenantsTable.seoDescription,
      socialLinks: tenantsTable.socialLinks,
      footerContact: tenantsTable.footerContact,
      customDomain: tenantsTable.customDomain,
      customDomainVerified: tenantsTable.customDomainVerified,
      storeConfig: tenantsTable.storeConfig,
    }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));

    if (!tenant) return res.status(404).json({ error: "المتجر غير موجود" });

    let socialLinks: Record<string, string> = {};
    try { socialLinks = tenant.socialLinks ? JSON.parse(tenant.socialLinks) : {}; } catch {}

    let footerContact: Record<string, string> = {};
    try { footerContact = tenant.footerContact ? JSON.parse(tenant.footerContact) : {}; } catch {}

    res.json({ ...tenant, socialLinks, footerContact });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إعدادات المتجر" });
  }
});

// PUT /store-settings/layout — publish the visual store builder layout
router.put("/store-settings/layout", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { storeConfig } = req.body as { storeConfig?: unknown };

    if (!storeConfig || typeof storeConfig !== "object" || Array.isArray(storeConfig)) {
      return res.status(400).json({ error: "storeConfig is required" });
    }

    const [updated] = await db.update(tenantsTable).set({ storeConfig })
      .where(eq(tenantsTable.id, tenantId))
      .returning({
        id: tenantsTable.id,
        storeConfig: tenantsTable.storeConfig,
      });

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "تاجر",
      eventType: "tracking_updated",
      summary: "تم تحديث تصميم واجهة المتجر",
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث تصميم المتجر" });
  }
});

// PUT /store-settings/branding — update basic branding (name, logo, colors)
router.put("/store-settings/branding", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { name, description, logoUrl, coverUrl, faviconUrl, primaryColor, secondaryColor, theme, city } = req.body;

    if (name && (name.length < 2 || name.length > 100)) {
      return res.status(400).json({ error: "اسم المتجر يجب أن يكون بين 2 و 100 حرف" });
    }

    const [updated] = await db.update(tenantsTable).set({
      ...(name ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(coverUrl !== undefined ? { coverUrl } : {}),
      ...(faviconUrl !== undefined ? { faviconUrl } : {}),
      ...(primaryColor !== undefined ? { primaryColor } : {}),
      ...(secondaryColor !== undefined ? { secondaryColor } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(city !== undefined ? { city } : {}),
    }).where(eq(tenantsTable.id, tenantId)).returning({
      id: tenantsTable.id,
      name: tenantsTable.name,
      logoUrl: tenantsTable.logoUrl,
      coverUrl: tenantsTable.coverUrl,
      faviconUrl: tenantsTable.faviconUrl,
      primaryColor: tenantsTable.primaryColor,
      secondaryColor: tenantsTable.secondaryColor,
      theme: tenantsTable.theme,
    });

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث العلامة التجارية" });
  }
});

// PUT /store-settings/seo — update SEO fields
router.put("/store-settings/seo", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { seoTitle, seoDescription } = req.body;

    if (seoTitle && seoTitle.length > 70) return res.status(400).json({ error: "عنوان SEO يجب ألا يتجاوز 70 حرفًا" });
    if (seoDescription && seoDescription.length > 160) return res.status(400).json({ error: "وصف SEO يجب ألا يتجاوز 160 حرفًا" });

    const [updated] = await db.update(tenantsTable).set({
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
    }).where(eq(tenantsTable.id, tenantId)).returning({ id: tenantsTable.id, seoTitle: tenantsTable.seoTitle, seoDescription: tenantsTable.seoDescription });

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث إعدادات SEO" });
  }
});

// PUT /store-settings/social — update social links + footer contact
router.put("/store-settings/social", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { instagram, facebook, tiktok, whatsapp, email, phone } = req.body;

    const socialLinks = JSON.stringify({ instagram, facebook, tiktok, whatsapp });
    const footerContact = JSON.stringify({ email, phone });

    const [updated] = await db.update(tenantsTable).set({ socialLinks, footerContact })
      .where(eq(tenantsTable.id, tenantId))
      .returning({ id: tenantsTable.id, socialLinks: tenantsTable.socialLinks, footerContact: tenantsTable.footerContact });

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "تاجر",
      eventType: "tracking_updated",
      summary: "تم تحديث الروابط الاجتماعية ومعلومات التواصل",
    }).catch(() => {});

    await cache.invalidateTenant(tenantId);
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تحديث الروابط الاجتماعية" });
  }
});

export default router;
