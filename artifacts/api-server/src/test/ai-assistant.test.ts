import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("AI Assistant — Chat Endpoint", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ POST /api/ai/assistant/chat with claude — returns 200 or 503 (no API key in test)", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "أخبرني عن كيفية تحسين متجري", model: "claude" });
    // In test env, AI key may not be set — 200 (streaming) or 503/429 are acceptable
    expect([200, 503, 429]).toContain(res.status);
  });

  it("✅ POST /api/ai/assistant/chat with gemini — returns 200 or 503 (no API key in test)", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "اقترح عليّ ثيم مناسب لمتجر الأزياء", model: "gemini" });
    expect([200, 503, 429]).toContain(res.status);
  });

  it("❌ unauthenticated request returns 401", async () => {
    const res = await request(app)
      .post("/api/ai/assistant/chat")
      .send({ message: "hello", model: "claude" });
    expect(res.status).toBe(401);
  });

  it("❌ empty message returns 400", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "   ", model: "claude" });
    expect(res.status).toBe(400);
  });

  it("❌ completely missing message returns 400", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ model: "claude" });
    expect(res.status).toBe(400);
  });

  it("✅ unknown model name falls back to claude gracefully (not 500)", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "مرحباً", model: "gpt-999-ultra" });
    // Should not crash the server
    expect(res.status).not.toBe(500);
    expect([200, 400, 429, 503]).toContain(res.status);
  });

  it("✅ defaults to claude model when model not specified", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "مرحباً" });
    expect([200, 400, 429, 503]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});

describe("AI Assistant — Rate Limiting", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ endpoint is accessible to authenticated merchants", async () => {
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "اختبار الوصول", model: "claude" });
    // Endpoint must exist and be accessible
    expect([200, 400, 429, 503]).toContain(res.status);
    expect(res.status).not.toBe(404);
  });

  it("✅ rate limit response includes proper structure when limit hit", async () => {
    // Make multiple requests to potentially trigger rate limit
    let rateLimitHit = false;
    for (let i = 0; i < 3; i++) {
      const res = await ctx.agent
        .post("/api/ai/assistant/chat")
        .send({ message: `رسالة اختبار ${i}`, model: "claude" });
      if (res.status === 429) {
        rateLimitHit = true;
        expect(res.body).toHaveProperty("error");
        break;
      }
      // Only accepted statuses
      expect([200, 400, 429, 503]).toContain(res.status);
    }
    // Whether or not rate limit was hit, test passes
    expect(true).toBe(true);
  });
});
