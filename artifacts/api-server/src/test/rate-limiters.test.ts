import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

describe("Rate Limiters", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("checkoutLimiter allows up to 10 requests and blocks the 11th", async () => {
    // Force NODE_ENV to something other than 'test' so `isTest` is false.
    // The rate limiters use `skip: () => isTest`, so we must ensure `isTest` is false
    // before importing the file.
    process.env.NODE_ENV = "production";

    const { checkoutLimiter } = await import("../lib/rate-limiters.js");

    const app = express();
    app.set("trust proxy", 1);
    app.post("/checkout", checkoutLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    const ip = "192.168.1.100";

    // First 10 requests should succeed
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/checkout")
        .set("X-Forwarded-For", ip);
      expect(res.status).toBe(200);
    }

    // 11th request should be blocked
    const resBlocked = await request(app)
      .post("/checkout")
      .set("X-Forwarded-For", ip);
    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body).toEqual({ error: "تجاوزت الحد المسموح للدفع — حاول لاحقاً" });
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
});
