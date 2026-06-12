import { Router } from "express";
import type { Response } from "express";
import { requireRole } from "../middleware/require-role.js";
import {
  db,
  tenantsTable,
  ordersTable,
  conversations,
  messages,
} from "@workspace/db";
import { eq, desc, count, sum, sql, and, gte } from "drizzle-orm";
import { checkAiRateLimit, getMaxInputLength } from "../lib/ai-rate-limit.js";
import { aiLimiter } from "../lib/rate-limiters.js";
import {
  generateContent,
  requestedModelToProvider,
  resolveAiModel,
  resolveAiProvider,
  streamChatWithHistory,
} from "../lib/ai-provider.js";
import { logAiUsage } from "../lib/ai-usage-logger.js";
import { isAiConfigurationError } from "../lib/ai-safety.js";

const router = Router();

const MAX_OUTPUT_TOKENS = 2000;

function sendSSE(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post("/ai/assistant/chat", requireRole("owner", "manager", "staff"), aiLimiter, async (req, res) => {
  const { message, conversationId, model } = req.body as {
    message?: string;
    conversationId?: number;
    model?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "الرسالة مطلوبة" });
    return;
  }

  const merchantId = req.session.merchantId!;
  const tenantId = req.merchantTenantId!;
  const requestedProvider = requestedModelToProvider(model);
  const provider = resolveAiProvider(requestedProvider);
  const providerModel = resolveAiModel(provider, model);

  // Input length validation
  const maxLen = getMaxInputLength("chat");
  if (message.trim().length > maxLen) {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "chat",
      provider,
      model: providerModel,
      status: "blocked",
      inputSummary: message.trim(),
      errorMessage: `Input exceeded ${maxLen} characters`,
    });
    res.status(400).json({ error: `الرسالة طويلة جداً — الحد الأقصى ${maxLen} حرف` });
    return;
  }

  const safeMessage = message.trim().slice(0, maxLen);

  // Per-tenant AI rate limit (plan-aware)
  const [tenantForPlan] = await db
    .select({ planCode: tenantsTable.planCode })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  const rateCheck = checkAiRateLimit(tenantId, tenantForPlan?.planCode);
  if (!rateCheck.allowed) {
    await logAiUsage({
      tenantId, merchantId, promptType: "chat", provider, model: providerModel,
      status: "rate_limited", inputSummary: safeMessage,
    });
    res.setHeader("Retry-After", String(rateCheck.retryAfter ?? 3600));
    res.status(429).json({ error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً" });
    return;
  }

  try {
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
• تحدث دائماً بالعربية بأسلوب ودود ومهني ومختصر
• عند صياغة أو اقتراح نصوص موجهة (Prompts) لتوليد الصور التسويقية أو لوحات المتجر الإعلانية (Banners):
  1. اتبع دائماً هذا الهيكل المنظم باللغة الإنجليزية: (Subject -> Action -> Context -> Camera Spec -> Melanin-Aware Lighting -> Negatives).
  2. احرص على التمثيل المحلي الواقعي والمعاصر لجمهور مصر والشرق الأوسط، وارفض تماماً الصور النمطية القديمة (كالصحاري والجمال والأقواس الأثرية).
  3. استخدم دائماً توجيهات إضاءة طبيعية واضحة تتناسب مع درجات البشرة المتنوعة (Melanin-Aware Lighting) وتمنع تبييض أو تشابه الوجوه المتطابق.
  4. ادمج دائماً وبشكل صريح قائمة الكلمات السلبية لمنع النصوص العربية المشوهة أو عيوب التوليد، مثل:
     Negative constraints: "gibberish arabic text, garbled script, fictional non-existent writing, cloned faces, identical features, plastic skin look, waxy texture, over-saturated primary colors, exoticised orientalist tropes, historical stereotypes, extra limbs, deformed hands, blurry details"`;

    let convId = conversationId;

    // Verify existing conversation belongs to this tenant
    if (convId) {
      const [existingConv] = await db
        .select({ tenantId: conversations.tenantId })
        .from(conversations)
        .where(eq(conversations.id, convId));

      if (!existingConv || existingConv.tenantId !== tenantId) {
        res.status(403).json({ error: "لا يمكنك الوصول لهذه المحادثة" });
        return;
      }
    }

    if (!convId) {
      const [newConv] = await db
        .insert(conversations)
        .values({ title: safeMessage.slice(0, 60), tenantId, merchantId })
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

    const startTime = Date.now();

    const result = await streamChatWithHistory({
      provider,
      model: providerModel,
      systemPrompt,
      history,
      userMessage: safeMessage,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onChunk: (text) => sendSSE(res, { chunk: text }),
    });

    const durationMs = Date.now() - startTime;

    await db.insert(messages).values({ conversationId: convId, role: "assistant", content: result.text });

    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "chat",
      inputSummary: safeMessage,
      resultSummary: result.text,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      status: "success",
      durationMs,
    });

    sendSSE(res, { done: true, conversationId: convId });
    res.end();
  } catch (err: unknown) {
    req.log.error(err);
    await logAiUsage({
      tenantId, merchantId, promptType: "chat", provider, model: providerModel,
      status: "failure", inputSummary: safeMessage,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    }).catch(() => {});
    if (!res.headersSent && isAiConfigurationError(err)) {
      res.status(503).json({ error: "AI provider is not configured" });
      return;
    }
    try {
      sendSSE(res, { error: "حدث خطأ، حاول مرة أخرى" });
      res.end();
    } catch {
      res.status(500).end();
    }
  }
});

/* ─── AI Pricing Advisor ─── */
router.post("/ai/pricing-advice", requireRole("owner", "manager", "staff"), aiLimiter, async (req, res) => {
  const {
    productName, category, price, originalPrice, stock,
    orderCount, description, model,
  } = req.body as {
    productName?: string; category?: string; price?: number; originalPrice?: number | null;
    stock?: number; orderCount?: number; description?: string; model?: string;
  };

  if (!productName || price === undefined) {
    return res.status(400).json({ error: "اسم المنتج والسعر مطلوبان" });
  }

  const merchantId = req.session.merchantId!;
  const tenantId = req.merchantTenantId!;
  const requestedProvider = requestedModelToProvider(model);
  const provider = resolveAiProvider(requestedProvider);
  const providerModel = resolveAiModel(provider, model);

  // Input length validation
  const maxLen = getMaxInputLength("pricing_advice");
  const combinedInput = `${productName} ${category ?? ""} ${description ?? ""}`;
  if (combinedInput.length > maxLen) {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "pricing_advice",
      provider,
      model: providerModel,
      status: "blocked",
      inputSummary: combinedInput,
      errorMessage: `Input exceeded ${maxLen} characters`,
    });
    return res.status(400).json({ error: `المدخلات طويلة جداً — الحد الأقصى ${maxLen} حرف` });
  }

  // Per-tenant AI rate limit (plan-aware)
  const [tenantForPlan] = await db
    .select({ planCode: tenantsTable.planCode })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  const rateCheck = checkAiRateLimit(tenantId, tenantForPlan?.planCode);
  if (!rateCheck.allowed) {
    await logAiUsage({
      tenantId, merchantId, promptType: "pricing_advice", provider, model: providerModel,
      status: "rate_limited",
    });
    res.setHeader("Retry-After", String(rateCheck.retryAfter ?? 3600));
    return res.status(429).json({ error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً" });
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

  const startTime = Date.now();

  try {
    const result = await generateContent({
      provider,
      model: providerModel,
      userPrompt: prompt,
      maxOutputTokens: 600,
      temperature: 0.7,
    });

    const durationMs = Date.now() - startTime;

    await logAiUsage({
      tenantId, merchantId, promptType: "pricing_advice",
      inputSummary: `${productName} - ${price} EGP`,
      resultSummary: result.text,
      provider: result.provider, model: result.model,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens,
      status: "success", durationMs,
    });

    return res.json({ advice: result.text });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    req.log.error(err);
    await logAiUsage({
      tenantId, merchantId, promptType: "pricing_advice", provider, model: providerModel,
      status: "failure", errorMessage: err instanceof Error ? err.message : "Unknown error",
      durationMs,
    }).catch(() => {});
    if (isAiConfigurationError(err)) {
      return res.status(503).json({ error: "AI provider is not configured" });
    }
    return res.status(500).json({ error: "فشل توليد استشارة السعر" });
  }
});

router.get("/ai/assistant/history/:conversationId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const convId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "معرف المحادثة غير صالح" });
    return;
  }

  const tenantId = req.merchantTenantId!;

  try {
    // Verify conversation belongs to this tenant
    const [conv] = await db
      .select({ tenantId: conversations.tenantId })
      .from(conversations)
      .where(eq(conversations.id, convId));

    if (!conv || conv.tenantId !== tenantId) {
      return res.status(403).json({ error: "لا يمكنك الوصول لهذه المحادثة" });
    }

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

router.delete("/ai/assistant/history/:conversationId", requireRole("owner", "manager", "staff"), async (req, res) => {
  const convId = parseInt(req.params["conversationId"] as string, 10);
  if (isNaN(convId)) {
    res.status(400).json({ error: "معرف المحادثة غير صالح" });
    return;
  }

  const tenantId = req.merchantTenantId!;

  try {
    // Verify conversation belongs to this tenant
    const [conv] = await db
      .select({ tenantId: conversations.tenantId })
      .from(conversations)
      .where(eq(conversations.id, convId));

    if (!conv || conv.tenantId !== tenantId) {
      return res.status(403).json({ error: "لا يمكنك الوصول لهذه المحادثة" });
    }

    await db.delete(conversations).where(and(eq(conversations.id, convId), eq(conversations.tenantId, tenantId)));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
