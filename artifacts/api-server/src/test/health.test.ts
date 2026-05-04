import { describe, it, expect } from "vitest";
import { request, app } from "./helpers.js";

describe("Health Check", () => {
  it("✅ GET /healthz returns status: ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});
