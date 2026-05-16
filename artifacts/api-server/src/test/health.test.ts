import { describe, it, expect } from "vitest";
import { request, app } from "./helpers.js";

describe("Health & Readiness Endpoints", () => {
  it("✅ GET /api/healthz returns 200 ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("✅ GET /api/readyz returns 200 ok and checks database", async () => {
    const res = await request(app).get("/api/readyz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.components.database).toBe("ok");
    
    // Check that secrets are not leaked
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain("sk_test");
    expect(bodyStr).not.toContain("HMAC");
  });
});