import "express-session";

declare module "express-session" {
  interface SessionData {
    merchantId?: number;
    customerId?: number;
    isPlatformAdmin?: boolean;
    currentChallenge?: string;
    passkeyLoginEmail?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      merchantRole?: string;
      merchantTenantId?: number;
    }
  }
}

export {};
