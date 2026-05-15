const WA_BASE = "https://graph.facebook.com/v18.0";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";

export function isConfigured(): boolean {
  return !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/* ─── Template builders ─── */

export function buildOrderConfirmationMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
  totalAmount: number;
  items: { name: string; quantity: number }[];
  trackingNumber?: string;
}): string {
  const itemsList = params.items.map((i) => `• ${i.name} (${i.quantity}×)`).join("\n");
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `✅ تم تأكيد طلبك من *${params.storeName}*\n`;
  msg += `🔢 رقم الطلب: *#${params.orderId}*\n\n`;
  msg += `🛍️ المنتجات:\n${itemsList}\n\n`;
  msg += `💰 الإجمالي: *${params.totalAmount.toLocaleString("ar-EG")} ج.م*\n`;
  if (params.trackingNumber) msg += `📦 رقم التتبع: *${params.trackingNumber}*\n`;
  msg += `\nسيتم التواصل معك قريباً لتحديد موعد التوصيل. شكراً لثقتك! 🌟`;
  return msg;
}

export function buildDispatchedMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
  trackingNumber?: string;
}): string {
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `🚚 طلبك من *${params.storeName}* في الطريق إليك!\n`;
  msg += `🔢 رقم الطلب: *#${params.orderId}*\n`;
  if (params.trackingNumber) msg += `📦 رقم التتبع: *${params.trackingNumber}*\n`;
  msg += `\nسيصلك الطلب خلال 1-3 أيام عمل. شكراً! 🌟`;
  return msg;
}

export function buildShippingUpdateMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
  trackingNumber?: string;
  statusAr: string;
}): string {
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `📦 تحديث على طلبك من *${params.storeName}*\n`;
  msg += `🔢 رقم الطلب: *#${params.orderId}*\n`;
  msg += `📌 الحالة: *${params.statusAr}*\n`;
  if (params.trackingNumber) msg += `🔍 رقم التتبع: *${params.trackingNumber}*\n`;
  msg += `\nشكراً لثقتك! 🌟`;
  return msg;
}

export function buildCancelledMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
  reason?: string;
}): string {
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `❌ تم إلغاء طلبك #${params.orderId} من *${params.storeName}*\n`;
  if (params.reason) msg += `السبب: ${params.reason}\n`;
  msg += `\nللاستفسار تواصل معنا على نفس هذا الرقم. نعتذر عن أي إزعاج.`;
  return msg;
}

export function buildDeliveryFollowUpMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
}): string {
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `🌟 آملين إن طلبك #${params.orderId} من *${params.storeName}* وصلك بخير!\n\n`;
  msg += `نتمنى تكون راضي عن المنتج — لو عندك أي ملاحظة أو استفسار، إحنا هنا 💪`;
  return msg;
}

export function buildReturnExchangeMessage(params: {
  customerName: string;
  orderId: number;
  storeName: string;
}): string {
  let msg = `مرحباً ${params.customerName} 👋\n\n`;
  msg += `🔄 بخصوص طلب الإرجاع/الاستبدال لطلب #${params.orderId} من *${params.storeName}*\n\n`;
  msg += `سيتواصل معك فريقنا خلال 24-48 ساعة لإتمام الإجراءات. شكراً لتفهمك! 🙏`;
  return msg;
}

/* ─── Core send function (used by whatsapp route with logging) ─── */

export async function sendWhatsAppMessage(params: {
  accessToken: string;
  phoneNumberId: string;
  toPhone: string;
  templateName: string;
  languageCode?: string;
  components: Array<{
    type: "body" | "header" | "button";
    parameters: Array<{ type: "text"; text: string }>;
  }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const to = normalizePhone(params.toPhone);

  try {
    const res = await fetch(`${WA_BASE}/${params.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? "ar" },
          components: params.components,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      return { success: false, error: err.error?.message ?? "WhatsApp send failed" };
    }

    const data = await res.json() as { messages?: [{ id: string }] };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ─── Generic text message send (used for automation rules) ─── */
export async function sendWhatsAppText(params: {
  accessToken: string;
  phoneNumberId: string;
  toPhone: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const to = normalizePhone(params.toPhone);

  try {
    const res = await fetch(`${WA_BASE}/${params.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: params.text },
      }),
    });

    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      return { success: false, error: err.error?.message ?? "WhatsApp send failed" };
    }

    const data = await res.json() as { messages?: [{ id: string }] };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
