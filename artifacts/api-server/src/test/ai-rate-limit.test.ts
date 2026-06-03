import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkAiRateLimit,
  resetAiRateLimit,
  getMaxInputLength,
} from "../lib/ai-rate-limit.js";

describe("ai-rate-limit", () => {
  describe("checkAiRateLimit", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns default limit when planCode is not provided", () => {
      const tenantId = 1;
      resetAiRateLimit(tenantId);

      for (let i = 0; i < 10; i++) {
        expect(checkAiRateLimit(tenantId).allowed).toBe(true);
      }
      expect(checkAiRateLimit(tenantId).allowed).toBe(false);
    });

    it("returns correct limits for known planCodes", () => {
      resetAiRateLimit(2);
      for (let i = 0; i < 10; i++) {
        expect(checkAiRateLimit(2, "free").allowed).toBe(true);
      }
      expect(checkAiRateLimit(2, "free").allowed).toBe(false);

      resetAiRateLimit(3);
      for (let i = 0; i < 20; i++) {
        expect(checkAiRateLimit(3, "starter").allowed).toBe(true);
      }
      expect(checkAiRateLimit(3, "starter").allowed).toBe(false);

      resetAiRateLimit(4);
      for (let i = 0; i < 50; i++) {
        expect(checkAiRateLimit(4, "growth").allowed).toBe(true);
      }
      expect(checkAiRateLimit(4, "growth").allowed).toBe(false);
    });

    it("returns infinite limit for pro plan", () => {
      const tenantId = 5;
      resetAiRateLimit(tenantId);

      for (let i = 0; i < 100; i++) {
        expect(checkAiRateLimit(tenantId, "pro").allowed).toBe(true);
      }
    });

    it("returns retryAfter when limit is exceeded and resets after time window", () => {
      const tenantId = 6;
      resetAiRateLimit(tenantId);

      // Consume all 10 default requests
      for (let i = 0; i < 10; i++) {
        expect(checkAiRateLimit(tenantId).allowed).toBe(true);
      }

      const result = checkAiRateLimit(tenantId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);

      // Advance time by 1 hour (3600000 ms)
      vi.advanceTimersByTime(3600000);

      // Should be allowed again
      expect(checkAiRateLimit(tenantId).allowed).toBe(true);
    });
  });

  describe("resetAiRateLimit", () => {
    it("resets rate limit for a tenant", () => {
      const tenantId = 7;
      resetAiRateLimit(tenantId);

      // Consume all 10 requests
      for (let i = 0; i < 10; i++) {
        checkAiRateLimit(tenantId);
      }
      expect(checkAiRateLimit(tenantId).allowed).toBe(false);

      resetAiRateLimit(tenantId);
      expect(checkAiRateLimit(tenantId).allowed).toBe(true);
    });
  });

  describe("getMaxInputLength", () => {
    it("returns correct limits for known prompt types", () => {
      expect(getMaxInputLength("chat")).toBe(4000);
      expect(getMaxInputLength("pricing_advice")).toBe(2000);
      expect(getMaxInputLength("import_facebook")).toBe(4000);
      expect(getMaxInputLength("product_description")).toBe(1000);
      expect(getMaxInputLength("draft_reply")).toBe(2000);
    });

    it("returns default limit for unknown prompt types", () => {
      expect(getMaxInputLength("unknown")).toBe(4000);
      expect(getMaxInputLength("")).toBe(4000);
    });
  });
});
