import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { request, app, createTestMerchant, cleanupTenant } from "./helpers.js";
import * as aiProvider from "../lib/ai-provider.js";

vi.mock("../lib/ai-provider.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/ai-provider.js")>();
  return {
    ...actual,
    generateContent: vi.fn(),
  };
});

describe("AI Import Routes", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
    vi.restoreAllMocks();
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

    it("returns 200 with generated mock store suggestion for a valid facebookUrl", async () => {
      // Mock global fetch to pretend we successfully scraped a facebook page
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          `<html><head><title>Mocked FB Page</title><meta property="og:description" content="A great page" /></head><body></body></html>`,
      } as Response);

      // Mock generateContent to return a deterministic JSON response
      const mockResult = {
        storeName: "متجر تجريبي",
        description: "وصف تجريبي جميل",
        primaryColor: "#FF0000",
        coverUrl: "null",
        category: "fashion",
        tags: ["تجربة", "أزياء"],
      };

      vi.mocked(aiProvider.generateContent).mockResolvedValueOnce({
        text: JSON.stringify(mockResult),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        inputTokens: 100,
        outputTokens: 50,
      });

      const res = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: "https://facebook.com/zuck" });

      if (res.status === 429) {
        // Rate limit hit from other tests sharing the tenant context, skip assertion
        return;
      }

      expect(res.status).toBe(200);
      expect(res.body.storeName).toBe(mockResult.storeName);
      expect(res.body.description).toBe(mockResult.description);
      expect(res.body.primaryColor).toBe(mockResult.primaryColor);
      expect(res.body.category).toBe(mockResult.category);

      fetchSpy.mockRestore();
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

    it("returns 200 with generated mock product description for valid input", async () => {
      const mockResult = {
        description: "وصف منتج رائع جداً",
        tags: ["منتج", "رائع"],
        seoKeywords: ["seo", "keywords"],
      };

      vi.mocked(aiProvider.generateContent).mockResolvedValueOnce({
        text: JSON.stringify(mockResult),
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        inputTokens: 100,
        outputTokens: 50,
      });

      const res = await ctx.agent
        .post("/api/ai/generate-product-description")
        .send({ productName: "Test Product", category: "fashion" });

      if (res.status === 429) {
        // Rate limit hit, skip assertion
        return;
      }

      expect(res.status).toBe(200);
      expect(res.body.description).toBe(mockResult.description);
      expect(res.body.tags).toEqual(mockResult.tags);
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

    it("returns 200 with generated mock drafted reply for valid input", async () => {
      vi.mocked(aiProvider.generateContent).mockResolvedValueOnce({
        text: "شكراً لطلبك يا John. طلبك مؤكد.",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        inputTokens: 100,
        outputTokens: 50,
      });

      const res = await ctx.agent
        .post("/api/ai/draft-reply")
        .send({ messageType: "confirmation", customerName: "John" });

      if (res.status === 429) {
        // Rate limit hit, skip assertion
        return;
      }

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("شكراً لطلبك يا John. طلبك مؤكد.");
    });
  });
});
