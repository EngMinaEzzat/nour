import { Router } from "express";
import { db } from "@workspace/db";
import {
  billingInvoicesTable, tenantsTable, billingTransferRequestsTable, merchantsTable,
} from "@workspace/db";
import { requireRole, requirePlatformAdmin } from "../middleware/require-role";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

const PLAN_PRICES: Record<string, number> = { starter: 299, growth: 699, pro: 1499 };

/* ─── Bank details (from env, shown to merchants) ─── */
router.get("/billing/bank-details", requireRole("owner", "manager", "staff"), (_req, res) => {
  res.json({
    bankName: process.env.BANK_NAME ?? "اسم البنك",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "اسم صاحب الحساب",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "xxxx-xxxx-xxxx",
    iban: process.env.BANK_IBAN ?? "EGxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    instapayNumber: process.env.INSTAPAY_NUMBER ?? null,
  });
});

/* ─── Billing status ─── */
router.get("/billing/status", requireRole("owner", "manager", "staff"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const [tenant] = await db.select({
      planCode: tenantsTable.planCode,
      subscriptionStatus: tenantsTable.subscriptionStatus,
      subscriptionStartedAt: tenantsTable.subscriptionStartedAt,
      trialEndsAt: tenantsTable.trialEndsAt,
    }).from(tenantsTable).where(eq(tenantsTable.id, tenantId));

    const nextRenewalAt = tenant?.subscriptionStartedAt
      ? new Date(tenant.subscriptionStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

    res.json({
      ...tenant,
      subscriptionStartedAt: tenant?.subscriptionStartedAt?.toISOString() ?? null,
      trialEndsAt: tenant?.trialEndsAt?.toISOString() ?? null,
      monthlyPrice: PLAN_PRICES[tenant?.planCode ?? "starter"] ?? 0,
      nextRenewalAt: nextRenewalAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب حالة الاشتراك" });
  }
});

/* ─── Invoice list — merchant ─── */
router.get("/billing/invoices", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const invoices = await db.select().from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.tenantId, tenantId))
      .orderBy(desc(billingInvoicesTable.createdAt));
    res.json(invoices.map(serializeInvoice));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الفواتير" });
  }
});

/* ─── Invoice list — admin ─── */
router.get("/billing/invoices/:tenantId", requirePlatformAdmin, async (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const invoices = await db.select().from(billingInvoicesTable)
      .where(eq(billingInvoicesTable.tenantId, tenantId))
      .orderBy(desc(billingInvoicesTable.createdAt));
    res.json(invoices.map(serializeInvoice));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الفواتير" });
  }
});

/* ─── Admin: create invoice manually ─── */
router.post("/billing/invoices", requirePlatformAdmin, async (req, res) => {
  try {
    const { tenantId, planCode, amount, status, note, periodStart, periodEnd, providerReference } = req.body;
    if (!tenantId || !planCode || !amount) return res.status(400).json({ error: "tenantId و planCode و amount مطلوبة" });

    const invoiceNumber = `INV-${tenantId}-${Date.now()}`;
    const [invoice] = await db.insert(billingInvoicesTable).values({
      tenantId: Number(tenantId),
      invoiceNumber,
      planCode,
      amount: String(amount),
      status: status ?? "issued",
      note,
      providerReference,
      periodStart: periodStart ? new Date(periodStart) : undefined,
      periodEnd: periodEnd ? new Date(periodEnd) : undefined,
      issuedAt: new Date(),
      createdBy: req.session?.merchantId,
    }).returning();
    res.status(201).json(serializeInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل إنشاء الفاتورة" });
  }
});

/* ─── Admin: update invoice ─── */
router.put("/billing/invoices/:id", requirePlatformAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, note, providerReference } = req.body;
    const [invoice] = await db.update(billingInvoicesTable).set({
      status,
      note,
      providerReference,
      paidAt: status === "paid" ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(billingInvoicesTable.id, id)).returning();
    if (!invoice) return res.status(404).json({ error: "الفاتورة غير موجودة" });
    res.json(serializeInvoice(invoice));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل التحديث" });
  }
});

/* ─── Merchant: submit bank transfer request ─── */
router.post("/billing/transfer-request", requireRole("owner"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const { planCode, referenceNumber, receiptImageUrl } = req.body;
    if (!planCode || !referenceNumber) {
      return res.status(400).json({ error: "planCode و referenceNumber مطلوبان" });
    }
    const amount = PLAN_PRICES[planCode];
    if (!amount) return res.status(400).json({ error: "خطة غير صالحة" });

    const existing = await db.select({ id: billingTransferRequestsTable.id })
      .from(billingTransferRequestsTable)
      .where(and(
        eq(billingTransferRequestsTable.tenantId, tenantId),
        eq(billingTransferRequestsTable.status, "pending"),
      ));
    if (existing.length > 0) {
      return res.status(409).json({ error: "لديك طلب تحويل قيد المراجعة بالفعل" });
    }

    const [request] = await db.insert(billingTransferRequestsTable).values({
      tenantId,
      planCode,
      amount,
      referenceNumber,
      receiptImageUrl: receiptImageUrl ?? null,
    }).returning();

    res.status(201).json(serializeTransfer(request));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل تقديم طلب التحويل" });
  }
});

/* ─── Merchant: view own transfer requests ─── */
router.get("/billing/transfer-requests", requireRole("owner", "manager"), async (req, res) => {
  try {
    const tenantId = req.merchantTenantId!;
    const requests = await db.select().from(billingTransferRequestsTable)
      .where(eq(billingTransferRequestsTable.tenantId, tenantId))
      .orderBy(desc(billingTransferRequestsTable.createdAt));
    res.json(requests.map(serializeTransfer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "فشل جلب الطلبات" });
  }
});

function serializeInvoice(inv: Record<string, unknown>) {
  return {
    ...inv,
    createdAt: (inv.createdAt as Date).toISOString(),
    updatedAt: (inv.updatedAt as Date).toISOString(),
    issuedAt: inv.issuedAt ? (inv.issuedAt as Date).toISOString() : null,
    paidAt: inv.paidAt ? (inv.paidAt as Date).toISOString() : null,
    periodStart: inv.periodStart ? (inv.periodStart as Date).toISOString() : null,
    periodEnd: inv.periodEnd ? (inv.periodEnd as Date).toISOString() : null,
  };
}

function serializeTransfer(r: Record<string, unknown>) {
  return {
    ...r,
    createdAt: (r.createdAt as Date).toISOString(),
    updatedAt: (r.updatedAt as Date).toISOString(),
    reviewedAt: r.reviewedAt ? (r.reviewedAt as Date).toISOString() : null,
  };
}

export default router;
