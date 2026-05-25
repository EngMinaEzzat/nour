import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("AI Import Routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  describe("POST /api/ai/import-facebook", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: "https://facebook.com/test" });
      expect(res.status).toBe(401);
    });

    it("returns 400 when facebookUrl is omitted", async () => {
      const res = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("facebookUrl مطلوب");
    });

    it("returns 400 when facebookUrl is not a Facebook/Instagram URL", async () => {
      const res = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: "https://example.com/test" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Only Facebook or Instagram URLs are allowed");
    });

    it("returns 400 when facebookUrl exceeds the maximum allowed length (4000)", async () => {
      const veryLongUrl = "https://facebook.com/" + "a".repeat(4001);
      const res = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: veryLongUrl });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Input is too long");
    });

    it("returns an acceptable AI processing status for a valid facebookUrl", async () => {
      // It might return 422 if the mock page can't be scraped in the test environment,
      // or 200, 429, 502, 503 if the scraping succeeds and hits the AI generation.
      const res = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: "https://facebook.com/zuck" });
      expect([200, 429, 422, 502, 503]).toContain(res.status);
    });
  });

  describe("POST /api/ai/generate-product-description", () => {
    it("returns 400 when productName is omitted", async () => {
      const res = await ctx.agent
        .post("/api/ai/generate-product-description")
        .send({ category: "fashion" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("اسم المنتج مطلوب");
    });

    it("returns 400 when combined input exceeds the maximum length (1000)", async () => {
      const veryLongName = "Product " + "A".repeat(1001);
      const res = await ctx.agent
        .post("/api/ai/generate-product-description")
        .send({ productName: veryLongName, category: "fashion" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("المدخلات طويلة جداً");
    });

    it("returns an acceptable AI processing status for valid input", async () => {
      const res = await ctx.agent
        .post("/api/ai/generate-product-description")
        .send({ productName: "Test Product", category: "fashion" });
      expect([200, 429, 502, 503]).toContain(res.status);
    });
  });

  describe("POST /api/ai/draft-reply", () => {
    it("returns 400 when messageType is omitted", async () => {
      const res = await ctx.agent
        .post("/api/ai/draft-reply")
        .send({ customerName: "John" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("نوع الرسالة مطلوب");
    });

    it("returns 400 when combined input exceeds the maximum length (2000)", async () => {
      const veryLongName = "John " + "A".repeat(2001);
      const res = await ctx.agent
        .post("/api/ai/draft-reply")
        .send({ messageType: "confirmation", customerName: veryLongName });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("المدخلات طويلة جداً");
    });

    it("returns an acceptable AI processing status for valid input", async () => {
      const res = await ctx.agent
        .post("/api/ai/draft-reply")
        .send({ messageType: "confirmation", customerName: "John" });
      expect([200, 429, 503]).toContain(res.status);
    });
  });
});
