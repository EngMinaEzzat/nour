import { Router } from "express";
import { db } from "@workspace/db";
import { shippingZonesTable, shippingSettingsTable, tenantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

/* ─── List shipping zones for a tenant ─── */
router.get("/shipping/zones", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const zones = await db
      .select()
      .from(shippingZonesTable)
      .where(eq(shippingZonesTable.tenantId, tenantId))
      .orderBy(shippingZonesTable.governorate, shippingZonesTable.city);

    res.json(zones.map((z) => ({
      ...z,
      shippingCost: parseFloat(z.shippingCost as string),
      createdAt: z.createdAt.toISOString(),
      updatedAt: z.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب مناطق الشحن" });
  }
});

/* ─── Create shipping zone ─── */
router.post("/shipping/zones", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { governorate, city, shippingCost, deliveryDays, isEnabled } = req.body as {
    governorate?: string;
    city?: string;
    shippingCost?: number;
    deliveryDays?: number;
    isEnabled?: boolean;
  };

  if (!governorate) return res.status(400).json({ error: "المحافظة مطلوبة" });
  if (shippingCost === undefined || shippingCost < 0) return res.status(400).json({ error: "تكلفة الشحن يجب أن تكون 0 أو أكثر" });

  try {
    const [zone] = await db
      .insert(shippingZonesTable)
      .values({
        tenantId,
        governorate: governorate.trim(),
        city: city?.trim() ?? null,
        shippingCost: String(shippingCost ?? 0),
        deliveryDays: deliveryDays ?? 3,
        isEnabled: isEnabled ?? true,
      })
      .returning();

    res.status(201).json({
      ...zone,
      shippingCost: parseFloat(zone.shippingCost as string),
      createdAt: zone.createdAt.toISOString(),
      updatedAt: zone.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء منطقة الشحن" });
  }
});

/* ─── Update shipping zone ─── */
router.put("/shipping/zones/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const zoneId = Number(req.params.id);
  if (isNaN(zoneId)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [existing] = await db
      .select({ id: shippingZonesTable.id, tenantId: shippingZonesTable.tenantId })
      .from(shippingZonesTable)
      .where(eq(shippingZonesTable.id, zoneId));

    if (!existing) return res.status(404).json({ error: "منطقة الشحن غير موجودة" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "غير مصرح" });

    const { governorate, city, shippingCost, deliveryDays, isEnabled } = req.body as {
      governorate?: string;
      city?: string;
      shippingCost?: number;
      deliveryDays?: number;
      isEnabled?: boolean;
    };

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (governorate !== undefined) updateData.governorate = governorate.trim();
    if (city !== undefined) updateData.city = city?.trim() ?? null;
    if (shippingCost !== undefined) updateData.shippingCost = String(shippingCost);
    if (deliveryDays !== undefined) updateData.deliveryDays = deliveryDays;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const [updated] = await db
      .update(shippingZonesTable)
      .set(updateData)
      .where(eq(shippingZonesTable.id, zoneId))
      .returning();

    res.json({
      ...updated,
      shippingCost: parseFloat(updated.shippingCost as string),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تعديل منطقة الشحن" });
  }
});

/* ─── Delete shipping zone ─── */
router.delete("/shipping/zones/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const zoneId = Number(req.params.id);
  if (isNaN(zoneId)) return res.status(400).json({ error: "معرف غير صالح" });

  try {
    const [existing] = await db
      .select({ id: shippingZonesTable.id, tenantId: shippingZonesTable.tenantId })
      .from(shippingZonesTable)
      .where(eq(shippingZonesTable.id, zoneId));

    if (!existing) return res.status(404).json({ error: "منطقة الشحن غير موجودة" });
    if (existing.tenantId !== tenantId) return res.status(403).json({ error: "غير مصرح" });

    await db.delete(shippingZonesTable).where(eq(shippingZonesTable.id, zoneId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حذف منطقة الشحن" });
  }
});

/* ─── Get shipping settings ─── */
router.get("/shipping/settings", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  try {
    const [settings] = await db
      .select()
      .from(shippingSettingsTable)
      .where(eq(shippingSettingsTable.tenantId, tenantId));

    if (!settings) {
      return res.json({
        id: null,
        tenantId,
        defaultShippingCost: 50,
        freeShippingMinSubtotal: null,
        freeShippingEnabled: false,
        isEnabled: true,
      });
    }

    res.json({
      ...settings,
      defaultShippingCost: parseFloat(settings.defaultShippingCost as string),
      freeShippingMinSubtotal: settings.freeShippingMinSubtotal
        ? parseFloat(settings.freeShippingMinSubtotal as string)
        : null,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب إعدادات الشحن" });
  }
});

/* ─── Upsert shipping settings ─── */
router.put("/shipping/settings", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId!;
  const { defaultShippingCost, freeShippingMinSubtotal, freeShippingEnabled, isEnabled } = req.body as {
    defaultShippingCost?: number;
    freeShippingMinSubtotal?: number | null;
    freeShippingEnabled?: boolean;
    isEnabled?: boolean;
  };

  try {
    const [existing] = await db
      .select({ id: shippingSettingsTable.id })
      .from(shippingSettingsTable)
      .where(eq(shippingSettingsTable.tenantId, tenantId));

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (defaultShippingCost !== undefined) values.defaultShippingCost = String(defaultShippingCost);
    if (freeShippingMinSubtotal !== undefined) values.freeShippingMinSubtotal = freeShippingMinSubtotal !== null ? String(freeShippingMinSubtotal) : null;
    if (freeShippingEnabled !== undefined) values.freeShippingEnabled = freeShippingEnabled;
    if (isEnabled !== undefined) values.isEnabled = isEnabled;

    let result;
    if (existing) {
      [result] = await db
        .update(shippingSettingsTable)
        .set(values)
        .where(eq(shippingSettingsTable.tenantId, tenantId))
        .returning();
    } else {
      [result] = await db
        .insert(shippingSettingsTable)
        .values({
          tenantId,
          defaultShippingCost: String(defaultShippingCost ?? 50),
          freeShippingMinSubtotal: freeShippingMinSubtotal !== null && freeShippingMinSubtotal !== undefined ? String(freeShippingMinSubtotal) : null,
          freeShippingEnabled: freeShippingEnabled ?? false,
          isEnabled: isEnabled ?? true,
        })
        .returning();
    }

    res.json({
      ...result,
      defaultShippingCost: parseFloat(result.defaultShippingCost as string),
      freeShippingMinSubtotal: result.freeShippingMinSubtotal
        ? parseFloat(result.freeShippingMinSubtotal as string)
        : null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حفظ إعدادات الشحن" });
  }
});

/* ─── Calculate shipping cost for a checkout (public) ─── */
router.post("/shipping/calculate", async (req, res) => {
  const { tenantId, governorate, city, subtotal } = req.body as {
    tenantId?: number;
    governorate?: string;
    city?: string;
    subtotal?: number;
  };

  if (!tenantId) return res.status(400).json({ error: "tenantId مطلوب" });
  if (!governorate) return res.status(400).json({ error: "المحافظة مطلوبة" });

  try {
    const [settings] = await db
      .select()
      .from(shippingSettingsTable)
      .where(eq(shippingSettingsTable.tenantId, tenantId));

    const currentSubtotal = subtotal ?? 0;

    if (settings?.freeShippingEnabled && settings.freeShippingMinSubtotal) {
      const threshold = parseFloat(settings.freeShippingMinSubtotal as string);
      if (currentSubtotal >= threshold) {
        return res.json({
          shippingCost: 0,
          deliveryDays: null,
          isFreeShipping: true,
          appliedRule: "free_shipping_threshold",
        });
      }
    }

    const zones = await db
      .select()
      .from(shippingZonesTable)
      .where(and(
        eq(shippingZonesTable.tenantId, tenantId),
        eq(shippingZonesTable.isEnabled, true),
      ));

    let matchedZone = null;

    if (city) {
      matchedZone = zones.find(
        (z) =>
          z.governorate.toLowerCase() === governorate.toLowerCase() &&
          z.city?.toLowerCase() === city.toLowerCase()
      );
    }

    if (!matchedZone) {
      matchedZone = zones.find(
        (z) =>
          z.governorate.toLowerCase() === governorate.toLowerCase() && !z.city
      );
    }

    if (!matchedZone && settings && !settings.isEnabled) {
      return res.status(422).json({ error: "الشحن غير متاح لهذه المنطقة" });
    }

    const defaultCost = settings ? parseFloat(settings.defaultShippingCost as string) : 50;

    return res.json({
      shippingCost: matchedZone ? parseFloat(matchedZone.shippingCost as string) : defaultCost,
      deliveryDays: matchedZone?.deliveryDays ?? null,
      isFreeShipping: false,
      appliedRule: matchedZone ? "zone_rule" : "default",
      zoneId: matchedZone?.id ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل حساب تكلفة الشحن" });
  }
});

export default router;
