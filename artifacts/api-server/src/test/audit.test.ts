import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant, type TestCtx } from "./helpers.js";
import { db } from "@workspace/db";
import { tenantAuditEventsTable } from "@workspace/db";

describe("Audit Routes", () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("should get audit events for merchant", async () => {
    await db.insert(tenantAuditEventsTable).values({
      tenantId: ctx.tenantId,
      eventType: "product_deleted",
      summary: "Product deleted",
    });

    const res = await ctx.agent.get("/api/audit/events/my");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].eventType).toBe("product_deleted");
    expect(res.body[0].summary).toBe("Product deleted");
  });
});
