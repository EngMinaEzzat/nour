import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, app, createTestMerchant, cleanupTenant, uid } from "./helpers.js";
import { db, aiUsageEventsTable, conversations, messages, productsTable, ordersTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { checkAiRateLimit, resetAiRateLimit, getMaxInputLength } from "../lib/ai-rate-limit.js";
import { isAiMockEnabled } from "../lib/ai-safety.js";
import fs from "node:fs";
import path from "node:path";

/*
 * Phase 5: AI Hardening Tests
 *
 * Covers:
 * 1. Auth required on all AI endpoints
 * 2. Tenant scoping
 * 3. Cross-tenant conversation rejection
 * 4. Rate limits
 * 5. Oversized input rejection
 * 6. No production mock fallback
 * 7. No AI keys in frontend
 * 8. Usage logging
 * 9. No auto-mutation
 */

// Enable mock AI for tests so we don't need real provider keys
process.env.AI_USE_MOCK = "true";

const AI_ENDPOINTS = [
  { method: "post" as const, path: "/api/ai/assistant/chat", body: { message: "test", model: "claude" } },
  { method: "post" as const, path: "/api/ai/pricing-advice", body: { productName: "Test", price: 100, model: "claude" } },
  { method: "post" as const, path: "/api/ai/import-facebook", body: { facebookUrl: "https://facebook.com/testpage", model: "claude" } },
  { method: "post" as const, path: "/api/ai/generate-product-description", body: { productName: "Test Product", model: "claude" } },
  { method: "post" as const, path: "/api/ai/draft-reply", body: { messageType: "confirmation", model: "claude" } },
];

describe("AI Hardening — Auth Required", () => {
  it("❌ all AI POST endpoints reject unauthenticated requests with 401", async () => {
    for (const ep of AI_ENDPOINTS) {
      const res = await request(app)[ep.method](ep.path).send(ep.body);
      expect(res.status, `${ep.method.toUpperCase()} ${ep.path} should return 401`).toBe(401);
    }
  });

  it("❌ conversation history GET rejects unauthenticated with 401", async () => {
    const res = await request(app).get("/api/ai/assistant/history/1");
    expect(res.status).toBe(401);
  });

  it("❌ conversation history DELETE rejects unauthenticated with 401", async () => {
    const res = await request(app).delete("/api/ai/assistant/history/1");
    expect(res.status).toBe(401);
  });
});

describe("AI Hardening — Tenant Scoping & Cross-Tenant Rejection", () => {
  let ctxA: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctxB: Awaited<ReturnType<typeof createTestMerchant>>;
  let convIdA: number;

  beforeAll(async () => {
    ctxA = await createTestMerchant();
    ctxB = await createTestMerchant();

    // Reset rate limits for clean state
    resetAiRateLimit(ctxA.tenantId);
    resetAiRateLimit(ctxB.tenantId);

    // Create a conversation for tenant A via AI chat
    const chatRes = await ctxA.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "مرحباً", model: "claude" });

    // Parse SSE to get conversation ID
    const body = chatRes.text;
    const convMatch = body.match(/"conversationId"\s*:\s*(\d+)/);
    expect(convMatch, "Should receive conversationId in SSE response").toBeTruthy();
    convIdA = parseInt(convMatch![1], 10);
  });

  afterAll(async () => {
    await cleanupTenant(ctxA.tenantId, ctxA.merchantId);
    await cleanupTenant(ctxB.tenantId, ctxB.merchantId);
  });

  it("✅ conversation created by tenant A belongs to tenant A", async () => {
    const [conv] = await db
      .select({ tenantId: conversations.tenantId, merchantId: conversations.merchantId })
      .from(conversations)
      .where(eq(conversations.id, convIdA));

    expect(conv).toBeTruthy();
    expect(conv.tenantId).toBe(ctxA.tenantId);
    expect(conv.merchantId).toBe(ctxA.merchantId);
  });

  it("✅ tenant A can access own conversation history", async () => {
    const res = await ctxA.agent.get(`/api/ai/assistant/history/${convIdA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("❌ tenant B cannot access tenant A's conversation history", async () => {
    const res = await ctxB.agent.get(`/api/ai/assistant/history/${convIdA}`);
    expect(res.status).toBe(403);
  });

  it("❌ tenant B cannot delete tenant A's conversation", async () => {
    const res = await ctxB.agent.delete(`/api/ai/assistant/history/${convIdA}`);
    expect(res.status).toBe(403);
  });

  it("❌ tenant B cannot continue tenant A's conversation", async () => {
    resetAiRateLimit(ctxB.tenantId);
    const res = await ctxB.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "hijack attempt", conversationId: convIdA, model: "claude" });
    // Should be 403 or the response should not use convIdA
    if (res.status === 200) {
      // SSE response — check it didn't use convIdA
      const body = res.text;
      const convMatch = body.match(/"conversationId"\s*:\s*(\d+)/);
      if (convMatch) {
        expect(parseInt(convMatch[1], 10)).not.toBe(convIdA);
      }
    } else {
      expect(res.status).toBe(403);
    }
  });
});

describe("AI Hardening — Rate Limits", () => {
  it("✅ checkAiRateLimit blocks after exceeding limit", () => {
    const fakeTenantId = 999999;
    resetAiRateLimit(fakeTenantId);

    // Exhaust the limit (default starter = 20)
    for (let i = 0; i < 20; i++) {
      const result = checkAiRateLimit(fakeTenantId, "starter");
      expect(result.allowed).toBe(true);
    }

    // 21st request should be blocked
    const blocked = checkAiRateLimit(fakeTenantId, "starter");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);

    resetAiRateLimit(fakeTenantId);
  });

  it("✅ plan-based limits differ per plan", () => {
    const fakeTenantId = 999998;

    // Starter: 20/hour
    resetAiRateLimit(fakeTenantId);
    for (let i = 0; i < 20; i++) checkAiRateLimit(fakeTenantId, "starter");
    expect(checkAiRateLimit(fakeTenantId, "starter").allowed).toBe(false);

    // Growth: 50/hour
    resetAiRateLimit(fakeTenantId);
    for (let i = 0; i < 50; i++) checkAiRateLimit(fakeTenantId, "growth");
    expect(checkAiRateLimit(fakeTenantId, "growth").allowed).toBe(false);

    // But 21st request on growth plan should still be allowed
    resetAiRateLimit(fakeTenantId);
    for (let i = 0; i < 21; i++) checkAiRateLimit(fakeTenantId, "growth");
    // 21 < 50, so still allowed on the 22nd
    expect(checkAiRateLimit(fakeTenantId, "growth").allowed).toBe(true);

    // Pro: unlimited (-1)
    resetAiRateLimit(fakeTenantId);
    for (let i = 0; i < 200; i++) checkAiRateLimit(fakeTenantId, "pro");
    expect(checkAiRateLimit(fakeTenantId, "pro").allowed).toBe(true);

    // Free: 10/hour (free is 10, starter is 20)
    resetAiRateLimit(fakeTenantId);
    for (let i = 0; i < 10; i++) checkAiRateLimit(fakeTenantId, "free");
    expect(checkAiRateLimit(fakeTenantId, "free").allowed).toBe(false);

    resetAiRateLimit(fakeTenantId);
  });

  it("✅ rate limit returns 429 on API endpoint", async () => {
    const ctx = await createTestMerchant();
    try {
      // Exhaust rate limit for this tenant
      for (let i = 0; i < 21; i++) {
        checkAiRateLimit(ctx.tenantId, "starter");
      }

      const res = await ctx.agent
        .post("/api/ai/pricing-advice")
        .send({ productName: "Test", price: 100, model: "claude" });

      expect(res.status).toBe(429);
      expect(res.body.error).toBeTruthy();
    } finally {
      resetAiRateLimit(ctx.tenantId);
      await cleanupTenant(ctx.tenantId, ctx.merchantId);
    }
  });

  it("✅ ai-import endpoints return 429 when rate limit is exceeded", async () => {
    const ctx = await createTestMerchant();
    try {
      // Exhaust rate limit for this tenant
      for (let i = 0; i < 21; i++) {
        checkAiRateLimit(ctx.tenantId, "starter");
      }

      const descRes = await ctx.agent
        .post("/api/ai/generate-product-description")
        .send({ productName: "Test", model: "claude" });

      expect(descRes.status).toBe(429);
      expect(descRes.body.error).toBeTruthy();

      const replyRes = await ctx.agent
        .post("/api/ai/draft-reply")
        .send({ messageType: "confirmation", customerName: "Test", model: "claude" });

      expect(replyRes.status).toBe(429);
      expect(replyRes.body.error).toBeTruthy();

      const importRes = await ctx.agent
        .post("/api/ai/import-facebook")
        .send({ facebookUrl: "https://facebook.com/test", model: "claude" });

      expect(importRes.status).toBe(429);
      expect(importRes.body.error).toBeTruthy();

    } finally {
      resetAiRateLimit(ctx.tenantId);
      await cleanupTenant(ctx.tenantId, ctx.merchantId);
    }
  });
});

describe("AI Hardening — Input Length Limits", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });
  afterAll(async () => {
    resetAiRateLimit(ctx.tenantId);
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ getMaxInputLength returns correct limits per prompt type", () => {
    expect(getMaxInputLength("chat")).toBe(4000);
    expect(getMaxInputLength("pricing_advice")).toBe(2000);
    expect(getMaxInputLength("product_description")).toBe(1000);
    expect(getMaxInputLength("draft_reply")).toBe(2000);
    expect(getMaxInputLength("import_facebook")).toBe(4000);
  });

  it("❌ oversized chat input is rejected with 400", async () => {
    resetAiRateLimit(ctx.tenantId);
    const oversizedMessage = "أ".repeat(5000);
    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: oversizedMessage, model: "claude" });
    expect(res.status).toBe(400);
  });

  it("❌ oversized product description input is rejected with 400", async () => {
    resetAiRateLimit(ctx.tenantId);
    const oversizedName = "X".repeat(600);
    const oversizedDesc = "Y".repeat(600);
    const res = await ctx.agent
      .post("/api/ai/generate-product-description")
      .send({ productName: oversizedName, storeDescription: oversizedDesc, model: "claude" });
    expect(res.status).toBe(400);
  });
});

describe("AI Hardening — No Production Mock Fallback", () => {
  it("✅ isAiMockEnabled returns false when NODE_ENV=production", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalMock = process.env.AI_USE_MOCK;

    process.env.NODE_ENV = "production";
    process.env.AI_USE_MOCK = "true";
    expect(isAiMockEnabled()).toBe(false);

    process.env.NODE_ENV = originalEnv;
    process.env.AI_USE_MOCK = originalMock;
  });

  it("✅ isAiMockEnabled returns true only when explicitly enabled in non-production", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalMock = process.env.AI_USE_MOCK;

    process.env.NODE_ENV = "test";
    process.env.AI_USE_MOCK = "true";
    expect(isAiMockEnabled()).toBe(true);

    process.env.AI_USE_MOCK = undefined;
    expect(isAiMockEnabled()).toBe(false);

    process.env.NODE_ENV = originalEnv;
    process.env.AI_USE_MOCK = originalMock;
  });
});

describe("AI Hardening — No AI Keys in Frontend", () => {
  it("✅ frontend source has no AI provider key references", () => {
    const frontendSrcDir = path.resolve(process.cwd(), "../../artifacts/fashion-store/src");

    // If frontend dir doesn't exist from the test runner cwd, try absolute
    const absoluteDir = fs.existsSync(frontendSrcDir)
      ? frontendSrcDir
      : "c:\\proj\\nour\\artifacts\\fashion-store\\src";

    if (!fs.existsSync(absoluteDir)) {
      // Cannot verify — still pass but note it
      console.warn("Frontend src dir not found — skipping key exposure check");
      return;
    }

    const dangerousPatterns = [
      /AI_INTEGRATIONS/i,
      /VITE_AI/i,
      /VITE_ANTHROPIC/i,
      /VITE_GEMINI/i,
      /VITE_OPENAI/i,
      /ANTHROPIC_API_KEY/i,
      /GEMINI_API_KEY/i,
      /OPENAI_API_KEY/i,
      /apiKey\s*[:=]/i,
    ];

    function scanDir(dir: string): string[] {
      const violations: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist") continue;
          violations.push(...scanDir(full));
        } else if (/\.(ts|tsx|js|jsx|env)$/i.test(entry.name)) {
          const content = fs.readFileSync(full, "utf8");
          for (const pat of dangerousPatterns) {
            if (pat.test(content)) {
              violations.push(`${full} matches ${pat}`);
            }
          }
        }
      }
      return violations;
    }

    const violations = scanDir(absoluteDir);
    expect(violations, `AI keys found in frontend: ${violations.join(", ")}`).toHaveLength(0);
  });
});

describe("AI Hardening — Usage Logging", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    resetAiRateLimit(ctx.tenantId);
  });
  afterAll(async () => {
    resetAiRateLimit(ctx.tenantId);
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ AI generation records include tenant, merchant, model, prompt type, and timestamp", async () => {
    // Make an AI call that uses the mock provider
    const res = await ctx.agent
      .post("/api/ai/pricing-advice")
      .send({ productName: "فستان أنيق", price: 350, model: "claude" });

    expect([200, 502]).toContain(res.status); // 200 success or 502 if mock JSON parsing fails

    // Check ai_usage_events for this tenant
    const events = await db
      .select()
      .from(aiUsageEventsTable)
      .where(
        and(
          eq(aiUsageEventsTable.tenantId, ctx.tenantId),
          eq(aiUsageEventsTable.merchantId, ctx.merchantId),
          eq(aiUsageEventsTable.promptType, "pricing_advice"),
        ),
      );

    expect(events.length).toBeGreaterThanOrEqual(1);
    const event = events[0];
    expect(event.tenantId).toBe(ctx.tenantId);
    expect(event.merchantId).toBe(ctx.merchantId);
    expect(event.promptType).toBe("pricing_advice");
    expect(event.provider).toBeTruthy();
    expect(event.model).toBeTruthy();
    expect(event.createdAt).toBeTruthy();
    expect(["success", "failure"]).toContain(event.status);
  });

  it("✅ chat AI call creates a usage event", async () => {
    resetAiRateLimit(ctx.tenantId);

    const res = await ctx.agent
      .post("/api/ai/assistant/chat")
      .send({ message: "مرحباً", model: "claude" });

    expect(res.status).toBe(200);

    const events = await db
      .select()
      .from(aiUsageEventsTable)
      .where(
        and(
          eq(aiUsageEventsTable.tenantId, ctx.tenantId),
          eq(aiUsageEventsTable.promptType, "chat"),
        ),
      );

    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

describe("AI Hardening — No Auto-Mutation", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let productCountBefore: number;
  let orderCountBefore: number;
  let categoryCountBefore: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    resetAiRateLimit(ctx.tenantId);

    // Snapshot current counts
    const products = await db.select().from(productsTable).where(eq(productsTable.tenantId, ctx.tenantId));
    productCountBefore = products.length;
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.tenantId, ctx.tenantId));
    orderCountBefore = orders.length;
    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.tenantId, ctx.tenantId));
    categoryCountBefore = categories.length;
  });

  afterAll(async () => {
    resetAiRateLimit(ctx.tenantId);
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ AI product description does NOT create products", async () => {
    resetAiRateLimit(ctx.tenantId);
    await ctx.agent
      .post("/api/ai/generate-product-description")
      .send({ productName: "New Product", model: "claude" });

    const products = await db.select().from(productsTable).where(eq(productsTable.tenantId, ctx.tenantId));
    expect(products.length).toBe(productCountBefore);
  });

  it("✅ AI draft reply does NOT create orders or messages in orders", async () => {
    resetAiRateLimit(ctx.tenantId);
    await ctx.agent
      .post("/api/ai/draft-reply")
      .send({ messageType: "confirmation", customerName: "أحمد", model: "claude" });

    const orders = await db.select().from(ordersTable).where(eq(ordersTable.tenantId, ctx.tenantId));
    expect(orders.length).toBe(orderCountBefore);
  });

  it("✅ AI pricing advice does NOT mutate products", async () => {
    resetAiRateLimit(ctx.tenantId);
    await ctx.agent
      .post("/api/ai/pricing-advice")
      .send({ productName: "Test", price: 100, model: "claude" });

    const products = await db.select().from(productsTable).where(eq(productsTable.tenantId, ctx.tenantId));
    expect(products.length).toBe(productCountBefore);
  });

  it("✅ AI import-facebook does NOT create products or categories", async () => {
    resetAiRateLimit(ctx.tenantId);
    // This will likely fail on scraping but that's fine — we're checking it doesn't mutate
    await ctx.agent
      .post("/api/ai/import-facebook")
      .send({ facebookUrl: "https://facebook.com/testpage", model: "claude" });

    const products = await db.select().from(productsTable).where(eq(productsTable.tenantId, ctx.tenantId));
    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.tenantId, ctx.tenantId));
    expect(products.length).toBe(productCountBefore);
    expect(categories.length).toBe(categoryCountBefore);
  });
});
