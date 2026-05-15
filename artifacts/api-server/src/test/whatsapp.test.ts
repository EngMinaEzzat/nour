import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestMerchant, createTestProduct, createTestOrder, cleanupTenant, app } from "./helpers.js";
import { db, whatsappProvidersTable, whatsappMessageLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

describe("WhatsApp Integration", () => {
  let ctx: any;

  beforeEach(async () => {
    ctx = await createTestMerchant({ slug: `wa-test-${Date.now()}` });
  });

  afterEach(async () => {
    if (ctx) await cleanupTenant(ctx.tenantId, ctx.merchantId);
    vi.unstubAllGlobals();
  });

  it("should send a real WhatsApp message when provider is ACTIVE", async () => {
    // 1. Setup ACTIVE provider
    await db.insert(whatsappProvidersTable).values({
      tenantId: ctx.tenantId,
      status: "ACTIVE",
      phoneNumberId: "mock-phone-id",
      accessToken: "mock-token",
    });

    // 2. Setup Order
    const prodRes = await createTestProduct(ctx.agent);
    const orderRes = await createTestOrder(ctx.tenantId, prodRes.body.id);
    const orderId = orderRes.body.id;

    // 3. Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: "wa-msg-123" }]
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // 4. Send message
    const res = await ctx.agent.post("/api/whatsapp/messages/send").send({
      templateCode: "order_confirmed",
      orderId,
      idempotencyKey: `test-key-${Date.now()}`,
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("SENT");
    expect(res.body.rendered).toContain("تم تأكيد");

    // 5. Verify fetch call
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("mock-phone-id/messages"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
      })
    );

    // 6. Verify DB log
    const [log] = await db.select().from(whatsappMessageLogsTable).where(eq(whatsappMessageLogsTable.orderId, orderId));
    expect(log).toBeDefined();
    expect(log.status).toBe("SENT");
    expect(log.providerMessageId).toBe("wa-msg-123");
  });

  it("should return SENT status for mock messages when is_mock_allowed is true", async () => {
    // 1. Setup MOCK provider
    await db.insert(whatsappProvidersTable).values({
      tenantId: ctx.tenantId,
      status: "CONFIGURED_DISABLED",
      isMockAllowed: true,
    });

    const prodRes = await createTestProduct(ctx.agent);
    const orderRes = await createTestOrder(ctx.tenantId, prodRes.body.id);

    const res = await ctx.agent.post("/api/whatsapp/messages/send").send({
      templateCode: "order_confirmation_request",
      orderId: orderRes.body.id,
      idempotencyKey: `mock-key-${Date.now()}`,
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("SENT");
    expect(res.body.isMock).toBe(true);
  });

  it("should return FAILED if provider is not active and mock is not allowed", async () => {
    // No provider setup
    const prodRes = await createTestProduct(ctx.agent);
    const orderRes = await createTestOrder(ctx.tenantId, prodRes.body.id);

    const res = await ctx.agent.post("/api/whatsapp/messages/send").send({
      templateCode: "order_confirmation_request",
      orderId: orderRes.body.id,
      idempotencyKey: `fail-key-${Date.now()}`,
    });

    expect(res.status).toBe(201); // The route still returns 201 because it inserts a FAILED log
    expect(res.body.status).toBe("FAILED");
    expect(res.body.errorMessage).toContain("مزود واتساب غير نشط");
  });

  it("should build legacy order confirmation components when callers omit components", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: "wa-legacy-123" }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendWhatsAppMessage({
      accessToken: "mock-token",
      phoneNumberId: "mock-phone-id",
      toPhone: "01012345678",
      templateName: "order_confirmation",
      customerName: "Ahmed",
      orderId: 123,
      storeName: "Nour Test",
      totalAmount: 500,
    });

    expect(result.success).toBe(true);
    const payload = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(payload.template.components[0].parameters).toEqual([
      { type: "text", text: "Ahmed" },
      { type: "text", text: "123" },
      { type: "text", text: "Nour Test" },
      { type: "text", text: "٥٠٠ ج.م" },
    ]);
  });
});
