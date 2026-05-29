import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

describe("Rate Limiters", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("✅ storefrontLimiter limits requests after max requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { storefrontLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/storefront", storefrontLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    for (let i = 0; i < 200; i++) {
      const res = await agent.get("/storefront").set("X-Forwarded-For", "1.2.3.4");
      expect(res.status).toBe(200);
    }

    const res = await agent.get("/storefront").set("X-Forwarded-For", "1.2.3.4");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "تجاوزت الحد المسموح — حاول لاحقاً" });

    // Different IP should be allowed
    const diffIpRes = await agent.get("/storefront").set("X-Forwarded-For", "4.3.2.1");
    expect(diffIpRes.status).toBe(200);
  });

  it("✅ checkoutLimiter limits requests after max requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { checkoutLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/checkout", checkoutLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    for (let i = 0; i < 10; i++) {
      const res = await agent.get("/checkout").set("X-Forwarded-For", "1.2.3.4");
      expect(res.status).toBe(200);
    }

    const res = await agent.get("/checkout").set("X-Forwarded-For", "1.2.3.4");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "تجاوزت الحد المسموح للدفع — حاول لاحقاً" });

    // Different IP should be allowed
    const diffIpRes = await agent.get("/checkout").set("X-Forwarded-For", "4.3.2.1");
    expect(diffIpRes.status).toBe(200);
  });

  it("checkoutLimiter does not block requests in test environment", async () => {
    process.env.NODE_ENV = "test";

    const { checkoutLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set("trust proxy", 1);
    app.post("/checkout", checkoutLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    const ip = "192.168.1.101";

    // All requests should succeed because it's skipped in 'test'
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post("/checkout")
        .set("X-Forwarded-For", ip);
      expect(res.status).toBe(200);
    }
  });

  it("checkoutLimiter blocks IP independently", async () => {
    process.env.NODE_ENV = "production";

    const { checkoutLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set("trust proxy", 1);
    app.post("/checkout", checkoutLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    const ip1 = "192.168.1.100";
    const ip2 = "192.168.1.102";

    // First 10 requests from ip1 should succeed
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/checkout")
        .set("X-Forwarded-For", ip1);
    }

    // 11th request from ip1 should be blocked
    const resBlocked = await request(app)
      .post("/checkout")
      .set("X-Forwarded-For", ip1);
    expect(resBlocked.status).toBe(429);

    // Request from ip2 should succeed
    const resIp2 = await request(app)
        .post("/checkout")
        .set("X-Forwarded-For", ip2);
    expect(resIp2.status).toBe(200);
  });

  it("✅ exportLimiter limits requests after max requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { exportLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/export", (req, res, next) => {
      // simulate middleware attaching merchantTenantId
      if (req.headers['x-tenant-id']) {
        (req as any).merchantTenantId = req.headers['x-tenant-id'];
      }
      next();
    }, exportLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    // Test with tenant ID
    for (let i = 0; i < 5; i++) {
      const res = await agent.get("/export").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-1");
      expect(res.status).toBe(200);
    }

    let res = await agent.get("/export").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-1");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "تجاوزت الحد المسموح للتصدير — حاول بعد ساعة" });

    // Different tenant should be allowed, even on the same IP
    const diffTenantRes = await agent.get("/export").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-2");
    expect(diffTenantRes.status).toBe(200);
  });

  it("✅ exportLimiter uses IP fallback if no tenantId", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { exportLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/export", exportLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    for (let i = 0; i < 5; i++) {
      const res = await agent.get("/export").set("X-Forwarded-For", "5.5.5.5");
      expect(res.status).toBe(200);
    }

    const res = await agent.get("/export").set("X-Forwarded-For", "5.5.5.5");
    expect(res.status).toBe(429);

    const diffIpRes = await agent.get("/export").set("X-Forwarded-For", "6.6.6.6");
    expect(diffIpRes.status).toBe(200);
  });

  it("✅ aiLimiter limits requests after max requests", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { aiLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/ai", aiLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    // No session/tenant ID -> uses IP
    for (let i = 0; i < 120; i++) {
      const res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4");
      expect(res.status).toBe(200);
    }

    const res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "تجاوزت الحد المسموح للذكاء الاصطناعي — حاول لاحقاً" });

    // Different IP -> Allowed
    const diffIpRes = await agent.get("/ai").set("X-Forwarded-For", "4.3.2.1");
    expect(diffIpRes.status).toBe(200);
  });

  it("✅ aiLimiter limits based on tenantId if available", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { aiLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/ai", (req, res, next) => {
      if (req.headers['x-tenant-id']) {
        (req as any).merchantTenantId = req.headers['x-tenant-id'];
      }
      next();
    }, aiLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    for (let i = 0; i < 120; i++) {
      const res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-1");
      expect(res.status).toBe(200);
    }

    // Same IP and Tenant -> Blocked
    let res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-1");
    expect(res.status).toBe(429);

    // Different IP, Same Tenant -> Blocked (Tenant limit takes precedence)
    res = await agent.get("/ai").set("X-Forwarded-For", "9.9.9.9").set("x-tenant-id", "tenant-1");
    expect(res.status).toBe(429);

    // Different Tenant -> Allowed
    const diffTenantRes = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-tenant-id", "tenant-2");
    expect(diffTenantRes.status).toBe(200);
  });

  it("✅ aiLimiter limits based on session merchantId if tenantId is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { aiLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set('trust proxy', 1);
    app.get("/ai", (req, res, next) => {
      if (req.headers['x-merchant-id']) {
        (req as any).session = { merchantId: req.headers['x-merchant-id'] };
      }
      next();
    }, aiLimiter, (req, res) => {
      res.status(200).json({ ok: true });
    });

    const agent = request(app);

    for (let i = 0; i < 120; i++) {
      const res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-merchant-id", "merchant-1");
      expect(res.status).toBe(200);
    }

    // Same Merchant -> Blocked
    let res = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-merchant-id", "merchant-1");
    expect(res.status).toBe(429);

    // Different IP, Same Merchant -> Blocked
    res = await agent.get("/ai").set("X-Forwarded-For", "9.9.9.9").set("x-merchant-id", "merchant-1");
    expect(res.status).toBe(429);

    // Different Merchant -> Allowed
    const diffMerchantRes = await agent.get("/ai").set("X-Forwarded-For", "1.2.3.4").set("x-merchant-id", "merchant-2");
    expect(diffMerchantRes.status).toBe(200);
  });
});
