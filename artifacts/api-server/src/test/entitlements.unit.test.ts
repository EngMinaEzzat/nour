import { describe, expect, it } from "vitest";
import { getPlan, isNearLimit, isAtLimit, getPlansArray, PLANS } from "../lib/entitlements.js";

describe("entitlements", () => {
  describe("getPlan", () => {
    it("returns the free plan for unknown codes", () => {
      expect(getPlan("unknown")).toEqual(PLANS.free);
      expect(getPlan("")).toEqual(PLANS.free);
    });

    it("returns the correct plan for known codes", () => {
      expect(getPlan("free")).toEqual(PLANS.free);
      expect(getPlan("starter")).toEqual(PLANS.starter);
      expect(getPlan("growth")).toEqual(PLANS.growth);
      expect(getPlan("pro")).toEqual(PLANS.pro);
    });
  });

  describe("isNearLimit", () => {
    it("returns false if the limit is unlimited (-1)", () => {
      expect(isNearLimit(100, -1)).toBe(false);
      expect(isNearLimit(0, -1)).toBe(false);
    });

    it("returns false if the limit is 0", () => {
      expect(isNearLimit(10, 0)).toBe(false);
      expect(isNearLimit(0, 0)).toBe(false);
    });

    it("returns true if current is near the limit based on default threshold (0.8)", () => {
      expect(isNearLimit(80, 100)).toBe(true);
      expect(isNearLimit(85, 100)).toBe(true);
      expect(isNearLimit(100, 100)).toBe(true);
    });

    it("returns false if current is not near the limit based on default threshold (0.8)", () => {
      expect(isNearLimit(79, 100)).toBe(false);
      expect(isNearLimit(0, 100)).toBe(false);
    });

    it("uses a custom threshold if provided", () => {
      expect(isNearLimit(90, 100, 0.9)).toBe(true);
      expect(isNearLimit(89, 100, 0.9)).toBe(false);
    });
  });

  describe("isAtLimit", () => {
    it("returns false if the limit is unlimited (-1)", () => {
      expect(isAtLimit(100, -1)).toBe(false);
      expect(isAtLimit(0, -1)).toBe(false);
    });

    it("returns true if current is exactly at or over the limit", () => {
      expect(isAtLimit(100, 100)).toBe(true);
      expect(isAtLimit(101, 100)).toBe(true);
    });

    it("returns false if current is under the limit", () => {
      expect(isAtLimit(99, 100)).toBe(false);
      expect(isAtLimit(0, 100)).toBe(false);
    });
  });

  describe("getPlansArray", () => {
    it("returns an array of all defined plans", () => {
      const plans = getPlansArray();
      expect(plans).toHaveLength(4);
      expect(plans).toContain(PLANS.free);
      expect(plans).toContain(PLANS.starter);
      expect(plans).toContain(PLANS.growth);
      expect(plans).toContain(PLANS.pro);
    });
  });
});
