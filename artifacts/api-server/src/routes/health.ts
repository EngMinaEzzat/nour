import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isConfigured as isBostaConfigured } from "../lib/bosta";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (req, res) => {
  const response: Record<string, any> = {
    status: "ok",
    components: {
      database: "unknown",
      redis: process.env.REDIS_URL ? "configured" : "not_configured",
      email: process.env.RESEND_API_KEY ? "configured" : "not_configured",
      bosta: isBostaConfigured() ? "configured" : "not_configured",
      paymob: process.env.PAYMOB_HMAC_SECRET ? "configured" : "not_configured",
      ai: process.env.AI_PROVIDER ? "configured" : "not_configured",
    }
  };

  try {
    await db.execute(sql`SELECT 1`);
    response.components.database = "ok";
  } catch (error) {
    req.log.error(error);
    response.components.database = "failed";
    response.status = "error";
    return res.status(503).json(response);
  }

  res.json(response);
});

export default router;
