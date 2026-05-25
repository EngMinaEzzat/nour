import "express-session";

declare module "express-session" {
  interface SessionData {
    merchantId?: number;
    customerId?: number;
    isPlatformAdmin?: boolean;
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
