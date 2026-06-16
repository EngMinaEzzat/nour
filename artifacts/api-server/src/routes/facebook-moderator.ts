import { Router } from "express";
import type { Response } from "express";
import { requireAuth } from "../middleware/require-role";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import {
  db,
  merchantsTable,
  tenantsTable,
  facebookConnectionsTable,
  facebookModerationLogTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();
type AiModel = "claude" | "gemini";

const FB_API = "https://graph.facebook.com/v19.0";

/* ─── helpers ─── */

function buildSecureFbUrl(path: string): URL {
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(`${FB_API}/${cleanPath}`);
  if (
    url.origin !== "https://graph.facebook.com" ||
    !url.pathname.startsWith("/v19.0/")
  ) {
    throw new Error("Invalid Facebook API path");
  }
  return url;
}

async function fbGet(
  path: string,
  token: string,
  params: Record<string, string> = {},
) {
  const url = buildSecureFbUrl(path);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json()) as { error?: { message: string } };
  if (!res.ok || json.error)
    throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

async function fbPost(
  path: string,
  token: string,
  body: Record<string, string>,
) {
  const url = buildSecureFbUrl(path);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json()) as { error?: { message: string } };
  if (!res.ok || json.error)
    throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json;
}

async function getMerchantConnection(merchantId: number) {
  const [merchant] = await db
    .select({ tenantId: merchantsTable.tenantId })
    .from(merchantsTable)
    .where(eq(merchantsTable.id, merchantId));

  if (!merchant?.tenantId) return null;

  const [conn] = await db
    .select()
    .from(facebookConnectionsTable)
    .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));

  return conn
    ? { ...conn, tenantId: merchant.tenantId }
    : { tenantId: merchant.tenantId, connection: null };
}

