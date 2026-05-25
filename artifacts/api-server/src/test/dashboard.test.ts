import { describe, it, expect } from "vitest";
import { request, app } from "./helpers.js";

describe("Dashboard API", () => {
  describe("GET /api/dashboard/merchant-analytics", () => {
    it("rejects request with missing tenantId", async () => {
      const res = await request(app).get("/api/dashboard/merchant-analytics");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("tenantId مطلوب");
    });

    it("rejects request with invalid tenantId", async () => {
      const res = await request(app).get("/api/dashboard/merchant-analytics?tenantId=invalid");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("tenantId مطلوب");
    });
  });
});
