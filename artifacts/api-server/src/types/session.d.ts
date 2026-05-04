import "express-session";
import "express";

declare module "express-session" {
  interface SessionData {
    merchantId: number;
  }
}

declare module "express" {
  interface Request {
    merchantRole?: string;
    merchantTenantId?: number;
  }
}
