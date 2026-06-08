import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@workspace/db";
import { ordersTable, contactAttemptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createTestMerchant, createTestProduct, createTestOrder, cleanupTenant, unauthAgent } from "./helpers";

describe("Follow Up Queue API", () => {
  let ctx: any;

  beforeEach(async () => {
    ctx = await createTestMerchant();
  });

  afterEach(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("should fetch follow up queue items without N+1 problem", async () => {
    const p = await createTestProduct(ctx.agent);

    // Create several orders
    const now = new Date();
    const twoHoursAndOneMinuteAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000) - (60 * 1000));

    // Create 3 orders
    for (let i = 0; i < 3; i++) {
        const orderRes = await createTestOrder(ctx.tenantId, p.body.id);

        // Update order status to pending and creation date to trigger follow up rule
        await db.update(ordersTable)
            .set({
                status: "pending",
                createdAt: twoHoursAndOneMinuteAgo
            })
            .where(eq(ordersTable.id, orderRes.body.id));

        // Insert some contact attempts for some orders
        if (i > 0) {
            await db.insert(contactAttemptsTable).values({
                tenantId: ctx.tenantId,
                merchantId: ctx.merchantId,
                orderId: orderRes.body.id,
                method: "phone",
                createdAt: new Date(),
            });
        }
    }

    const res = await ctx.agent.get("/api/follow-up/queue");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
  });
});
