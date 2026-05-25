import { describe, it, expect } from "vitest";
import { request, app } from "./helpers.js";
import { EGYPT_GOVERNORATES } from "../lib/egypt.js";

describe("Egypt Endpoints", () => {
  it("✅ GET /api/egypt/governorates returns the full list of governorates", async () => {
    const res = await request(app).get("/api/egypt/governorates");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(EGYPT_GOVERNORATES);
    expect(res.body.length).toBe(27); // Egypt has 27 governorates

    // Check some specific fields in the response to ensure structure is correct
    const cairo = res.body.find((g: any) => g.code === "EG-C");
    expect(cairo).toBeDefined();
    expect(cairo?.nameEn).toBe("Cairo");
    expect(cairo?.nameAr).toBe("القاهرة");
    expect(cairo?.region).toBe("cairo");
  });
});
