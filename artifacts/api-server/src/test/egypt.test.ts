import { describe, it, expect } from "vitest";
import { request, app } from "./helpers.js";
import { EGYPT_GOVERNORATES, normaliseEgyptianPhone } from "../lib/egypt.js";

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

describe("normaliseEgyptianPhone", () => {
  it("should return null for empty input", () => {
    expect(normaliseEgyptianPhone("")).toBeNull();
  });

  it("should normalise valid 01x numbers to +201x format", () => {
    expect(normaliseEgyptianPhone("01012345678")).toBe("+201012345678");
    expect(normaliseEgyptianPhone("01112345678")).toBe("+201112345678");
    expect(normaliseEgyptianPhone("01212345678")).toBe("+201212345678");
    expect(normaliseEgyptianPhone("01512345678")).toBe("+201512345678");
  });

  it("should keep already normalised +201x numbers as +201x", () => {
    expect(normaliseEgyptianPhone("+201012345678")).toBe("+201012345678");
    expect(normaliseEgyptianPhone("+201112345678")).toBe("+201112345678");
  });

  it("should normalise valid 00201x numbers to +201x format", () => {
    expect(normaliseEgyptianPhone("00201012345678")).toBe("+201012345678");
  });

  it("should normalise valid 1x numbers (without leading zero) to +201x format", () => {
    expect(normaliseEgyptianPhone("1012345678")).toBe("+201012345678");
  });

  it("should strip spaces, dashes, and parentheses from the input before normalising", () => {
    expect(normaliseEgyptianPhone("010 1234 5678")).toBe("+201012345678");
    expect(normaliseEgyptianPhone("011-123-45678")).toBe("+201112345678");
    expect(normaliseEgyptianPhone("(012) 1234-5678")).toBe("+201212345678");
    expect(normaliseEgyptianPhone("+20 10 1234 5678")).toBe("+201012345678");
  });

  it("should return null for invalid phone prefixes", () => {
    expect(normaliseEgyptianPhone("01312345678")).toBeNull();
    expect(normaliseEgyptianPhone("01412345678")).toBeNull();
    expect(normaliseEgyptianPhone("01912345678")).toBeNull();
  });

  it("should return null for phone numbers with invalid length", () => {
    expect(normaliseEgyptianPhone("0101234567")).toBeNull(); // 10 digits
    expect(normaliseEgyptianPhone("010123456789")).toBeNull(); // 12 digits
    expect(normaliseEgyptianPhone("+20101234567")).toBeNull(); // 12 chars
    expect(normaliseEgyptianPhone("+2010123456789")).toBeNull(); // 14 chars
  });

  it("should return null for completely invalid inputs", () => {
    expect(normaliseEgyptianPhone("not a phone number")).toBeNull();
    expect(normaliseEgyptianPhone("!!@#$%^&*()_+")).toBeNull();
  });
});
