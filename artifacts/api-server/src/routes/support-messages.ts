import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformSupportMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requirePlatformAdmin } from "../middleware/require-role";

const router: IRouter = Router();

// Submit a platform support message (public/guest or logged in merchant)
router.post("/support-messages", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: "رقم الهاتف والرسالة مطلوبان" });
  }

  const merchantId = req.session?.merchantId || null;

  try {
    const [inserted] = await db
      .insert(platformSupportMessagesTable)
      .values({
        merchantId: merchantId ? Number(merchantId) : null,
        name: name || null,
        email: email || null,
        phone,
        message,
        status: "pending",
      })
      .returning();

    return res.status(201).json({ success: true, message: inserted });
  } catch (error) {
    req.log.error(error, "Failed to insert support message");
    return res.status(500).json({ error: "حدث خطأ أثناء حفظ الرسالة" });
  }
});

// List all support messages (Platform Admin only)
router.get("/platform/support-messages", requirePlatformAdmin, async (req, res) => {
  try {
    const messagesList = await db
      .select()
      .from(platformSupportMessagesTable)
      .orderBy(desc(platformSupportMessagesTable.createdAt));

    return res.json(messagesList);
  } catch (error) {
    req.log.error(error, "Failed to list support messages");
    return res.status(500).json({ error: "حدث خطأ أثناء جلب الرسائل" });
  }
});

// Resolve a support message (Platform Admin only)
router.put("/platform/support-messages/:id/resolve", requirePlatformAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const [updated] = await db
      .update(platformSupportMessagesTable)
      .set({ status: "resolved" })
      .where(eq(platformSupportMessagesTable.id, Number(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "الرسالة غير موجودة" });
    }

    return res.json({ success: true, message: updated });
  } catch (error) {
    req.log.error(error, "Failed to resolve support message");
    return res.status(500).json({ error: "حدث خطأ أثناء تحديث حالة الرسالة" });
  }
});

export default router;
