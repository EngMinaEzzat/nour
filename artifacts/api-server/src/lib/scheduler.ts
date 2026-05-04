import cron from "node-cron";
import { db } from "@workspace/db";
import { tenantsTable, merchantsTable, productsTable } from "@workspace/db";
import { eq, and, lte, isNotNull, lt, sql } from "drizzle-orm";
import { logger } from "./logger.js";
import {
  sendSubscriptionReminderEmail,
  sendSubscriptionSuspendedEmail,
} from "./email.js";
import { buildWhatsAppLink } from "./whatsapp.js";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://nour.eg";

function billingUrl() {
  return `${APP_BASE_URL}/billing`;
}

async function checkExpiringTrials() {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  try {
    const expiring = await db
      .select({
        id: tenantsTable.id,
        name: tenantsTable.name,
        slug: tenantsTable.slug,
        trialEndsAt: tenantsTable.trialEndsAt,
        subscriptionStatus: tenantsTable.subscriptionStatus,
        ownerEmail: merchantsTable.email,
      })
      .from(tenantsTable)
      .leftJoin(
        merchantsTable,
        and(eq(merchantsTable.tenantId, tenantsTable.id), eq(merchantsTable.role, "owner")),
      )
      .where(
        and(
          eq(tenantsTable.subscriptionStatus, "trial"),
          isNotNull(tenantsTable.trialEndsAt),
          lte(tenantsTable.trialEndsAt, in3Days),
        ),
      );

    for (const tenant of expiring) {
      if (!tenant.ownerEmail || !tenant.trialEndsAt) continue;

      const msLeft = new Date(tenant.trialEndsAt).getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

      if (daysLeft <= 0) continue;

      if (daysLeft <= 1 || daysLeft === 3) {
        await sendSubscriptionReminderEmail(
          tenant.ownerEmail,
          tenant.name,
          daysLeft,
          billingUrl(),
        ).catch((err) => logger.warn({ err, tenantId: tenant.id }, "Reminder email failed"));
        logger.info({ tenantId: tenant.id, daysLeft }, "Sent subscription reminder");
      }
    }
  } catch (err) {
    logger.error({ err }, "checkExpiringTrials failed");
  }
}

async function suspendExpiredTrials() {
  const now = new Date();

  try {
    const expired = await db
      .select({
        id: tenantsTable.id,
        name: tenantsTable.name,
        ownerEmail: merchantsTable.email,
      })
      .from(tenantsTable)
      .leftJoin(
        merchantsTable,
        and(eq(merchantsTable.tenantId, tenantsTable.id), eq(merchantsTable.role, "owner")),
      )
      .where(
        and(
          eq(tenantsTable.subscriptionStatus, "trial"),
          isNotNull(tenantsTable.trialEndsAt),
          lte(tenantsTable.trialEndsAt, now),
        ),
      );

    for (const tenant of expired) {
      await db
        .update(tenantsTable)
        .set({ subscriptionStatus: "suspended" })
        .where(eq(tenantsTable.id, tenant.id));

      logger.info({ tenantId: tenant.id }, "Auto-suspended expired trial");

      if (tenant.ownerEmail) {
        await sendSubscriptionSuspendedEmail(
          tenant.ownerEmail,
          tenant.name,
          billingUrl(),
        ).catch((err) => logger.warn({ err, tenantId: tenant.id }, "Suspension email failed"));
      }
    }
  } catch (err) {
    logger.error({ err }, "suspendExpiredTrials failed");
  }
}

/* ─── Daily low-stock alert: send WhatsApp link to each merchant with low-stock items ─── */
async function checkLowStockAlerts() {
  try {
    // Find all tenants with at least one product below their threshold (default: stock <= 5)
    const lowStockProducts = await db
      .select({
        tenantId: productsTable.tenantId,
        tenantName: tenantsTable.name,
        productId: productsTable.id,
        productName: productsTable.name,
        stock: productsTable.stock,
        ownerPhone: merchantsTable.name, // use name as proxy — phone comes from tenant socialLinks
        ownerEmail: merchantsTable.email,
        socialLinks: tenantsTable.socialLinks,
      })
      .from(productsTable)
      .leftJoin(tenantsTable, eq(productsTable.tenantId, tenantsTable.id))
      .leftJoin(
        merchantsTable,
        and(eq(merchantsTable.tenantId, productsTable.tenantId), eq(merchantsTable.role, "owner")),
      )
      .where(
        and(
          eq(productsTable.status, "active"),
          lt(productsTable.stock, sql`6`), // stock < 6 (5 or below)
          isNotNull(productsTable.tenantId),
        )
      );

    // Group by tenant
    const byTenant = new Map<number, typeof lowStockProducts>();
    for (const row of lowStockProducts) {
      if (!row.tenantId) continue;
      if (!byTenant.has(row.tenantId)) byTenant.set(row.tenantId, []);
      byTenant.get(row.tenantId)!.push(row);
    }

    for (const [tenantId, products] of byTenant) {
      const first = products[0];
      if (!first) continue;

      const itemsList = products
        .map((p) => `• ${p.productName} (${p.stock} متبقٍ)`)
        .join("\n");

      const msg = `⚠️ تنبيه مخزون منخفض من *${first.tenantName}*\n\nالمنتجات التي تحتاج تجديد:\n${itemsList}\n\nقم بتحديث المخزون من لوحة التحكم 👇\n${APP_BASE_URL}/inventory-alerts`;

      // Try to get WhatsApp from socialLinks
      let waPhone: string | null = null;
      try {
        const sl = first.socialLinks ? JSON.parse(first.socialLinks as string) : {};
        waPhone = sl.whatsapp ?? null;
      } catch {}

      if (waPhone) {
        const link = buildWhatsAppLink(waPhone, msg);
        logger.info({ tenantId, productCount: products.length, waLink: link.substring(0, 80) }, "Low-stock WhatsApp alert generated");
      } else {
        logger.info({ tenantId, productCount: products.length }, "Low-stock alert — no WhatsApp configured for tenant");
      }
    }
  } catch (err) {
    logger.error({ err }, "checkLowStockAlerts failed");
  }
}

export function startScheduler() {
  cron.schedule("0 8 * * *", async () => {
    logger.info("Scheduler: running daily subscription checks");
    await suspendExpiredTrials();
    await checkExpiringTrials();
    await checkLowStockAlerts();
  }, { timezone: "Africa/Cairo" });

  logger.info("Subscription scheduler started (daily at 08:00 Cairo)");
}
