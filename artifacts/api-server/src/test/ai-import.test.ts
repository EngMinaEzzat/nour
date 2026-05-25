import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant } from "./helpers.js";
import * as aiProvider from "../lib/ai-provider.js";
import { resetAiRateLimit } from "../lib/ai-rate-limit.js";

// Enable mock AI for tests
process.env.AI_USE_MOCK = "true";

describe("AI Import Routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { vi.restoreAllMocks(); await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("❌ returns 502 when AI response does not contain valid JSON for product description", async () => {
    resetAiRateLimit(ctx.tenantId);

    // Mock the generateContent function to return malformed/invalid JSON
    vi.spyOn(aiProvider, "generateContent").mockResolvedValueOnce({
      text: "Sorry, I am not able to generate JSON. This is plain text.",
      provider: "openai",
      model: "gpt-4o-mini",
    });

    const res = await ctx.agent
      .post("/api/ai/generate-product-description")
      .send({ productName: "Test Product", model: "openai" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("فشل توليد الوصف، حاول مرة أخرى");
  });
});
