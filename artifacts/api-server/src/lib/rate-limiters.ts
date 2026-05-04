import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const isTest = process.env.NODE_ENV === "test";

// 200 requests/minute per IP for public storefront pages
export const storefrontLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تجاوزت الحد المسموح — حاول لاحقاً" },
  keyGenerator: (req: Request) => ipKeyGenerator(req),
});

// 10 requests/minute per IP for checkout (prevent order flooding)
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تجاوزت الحد المسموح للدفع — حاول لاحقاً" },
  keyGenerator: (req: Request) => ipKeyGenerator(req),
});

// 5 requests/hour per tenant for data exports (CPU-heavy)
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تجاوزت الحد المسموح للتصدير — حاول بعد ساعة" },
  keyGenerator: (req: Request) =>
    req.merchantTenantId != null
      ? String(req.merchantTenantId)
      : ipKeyGenerator(req),
});

// 20 requests/hour per tenant for AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً" },
  keyGenerator: (req: Request) =>
    req.merchantTenantId != null
      ? String(req.merchantTenantId)
      : req.session?.merchantId != null
        ? String(req.session.merchantId)
        : ipKeyGenerator(req),
});
