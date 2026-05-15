import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
if (process.env.NODE_ENV === "production" && !process.env.EMAIL_FROM) {
  console.warn(
    "[Email Warning]: EMAIL_FROM is not set. Defaulting to 'onboarding@resend.dev', " +
    "which only allows sending emails to your own account email. " +
    "Please configure a verified domain in Resend and set EMAIL_FROM."
  );
}
export type EmailSendResult =
  | { sent: true; id: string }
  | { sent: false; reason: "missing_api_key" | "provider_error" };
const DEFAULT_FROM_NAME = "نور";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email Warning]: RESEND_API_KEY is not configured; email was not sent");
    return { sent: false, reason: "missing_api_key" };
  }

  const from = params.fromName
    ? `${params.fromName} <${FROM_ADDRESS}>`
    : `${DEFAULT_FROM_NAME} <${FROM_ADDRESS}>`;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  });

  if (error) {
    console.error("[Email Error]:", error);
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true, id: data?.id ?? "" };
}

function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9f5f0;font-family:'Cairo','Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#8b1a2e;padding:28px 48px;text-align:center;">
              <span style="font-size:38px;font-weight:900;color:#fff;letter-spacing:-1px;">نور</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #f0ebe5;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">منصة نور للتجارة الإلكترونية المصرية</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  to: string,
  storeName: string,
  storeUrl: string,
): Promise<EmailSendResult> {
  return sendEmail({
    to,
    subject: `مرحباً بك في نور 🎉 — متجرك "${storeName}" جاهز!`,
    html: emailLayout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a1a;">أهلاً وسهلاً! 🎉</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.8;">
        تم إنشاء متجرك <strong style="color:#8b1a2e;">${storeName}</strong> بنجاح على منصة نور.
        يمكنك الآن مشاركة رابط متجرك مع عملائك والبدء في البيع فوراً.
      </p>

      <div style="background:#fdf8f5;border:1px solid #f0e8e0;border-radius:16px;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 8px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;">رابط متجرك</p>
        <a href="${storeUrl}"
           style="font-size:17px;font-weight:700;color:#8b1a2e;text-decoration:none;word-break:break-all;">
          ${storeUrl}
        </a>
      </div>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="${storeUrl}"
           style="display:inline-block;background:#8b1a2e;color:#fff;text-decoration:none;padding:14px 40px;border-radius:14px;font-size:16px;font-weight:700;">
          زيارة متجري الآن ←
        </a>
      </div>

      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a1a1a;">الخطوات التالية:</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;vertical-align:top;">
            <span style="display:inline-block;background:#8b1a2e;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-left:10px;">١</span>
            <span style="font-size:14px;color:#444;">أضف منتجاتك الأولى من لوحة التحكم</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;">
            <span style="display:inline-block;background:#8b1a2e;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-left:10px;">٢</span>
            <span style="font-size:14px;color:#444;">شارك رابط متجرك على وسائل التواصل الاجتماعي</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;">
            <span style="display:inline-block;background:#8b1a2e;color:#fff;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-left:10px;">٣</span>
            <span style="font-size:14px;color:#444;">فعّل Paymob لاستقبال المدفوعات أونلاين</span>
          </td>
        </tr>
      </table>
    `),
  });
}

export async function sendNewMerchantNotification(
  adminEmails: string[],
  storeName: string,
  storeUrl: string,
  merchantEmail: string,
  city: string | null | undefined,
): Promise<void> {
  if (adminEmails.length === 0) return;

  const now = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "full",
    timeStyle: "short",
  });

  await sendEmail({
    to: adminEmails,
    subject: `🛍️ متجر جديد انضم إلى نور — ${storeName}`,
    html: emailLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;">متجر جديد على المنصة 🎉</h1>
      <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">
        انضم تاجر جديد للتو إلى منصة نور.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f5;border:1px solid #f0e8e0;border-radius:16px;padding:4px;">
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f0e8e0;">
            <span style="font-size:12px;color:#999;display:block;margin-bottom:2px;">اسم المتجر</span>
            <span style="font-size:16px;font-weight:700;color:#1a1a1a;">${storeName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f0e8e0;">
            <span style="font-size:12px;color:#999;display:block;margin-bottom:2px;">رابط المتجر</span>
            <a href="${storeUrl}" style="font-size:14px;color:#8b1a2e;text-decoration:none;">${storeUrl}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f0e8e0;">
            <span style="font-size:12px;color:#999;display:block;margin-bottom:2px;">البريد الإلكتروني</span>
            <span style="font-size:14px;color:#444;">${merchantEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;border-bottom:1px solid #f0e8e0;">
            <span style="font-size:12px;color:#999;display:block;margin-bottom:2px;">المدينة</span>
            <span style="font-size:14px;color:#444;">${city ?? "غير محددة"}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px;">
            <span style="font-size:12px;color:#999;display:block;margin-bottom:2px;">وقت التسجيل</span>
            <span style="font-size:14px;color:#444;">${now}</span>
          </td>
        </tr>
      </table>

      <div style="text-align:center;margin:28px 0 0;">
        <a href="${storeUrl}"
           style="display:inline-block;background:#8b1a2e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:15px;font-weight:700;">
          عرض المتجر ←
        </a>
      </div>
    `),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<{ sent: boolean }> {
  const res = await sendEmail({
    to,
    subject: "إعادة تعيين كلمة المرور — نور",
    html: emailLayout(`
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a1a;">إعادة تعيين كلمة المرور</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
        تلقّينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك على منصة نور.
        انقر على الزر أدناه لاختيار كلمة مرور جديدة.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background:#8b1a2e;color:#fff;text-decoration:none;padding:14px 40px;border-radius:14px;font-size:16px;font-weight:700;">
          إعادة تعيين كلمة المرور
        </a>
      </div>
      <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
        هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.
      </p>
    `),
  });

  return { sent: res.sent };
}

export async function sendSubscriptionReminderEmail(
  to: string,
  storeName: string,
  daysLeft: number,
  renewUrl: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: `⏰ اشتراكك في نور ينتهي خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`,
    html: emailLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;">اشتراكك على وشك الانتهاء</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
        مرحبًا، اشتراك متجر <strong>${storeName}</strong> على منصة نور
        سينتهي خلال <strong>${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}</strong> فقط.
        جدّد الآن حتى لا تنقطع خدمتك.
      </p>
      <div style="background:#fff8f0;border:1px solid #f0d8b0;border-radius:14px;padding:18px 22px;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#a05a00;font-weight:600;">
          ⚠️ إذا لم يتم التجديد، سيتوقف متجرك تلقائيًا عن الاستقبال بعد انتهاء المدة.
        </p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewUrl}"
           style="display:inline-block;background:#8b1a2e;color:#fff;text-decoration:none;padding:14px 40px;border-radius:14px;font-size:16px;font-weight:700;">
          تجديد الاشتراك الآن
        </a>
      </div>
    `),
  });
}

export async function sendSubscriptionSuspendedEmail(
  to: string,
  storeName: string,
  reactivateUrl: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: `🔴 تم إيقاف متجرك مؤقتًا — ${storeName}`,
    html: emailLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a1a;">تم إيقاف متجرك مؤقتًا</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
        نأسف لإبلاغك بأن متجر <strong>${storeName}</strong> على منصة نور قد تم إيقافه مؤقتًا
        بسبب انتهاء فترة الاشتراك.
      </p>
      <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.7;">
        بياناتك ومنتجاتك محفوظة بأمان. جدّد اشتراكك لإعادة تفعيل متجرك فورًا.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${reactivateUrl}"
           style="display:inline-block;background:#8b1a2e;color:#fff;text-decoration:none;padding:14px 40px;border-radius:14px;font-size:16px;font-weight:700;">
          إعادة تفعيل المتجر
        </a>
      </div>
    `),
  });
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  customerName: string;
  orderId: number;
  storeName: string;
  totalAmount: number;
  items: { name: string; quantity: number }[];
  merchantEmail?: string;
}): Promise<void> {
  const customerName = escapeHtml(params.customerName);
  const itemsHtml = params.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0ebe5;">
        <span style="font-size:14px;color:#1a1a1a;font-weight:600;">${escapeHtml(item.name)}</span>
        <span style="font-size:13px;color:#888;margin-right:8px;">× ${item.quantity}</span>
      </td>
    </tr>
  `,
    )
    .join("");

  await sendEmail({
    to: params.to,
    fromName: params.storeName,
    replyTo: params.merchantEmail,
    subject: `✅ تم استلام طلبك من ${params.storeName} (#${params.orderId})`,
    html: emailLayout(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1a1a1a;">شكراً لطلبك! 😍</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.8;">
        مرحباً ${customerName}، لقد استلمنا طلبك رقم <strong>#${params.orderId}</strong> وسنقوم بتجهيزه لك في أقرب وقت.
      </p>

      <div style="background:#fdf8f5;border:1px solid #f0e8e0;border-radius:16px;padding:24px;margin:0 0 28px;">
        <p style="margin:0 0 16px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:700;">ملخص الطلب</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemsHtml}
          <tr>
            <td style="padding:16px 0 0;text-align:left;">
              <span style="font-size:14px;color:#888;margin-left:12px;">الإجمالي:</span>
              <span style="font-size:20px;font-weight:900;color:#8b1a2e;">${params.totalAmount.toLocaleString("ar-EG")} ج.م</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0;font-size:14px;color:#666;text-align:center;">
        إذا كان لديك أي استفسار بخصوص الطلب، يمكنك الرد مباشرة على هذا البريد.
      </p>
    `),
  });
}
