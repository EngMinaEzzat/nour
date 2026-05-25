import { describe, it, expect } from "vitest";
import { getPlan, isNearLimit, isAtLimit, getPlansArray, PLANS } from "../lib/entitlements.js";

describe("Entitlements Utilities", () => {
  describe("getPlan", () => {
    it("should return the correct plan for a valid code", () => {
      expect(getPlan("starter")).toBe(PLANS.starter);
      expect(getPlan("growth")).toBe(PLANS.growth);
      expect(getPlan("pro")).toBe(PLANS.pro);
    });

    it("should fallback to the default plan for an invalid code", () => {
      // Note: While the prompt snippet referenced PLANS.free, the actual codebase
      // implementation falls back to PLANS.starter.
      expect(getPlan("invalid-code")).toBe(PLANS.starter);
      expect(getPlan("")).toBe(PLANS.starter);
    });
  });

  describe("isNearLimit", () => {
    it("should return false if limit is -1 (unlimited)", () => {
      expect(isNearLimit(100, -1)).toBe(false);
      expect(isNearLimit(0, -1)).toBe(false);
      expect(isNearLimit(999999, -1)).toBe(false);
    });

    it("should return false if limit is 0", () => {
      expect(isNearLimit(1, 0)).toBe(false);
      expect(isNearLimit(0, 0)).toBe(false);
    });

    it("should return false if current is below threshold", () => {
      // 79 / 100 = 0.79 < 0.8
      expect(isNearLimit(79, 100)).toBe(false);
      expect(isNearLimit(0, 10)).toBe(false);
    });

    it("should return true if current is exactly at threshold", () => {
      // 80 / 100 = 0.8 == 0.8
      expect(isNearLimit(80, 100)).toBe(true);
    });

    it("should return true if current is above threshold", () => {
      // 81 / 100 = 0.81 > 0.8
      expect(isNearLimit(81, 100)).toBe(true);
      expect(isNearLimit(100, 100)).toBe(true);
      expect(isNearLimit(120, 100)).toBe(true);
    });

    it("should allow a custom threshold", () => {
      expect(isNearLimit(89, 100, 0.9)).toBe(false);
      expect(isNearLimit(90, 100, 0.9)).toBe(true);
      expect(isNearLimit(91, 100, 0.9)).toBe(true);
    });
  });

  describe("isAtLimit", () => {
    it("should return false if limit is -1 (unlimited)", () => {
      expect(isAtLimit(100, -1)).toBe(false);
      expect(isAtLimit(0, -1)).toBe(false);
      expect(isAtLimit(999999, -1)).toBe(false);
    });

    it("should return false if current is below limit", () => {
      expect(isAtLimit(9, 10)).toBe(false);
      expect(isAtLimit(0, 10)).toBe(false);
    });

    it("should return true if current is exactly at limit", () => {
      expect(isAtLimit(10, 10)).toBe(true);
      expect(isAtLimit(0, 0)).toBe(true);
    });

    it("should return true if current is above limit", () => {
      expect(isAtLimit(11, 10)).toBe(true);
      expect(isAtLimit(100, 10)).toBe(true);
    });
  });

  describe("getPlansArray", () => {
    it("should return an array of all defined plans", () => {
      const plans = getPlansArray();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(Object.keys(PLANS).length);

      // Ensure specific plans are in the array
      expect(plans).toContain(PLANS.starter);
      expect(plans).toContain(PLANS.growth);
      expect(plans).toContain(PLANS.pro);
    });
  });
});