async function callAI(
  model: AiModel,
  system: string,
  prompt: string,
): Promise<string> {
  if (model === "gemini") {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${prompt}` }] }],
      config: { maxOutputTokens: 1024 },
    });
    return response.text ?? "";
  }
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

/* ─── routes ─── */

router.get("/facebook/status", requireAuth, async (req, res) => {
  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId) return res.json({ connected: false });

    const [conn] = await db
      .select({
        id: facebookConnectionsTable.id,
        pageId: facebookConnectionsTable.pageId,
        pageName: facebookConnectionsTable.pageName,
      })
      .from(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));

    return res.json({
      connected: !!conn,
      pageId: conn?.pageId,
      pageName: conn?.pageName,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.post("/facebook/connect", requireAuth, async (req, res) => {
  const { pageId, pageAccessToken } = req.body as {
    pageId?: string;
    pageAccessToken?: string;
  };
  if (!pageId?.trim() || !pageAccessToken?.trim()) {
    return res.status(400).json({ error: "معرف الصفحة وتوكن الوصول مطلوبان" });
  }

  const merchantId = req.session.merchantId!;

  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    // Verify token by fetching page name
    let pageName = pageId;
    try {
      const info = (await fbGet(pageId, pageAccessToken, {
        fields: "name",
      })) as { name?: string };
      pageName = info.name ?? pageId;
    } catch {
      return res
        .status(400)
        .json({
          error: "فشل التحقق من التوكن — تأكد من صحة معرف الصفحة والتوكن",
        });
    }

    await db
      .insert(facebookConnectionsTable)
      .values({
        tenantId: merchant.tenantId,
        pageId: pageId.trim(),
        pageName,
        pageAccessToken: pageAccessToken.trim(),
      })
      .onConflictDoUpdate({
        target: facebookConnectionsTable.tenantId,
        set: {
          pageId: pageId.trim(),
          pageName,
          pageAccessToken: pageAccessToken.trim(),
          updatedAt: new Date(),
        },
      });

    return res.json({ success: true, pageName });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ أثناء الربط" });
  }
});

router.delete("/facebook/disconnect", requireAuth, async (req, res) => {
  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    await db
      .delete(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

router.get("/facebook/comments", requireAuth, async (req, res) => {
  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    const [conn] = await db
      .select()
      .from(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));

    if (!conn) return res.status(400).json({ error: "Facebook غير مربوط" });

    const feed = (await fbGet(conn.pageId, conn.pageAccessToken, {
      fields:
        "id,message,story,created_time,full_picture,comments{id,message,from,created_time,like_count}",
      limit: "15",
    })) as {
      data: Array<{
        id: string;
        message?: string;
        story?: string;
        created_time: string;
        full_picture?: string;
        comments?: {
          data: Array<{
            id: string;
            message: string;
            from?: { name: string; id: string };
            created_time: string;
            like_count?: number;
          }>;
        };
      }>;
    };

    const logs = await db
      .select({
        itemId: facebookModerationLogTable.itemId,
        status: facebookModerationLogTable.status,
        aiDraft: facebookModerationLogTable.aiDraft,
      })
      .from(facebookModerationLogTable)
      .where(eq(facebookModerationLogTable.tenantId, merchant.tenantId));

    const logMap = new Map(logs.map((l) => [l.itemId, l]));

    const items = (feed.data ?? []).flatMap((post) =>
      (post.comments?.data ?? []).map((comment) => ({
        id: comment.id,
        type: "comment" as const,
        postId: post.id,
        postText: post.message ?? post.story ?? "",
        postImage: post.full_picture ?? null,
        authorName: comment.from?.name ?? "مستخدم",
        authorId: comment.from?.id ?? "",
        content: comment.message,
        createdAt: comment.created_time,
        likeCount: comment.like_count ?? 0,
        status: logMap.get(comment.id)?.status ?? "pending",
        aiDraft: logMap.get(comment.id)?.aiDraft ?? null,
      })),
    );

    return res.json({ items, pageName: conn.pageName });
  } catch (err: unknown) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "";
    return res.status(500).json({ error: `فشل جلب التعليقات: ${msg}` });
  }
});

router.get("/facebook/messages", requireAuth, async (req, res) => {
  const merchantId = req.session.merchantId!;
  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    const [conn] = await db
      .select()
      .from(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));

    if (!conn) return res.status(400).json({ error: "Facebook غير مربوط" });

    const convos = (await fbGet(conn.pageId, conn.pageAccessToken, {
      fields:
        "id,participants,updated_time,messages{id,message,from,created_time}",
      limit: "20",
    })) as {
      data: Array<{
        id: string;
        updated_time: string;
        participants?: { data: Array<{ name: string; id: string }> };
        messages?: {
          data: Array<{
            id: string;
            message: string;
            from?: { name: string; id: string };
            created_time: string;
          }>;
        };
      }>;
    };

    const logs = await db
      .select({
        itemId: facebookModerationLogTable.itemId,
        status: facebookModerationLogTable.status,
        aiDraft: facebookModerationLogTable.aiDraft,
      })
      .from(facebookModerationLogTable)
      .where(eq(facebookModerationLogTable.tenantId, merchant.tenantId));

    const logMap = new Map(logs.map((l) => [l.itemId, l]));

    const items = (convos.data ?? []).map((convo) => {
      const msgs = convo.messages?.data ?? [];
      const lastMsg = msgs[0];
      const sender = convo.participants?.data?.find(
        (p) => p.id !== conn.pageId,
      );
      return {
        id: convo.id,
        type: "message" as const,
        authorName: sender?.name ?? lastMsg?.from?.name ?? "مستخدم",
        authorId: sender?.id ?? "",
        content: lastMsg?.message ?? "",
        createdAt: convo.updated_time,
        messageCount: msgs.length,
        status: logMap.get(convo.id)?.status ?? "pending",
        aiDraft: logMap.get(convo.id)?.aiDraft ?? null,
        thread: msgs
          .map((m) => ({
            id: m.id,
            text: m.message,
            from: m.from?.name ?? "",
            isPage: m.from?.id === conn.pageId,
            createdAt: m.created_time,
          }))
          .reverse(),
      };
    });

    return res.json({ items, pageName: conn.pageName });
  } catch (err: unknown) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "";
    return res.status(500).json({ error: `فشل جلب الرسائل: ${msg}` });
  }
});

router.post("/facebook/ai-draft", requireAuth, async (req, res) => {
  const {
    itemId,
    itemType,
    authorName,
    content,
    postContext,
    model = "claude",
  } = req.body as {
    itemId?: string;
    itemType?: string;
    authorName?: string;
    content?: string;
    postContext?: string;
    model?: string;
  };

  if (!content?.trim())
    return res.status(400).json({ error: "محتوى التعليق/الرسالة مطلوب" });

  const merchantId = req.session.merchantId!;
  const aiModel: AiModel = model === "gemini" ? "gemini" : "claude";

  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    const [tenant] = await db
      .select({ name: tenantsTable.name, category: tenantsTable.category })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, merchant.tenantId));

    const categoryLabel =
      tenant?.category === "fashion"
        ? "أزياء"
        : tenant?.category === "cosmetics"
          ? "تجميل"
          : "أزياء وتجميل";
    const itemLabel = itemType === "message" ? "رسالة خاصة" : "تعليق على منشور";

    const system = `أنت مشرف وسائل التواصل الاجتماعي الذكي لمتجر "${tenant?.name ?? "المتجر"}" المتخصص في ${categoryLabel}.
مهمتك كتابة ردود احترافية وودودة على ${itemLabel === "رسالة خاصة" ? "الرسائل الخاصة" : "التعليقات"} بالعربية المصرية الدارجة.`;

    const prompt = `${postContext ? `سياق المنشور الأصلي: "${postContext.slice(0, 300)}"\n\n` : ""}الاسم: ${authorName ?? "عزيزي"}
${itemLabel}: "${content.trim()}"

اكتب رداً مناسباً يلتزم بما يلي:
1. بالعربية الدارجة المصرية (ودود، شخصي، مهني)
2. قصير ومباشر (2-4 أسطر فقط)
3. يعالج نقطة المستخدم بشكل مباشر
4. إذا كان سؤالاً: أجب باختصار وأعرض المساعدة
5. إذا كان شكوى: اعتذر وعرض الحل
6. إذا كان إطراء: اشكر بدفء
7. لا Markdown، نص عادي فقط

الرد المقترح:`;

    const draft = await callAI(aiModel, system, prompt);

    // Save to moderation log
    if (itemId) {
      await db
        .insert(facebookModerationLogTable)
        .values({
          tenantId: merchant.tenantId,
          itemId,
          itemType: itemType ?? "comment",
          authorName: authorName ?? null,
          authorId: null,
          content: content.trim(),
          postContext: postContext ?? null,
          aiDraft: draft.trim(),
          status: "pending",
        })
        .onConflictDoUpdate({
          target: facebookModerationLogTable.itemId,
          set: { aiDraft: draft.trim() },
          where: eq(facebookModerationLogTable.tenantId, merchant.tenantId),
        });
    }

    return res.json({ draft: draft.trim(), model: aiModel });
  } catch (err: unknown) {
    req.log.error(err);
    return res.status(500).json({ error: "فشل توليد الرد، حاول مرة أخرى" });
  }
});

router.post("/facebook/reply", requireAuth, async (req, res) => {
  const { itemId, itemType, replyText, authorName, content, postContext } =
    req.body as {
      itemId?: string;
      itemType?: string;
      replyText?: string;
      authorName?: string;
      content?: string;
      postContext?: string;
    };

  if (!itemId?.trim() || !replyText?.trim()) {
    return res.status(400).json({ error: "معرف العنصر ونص الرد مطلوبان" });
  }

  const merchantId = req.session.merchantId!;

  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    const [conn] = await db
      .select()
      .from(facebookConnectionsTable)
      .where(eq(facebookConnectionsTable.tenantId, merchant.tenantId));

    if (!conn) return res.status(400).json({ error: "Facebook غير مربوط" });

    if (itemType === "message") {
      // Messenger reply
      await fbPost("me/messages", conn.pageAccessToken, {
        recipient: JSON.stringify({ id: itemId }),
        message: JSON.stringify({ text: replyText.trim() }),
      });
    } else {
      // Comment reply
      await fbPost(`${itemId}/comments`, conn.pageAccessToken, {
        message: replyText.trim(),
      });
    }

    // Update log
    await db
      .insert(facebookModerationLogTable)
      .values({
        tenantId: merchant.tenantId,
        itemId,
        itemType: itemType ?? "comment",
        authorName: authorName ?? null,
        authorId: null,
        content: content ?? null,
        postContext: postContext ?? null,
        status: "replied",
        repliedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: facebookModerationLogTable.itemId,
        set: { status: "replied", repliedAt: new Date() },
        where: eq(facebookModerationLogTable.tenantId, merchant.tenantId),
      });

    return res.json({ success: true });
  } catch (err: unknown) {
    req.log.error(err);
    const msg = err instanceof Error ? err.message : "";
    return res.status(500).json({ error: `فشل إرسال الرد: ${msg}` });
  }
});

router.post("/facebook/update-status", requireAuth, async (req, res) => {
  const { itemId, itemType, status, authorName, content } = req.body as {
    itemId?: string;
    itemType?: string;
    status?: string;
    authorName?: string;
    content?: string;
  };

  if (!itemId?.trim() || !status)
    return res.status(400).json({ error: "البيانات ناقصة" });

  const merchantId = req.session.merchantId!;

  try {
    const [merchant] = await db
      .select({ tenantId: merchantsTable.tenantId })
      .from(merchantsTable)
      .where(eq(merchantsTable.id, merchantId));

    if (!merchant?.tenantId)
      return res.status(400).json({ error: "المتجر غير موجود" });

    await db
      .insert(facebookModerationLogTable)
      .values({
        tenantId: merchant.tenantId,
        itemId,
        itemType: itemType ?? "comment",
        authorName: authorName ?? null,
        authorId: null,
        content: content ?? null,
        status: status as "pending" | "replied" | "ignored" | "flagged",
      })
      .onConflictDoUpdate({
        target: facebookModerationLogTable.itemId,
        set: {
          status: status as "pending" | "replied" | "ignored" | "flagged",
        },
        where: eq(facebookModerationLogTable.tenantId, merchant.tenantId),
      });

    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "حدث خطأ" });
  }
});

export default router;
