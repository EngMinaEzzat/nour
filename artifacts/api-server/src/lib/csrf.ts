import { doubleCsrf } from "csrf-csrf";
import type { Request } from "express";

const isProd = process.env.NODE_ENV === "production";

export const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET ?? "dev-secret-change-in-prod",
  // Use the session ID as the per-request identifier so the token is bound to the session
  getSessionIdentifier: (req: Request) =>
    (req.session?.id as string | undefined) ?? req.ip ?? "anon",
  cookieName: "x-csrf-token",
  cookieOptions: {
    secure: isProd,
    sameSite: "lax" as const,
    httpOnly: true,
    path: "/",
  },
  getCsrfTokenFromRequest: (req: Request) =>
    (req.headers["x-csrf-token"] as string) ?? "",
});

// Webhook paths that are exempt from CSRF (they use HMAC validation instead)
export const CSRF_EXEMPT_PATHS = [
  "/api/paymob/callback",
  "/api/paymob/hmac-verify",
  "/api/paymob/webhook",
  "/api/whatsapp/messages/",
];

export function isCsrfExempt(path: string): boolean {
  return CSRF_EXEMPT_PATHS.some((p) => path.startsWith(p));
}
