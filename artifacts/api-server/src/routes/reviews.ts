import { Router } from "express";
import { db } from "@workspace/db";
import { productReviewsTable, productsTable, tenantsTable } from "@workspace/db";
import { eq, and, desc, avg, count } from "drizzle-orm";
import { requireRole } from "../middleware/require-role";

const router = Router();

// GET /reviews/public/:productId — public: list approved reviews + average rating
router.get("/reviews/public/:productId", async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) return res.status(400).json({ error: "معرّف المنتج غير صحيح" });
  try {
    const reviews = await db.select({
      id: productReviewsTable.id,
      customerName: productReviewsTable.customerName,
      rating: productReviewsTable.rating,
      body: productReviewsTable.body,
      createdAt: productReviewsTable.createdAt,
    })
      .from(productReviewsTable)
      .where(and(eq(productReviewsTable.productId, productId), eq(productReviewsTable.status, "approved")))
      .orderBy(desc(productReviewsTable.createdAt));

    const [stats] = await db.select({
      avgRating: avg(productReviewsTable.rating),
      totalCount: count(productReviewsTable.id),
    })
      .from(productReviewsTable)
      .where(and(eq(productReviewsTable.productId, productId), eq(productReviewsTable.status, "approved")));

    res.json({
      reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      avgRating: stats.avgRating ? parseFloat(stats.avgRating) : null,
      totalCount: Number(stats.totalCount),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// POST /reviews — public: submit a review
router.post("/reviews", async (req, res) => {
  const { productId, tenantId, customerName, customerEmail, rating, body } = req.body;
  if (!productId || !tenantId || !customerName || !customerEmail || !rating) {
    return res.status(400).json({ error: "جميع الحقول المطلوبة غير مكتملة" });
  }
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });

  try {
    const [product] = await db.select({ id: productsTable.id })
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.tenantId, tenantId)));
    if (!product) return res.status(404).json({ error: "المنتج غير موجود" });

    const [review] = await db.insert(productReviewsTable).values({
      productId,
      tenantId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      rating: parseInt(rating, 10),
      body: body?.trim() ?? null,
      status: "pending",
    }).returning();

    res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// GET /reviews — merchant: list all reviews for tenant
router.get("/reviews", requireRole("owner", "manager", "staff"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const { status, productId } = req.query;
  try {
    const conditions = [eq(productReviewsTable.tenantId, tenantId)];
    if (status) conditions.push(eq(productReviewsTable.status, status as string));
    if (productId) conditions.push(eq(productReviewsTable.productId, parseInt(productId as string, 10)));

    const reviews = await db.select({
      id: productReviewsTable.id,
      productId: productReviewsTable.productId,
      productName: productsTable.name,
      customerName: productReviewsTable.customerName,
      customerEmail: productReviewsTable.customerEmail,
      rating: productReviewsTable.rating,
      body: productReviewsTable.body,
      status: productReviewsTable.status,
      createdAt: productReviewsTable.createdAt,
    })
      .from(productReviewsTable)
      .leftJoin(productsTable, eq(productReviewsTable.productId, productsTable.id))
      .where(and(...conditions))
      .orderBy(desc(productReviewsTable.createdAt));

    res.json(reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// PUT /reviews/:id/status — merchant: approve or reject
router.put("/reviews/:id/status", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) return res.status(400).json({ error: "الحالة غير صحيحة" });

  try {
    const [existing] = await db.select({ id: productReviewsTable.id })
      .from(productReviewsTable)
      .where(and(eq(productReviewsTable.id, id), eq(productReviewsTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "التقييم غير موجود" });

    const [updated] = await db.update(productReviewsTable)
      .set({ status })
      .where(eq(productReviewsTable.id, id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

// DELETE /reviews/:id — merchant: delete review
router.delete("/reviews/:id", requireRole("owner", "manager"), async (req, res) => {
  const tenantId = req.merchantTenantId;
  if (!tenantId) return res.status(401).json({ error: "غير مصرح" });
  const id = parseInt(req.params.id, 10);
  try {
    const [existing] = await db.select({ id: productReviewsTable.id })
      .from(productReviewsTable)
      .where(and(eq(productReviewsTable.id, id), eq(productReviewsTable.tenantId, tenantId)));
    if (!existing) return res.status(404).json({ error: "التقييم غير موجود" });

    await db.delete(productReviewsTable).where(eq(productReviewsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

export default router;
