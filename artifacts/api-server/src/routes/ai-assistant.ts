import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middleware/require-role";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import {
  db,
  merchantsTable,
  tenantsTable,
  ordersTable,
  conversations,
  messages,
} from "@workspace/db";
import { eq, desc, count, sum, sql, and, gte } from "drizzle-orm";
import { checkAiRateLimit } from "../lib/ai-rate-limit";
import { aiLimiter } from "../lib/rate-limiters";

const router = Router();
type AiModel = "claude" | "gemini";

const MAX_INPUT_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 2000;

function sendSSE(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post("/ai/assistant/chat", requireAuth, aiLimiter, async (req, res) => {
  const { message, conversationId, model = "claude" } = req.body as {
    message?: string;
    conversationId?: number;
    model?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  const merchantId = req.session.merchantId!;
  const aiModel: AiModel = model === "gemini" ? "gemini" : "claude";

  // Truncate user input to prevent prompt injection via long payloads
  const safeMessage = message.trim().slice(0, MAX_INPUT_CHARS);

  try {
    const [merchantRow] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchantRow?.tenantId) {
      res.status(400).json({ error: "المتجر غير موجود" });
      return;
    }
    const tenantId = merchantRow.tenantId;

    // Per-tenant AI rate limit (20 requests/hour)
    const rateCheck = checkAiRateLimit(tenantId);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", String(rateCheck.retryAfter ?? 3600));
      res.status(429).json({ error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً" });
      return;
    }

    const [tenant] = await db
      .select({ name: tenantsTable.name, category: tenantsTable.category })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [kpi, monthKpi, todayKpi, uniqueCustomers] = await Promise.all([
      db
        .select({
          totalOrders: count(),
          totalRevenue: sum(ordersTable.totalAmount),
          pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'pending')`,
          confirmedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'confirmed')`,
          shippedOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'shipped')`,
          deliveredOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'delivered')`,
          cancelledOrders: sql<number>`count(*) filter (where ${ordersTable.status} = 'cancelled')`,
        })
        .from(ordersTable)
        .where(eq(ordersTable.tenantId, tenantId))
        .then((r) => r[0]),
      db
        .select({ revenueThisMonth: sum(ordersTable.totalAmount), ordersThisMonth: count() })
        .from(ordersTable)
        .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, startOfMonth)))
        .then((r) => r[0]),
      db
        .select({ ordersToday: count() })
        .from(ordersTable)
        .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, startOfToday)))
        .then((r) => r[0]),
      db.execute(sql`
        SELECT COUNT(DISTINCT customer_phone)::int AS total
        FROM orders WHERE tenant_id = ${tenantId}
      `).then((r) => (r.rows[0] as { total: number } | undefined)?.total ?? 0),
    ]);

    const [topProducts, recentOrders] = await Promise.all([
      db.execute(sql`
        SELECT p.name, SUM(oi.quantity)::int AS quantity,
               COALESCE(SUM(oi.total_price::numeric), 0)::float AS revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.tenant_id = ${tenantId} AND o.status != 'cancelled'
        GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 5
      `),
      db
        .select({
          id: ordersTable.id,
          customerName: ordersTable.customerName,
          totalAmount: ordersTable.totalAmount,
          status: ordersTable.status,
          createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .where(eq(ordersTable.tenantId, tenantId))
        .orderBy(desc(ordersTable.createdAt))
        .limit(5),
    ]);

    const statusLabel = (s: string) =>
      ({ pending: "⏳قيد الانتظار", confirmed: "✅مؤكد", shipped: "🚚مشحون", delivered: "📦تم التوصيل", cancelled: "❌ملغي" }[s] ?? s);

    const categoryLabel =
      tenant?.category === "fashion" ? "أزياء" : tenant?.category === "cosmetics" ? "تجميل" : "أزياء وتجميل";

    const now = new Date();
    const systemPrompt = `أنت مساعد ذكي خاص بمتجر "${tenant?.name ?? "المتجر"}" على منصة نور للتجارة الإلكترونية المصرية.

📊 **بيانات المتجر — ${now.toLocaleDateString("ar-EG")}:**
- الاسم: ${tenant?.name ?? "غير محدد"} | التصنيف: ${categoryLabel}
- طلبات اليوم: ${todayKpi.ordersToday} | طلبات الشهر: ${monthKpi.ordersThisMonth} | إجمالي الطلبات: ${kpi.totalOrders}
- إيرادات الشهر: ${parseFloat(monthKpi.revenueThisMonth ?? "0").toLocaleString("ar-EG")} جنيه | إجمالي الإيرادات: ${parseFloat(kpi.totalRevenue ?? "0").toLocaleString("ar-EG")} جنيه
- إجمالي العملاء الفريدين: ${uniqueCustomers}
- حالة الطلبات: قيد الانتظار(${kpi.pendingOrders}) | مؤكد(${kpi.confirmedOrders}) | مشحون(${kpi.shippedOrders}) | توصيل(${kpi.deliveredOrders}) | ملغي(${kpi.cancelledOrders})

🏆 **أفضل المنتجات:**
${(topProducts.rows as { name: string; quantity: number; revenue: number }[]).map((p, i) => `${i + 1}. ${p.name} — ${p.quantity} قطعة / ${Number(p.revenue).toLocaleString("ar-EG")} جنيه`).join("\n") || "لا توجد مبيعات بعد"}

📦 **أحدث الطلبات:**
${recentOrders.map((o) => `#${o.id} | ${o.customerName} | ${parseFloat(o.totalAmount as string).toLocaleString("ar-EG")} جنيه | ${statusLabel(o.status)}`).join("\n") || "لا توجد طلبات"}

---
صلاحياتك ومهمتك:
• أجب على أسئلة التاجر بناءً على البيانات الحقيقية أعلاه
• قدّم نصائح عملية لتحسين المبيعات وخدمة العملاء
• ساعد في صياغة رسائل، وصف منتجات، وردود على العملاء
• لو طُلب إجراء لا تستطيع تنفيذه مباشرة، وجّه التاجر للصفحة الصحيحة في لوحة التحكم
• تحدث دائماً بالعربية بأسلوب ودود ومهني ومختصر`;

    let convId = conversationId;
    if (!convId) {
      const [newConv] = await db
        .insert(conversations)
        .values({ title: safeMessage.slice(0, 60) })
        .returning({ id: conversations.id });
      convId = newConv.id;
    }

    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt)
      .limit(20);

    await db.insert(messages).values({ conversationId: convId, role: "user", content: safeMessage });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    sendSSE(res, { conversationId: convId });

    let fullResponse = "";

    if (aiModel === "gemini") {
      const geminiContents = [
        { role: "user" as const, parts: [{ text: systemPrompt }] },
        { role: "model" as const, parts: [{ text: "مرحباً! أنا مساعدك الذكي لمتجرك على نور. كيف يمكنني مساعدتك اليوم؟" }] },
        ...history.map((m) => ({
          role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        })),
        { role: "user" as const, parts: [{ text: safeMessage }] },
      ];

      const stream = await gemini.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: geminiContents,
        config: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      });

      for await (const chunk of stream) {
        const text = chunk.text ?? "";
        if (text) {
          fullResponse += text;
          sendSSE(res, { chunk: text });
        }
      }
    } else {
      const claudeMessages = [
        ...history.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: safeMessage },
      ];

      const stream = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: claudeMessages,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullResponse += event.delta.text;
          sendSSE(res, { chunk: event.delta.text });
        }
      }
    }

    await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });

    sendSSE(res, { done: true, conversationId: convId });
    res.end();
  } catch (err: unknown) {
    req.log.error(err);
    try {
      sendSSE(res, { error: "حدث خطأ، حاول مرة أخرى" });
      res.end();
    } catch {
      res.status(500).end();
    }
  }
});

/* ─── AI Pricing Advisor ─── */
router.post("/ai/pricing-advice", requireAuth, aiLimiter, async (req, res) => {
  const {
    productName, category, price, originalPrice, stock,
    orderCount, description, model = "claude",
  } = req.body as {
    productName?: string; category?: string; price?: number; originalPrice?: number | null;
    stock?: number; orderCount?: number; description?: string; model?: string;
  };

  if (!productName || price === undefined) {
    return res.status(400).json({ error: "اسم المنتج والسعر مطلوبان" });
  }

  const aiModel: AiModel = model === "gemini" ? "gemini" : "claude";

  // Per-merchant AI rate limit (pricing advisor uses requireAuth, no tenantId on req)
  const merchantIdForRate = req.session.merchantId;
  if (merchantIdForRate) {
    const rateCheck = checkAiRateLimit(merchantIdForRate);
    if (!rateCheck.allowed) {
      res.setHeader("Retry-After", String(rateCheck.retryAfter ?? 3600));
      return res.status(429).json({
        error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً",
      });
    }
  }

  const prompt = `المنتج المراد تحليله:
- الاسم: ${(productName ?? "").slice(0, 200)}
- الفئة: ${(category ?? "غير محدد").slice(0, 100)}
- السعر الحالي: ${price} ج.م
${originalPrice ? `- السعر قبل الخصم: ${originalPrice} ج.م` : ""}
- المخزون: ${stock ?? 0} قطعة
- إجمالي الطلبات: ${orderCount ?? 0} طلب
${description ? `- الوصف: ${(description).slice(0, 500)}` : ""}

قدّم تحليل سعر واضحاً ومختصراً يشمل:
1. **تقييم السعر الحالي** (هل مناسب، مرتفع، أم منخفض للسوق المصري؟)
2. **نطاق السعر المقترح** (حدد سعراً أدنى وأعلى مناسبَين)
3. **توصية تسعير الخصم** (هل تنصح بعرض سعر قبل الخصم؟ وكم يكون؟)
4. **ملاحظة استراتيجية** (نصيحة واحدة مختصرة لتحسين المبيعات)

أجب بالعربية، كن محدداً بالأرقام، وتحدث كمستشار خبير وودود.`;

  try {
    if (aiModel === "gemini") {
      const result = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { maxOutputTokens: 600, temperature: 0.7 },
      });
      const text = result.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
      return res.json({ advice: text });
    } else {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content.map((c) => ("text" in c ? c.text : "")).join("");
      return res.json({ advice: text });
    }
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل توليد استشارة السعر" });
  }
});

router.get("/ai/assistant/history/:conversationId", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "معرف المحادثة غير صالح" });
    return;
  }

  try {
    const msgs = await db
      .select({ id: messages.id, role: messages.role, content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    return res.json(msgs);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.delete("/ai/assistant/history/:conversationId", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "معرف المحادثة غير صالح" });
    return;
  }

  try {
    await db.delete(conversations).where(eq(conversations.id, convId));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
