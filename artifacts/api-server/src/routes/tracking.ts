import { Router } from "express";
import { db } from "@workspace/db";
import { trackingSettingsTable, tenantAuditEventsTable } from "@workspace/db";
import { requireRole } from "../middleware/require-role";
import { eq } from "drizzle-orm";
import { cache } from "../lib/cache.js";

const router = Router();

const GA4_RE = /^G-[A-Z0-9]+$/;
const META_RE = /^\d{10,20}$/;
const TIKTOK_RE = /^[A-Z0-9]{20,}$/i;
const GADS_RE = /^AW-[0-9]+$/;

function validateProvider(provider: string, value: string): boolean {
  if (!value) return true;
  switch (provider) {
    case "ga4": return GA4_RE.test(value);
    case "meta": return META_RE.test(value);
    case "tiktok": return TIKTOK_RE.test(value);
    case "googleAds": return GADS_RE.test(value);
    default: return false;
  }
}

// GET /tracking/settings
router.get("/tracking/settings", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const [settings] = await db.select().from(trackingSettingsTable).where(eq(trackingSettingsTable.tenantId, tenantId));
    res.json(settings ?? {
      tenantId,
      ga4MeasurementId: null, ga4Enabled: false,
      metaPixelId: null, metaEnabled: false,
      tiktokPixelId: null, tiktokEnabled: false,
      googleAdsConversionId: null, googleAdsEnabled: false,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إعدادات التتبع" });
  }
});

// PUT /tracking/settings
router.put("/tracking/settings", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const {
      ga4MeasurementId, ga4Enabled,
      metaPixelId, metaEnabled,
      tiktokPixelId, tiktokEnabled,
      googleAdsConversionId, googleAdsEnabled,
    } = req.body;

    if (ga4MeasurementId && !validateProvider("ga4", ga4MeasurementId)) return res.status(400).json({ error: "معرف GA4 غير صالح (مثال: G-XXXXXXXX)" });
    if (metaPixelId && !validateProvider("meta", metaPixelId)) return res.status(400).json({ error: "معرف Meta Pixel غير صالح (10-20 رقم)" });
    if (tiktokPixelId && !validateProvider("tiktok", tiktokPixelId)) return res.status(400).json({ error: "معرف TikTok Pixel غير صالح" });
    if (googleAdsConversionId && !validateProvider("googleAds", googleAdsConversionId)) return res.status(400).json({ error: "معرف Google Ads غير صالح (مثال: AW-XXXXXXX)" });

    const existing = await db.select({ id: trackingSettingsTable.id }).from(trackingSettingsTable).where(eq(trackingSettingsTable.tenantId, tenantId));
    let record;
    if (existing.length > 0) {
      [record] = await db.update(trackingSettingsTable).set({
        ga4MeasurementId: ga4MeasurementId ?? null,
        ga4Enabled: !!ga4Enabled,
        metaPixelId: metaPixelId ?? null,
        metaEnabled: !!metaEnabled,
        tiktokPixelId: tiktokPixelId ?? null,
        tiktokEnabled: !!tiktokEnabled,
        googleAdsConversionId: googleAdsConversionId ?? null,
        googleAdsEnabled: !!googleAdsEnabled,
        updatedAt: new Date(),
      }).where(eq(trackingSettingsTable.tenantId, tenantId)).returning();
    } else {
      [record] = await db.insert(trackingSettingsTable).values({
        tenantId,
        ga4MeasurementId, ga4Enabled: !!ga4Enabled,
        metaPixelId, metaEnabled: !!metaEnabled,
        tiktokPixelId, tiktokEnabled: !!tiktokEnabled,
        googleAdsConversionId, googleAdsEnabled: !!googleAdsEnabled,
      }).returning();
    }

    await db.insert(tenantAuditEventsTable).values({
      tenantId,
      actorId: req.session?.merchantId,
      actorLabel: "تاجر",
      eventType: "tracking_updated",
      summary: "تم تحديث إعدادات التتبع",
    }).catch(() => {});

    await cache.invalidateTenant(tenantId);
    res.json(record);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حفظ إعدادات التتبع" });
  }
});

export default router;
