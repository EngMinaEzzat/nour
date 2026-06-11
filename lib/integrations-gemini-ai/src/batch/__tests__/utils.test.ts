import { describe, it, expect } from "vitest";
import { isRateLimitError } from "../utils";

describe("isRateLimitError", () => {
  it("should return true for 429 status code", () => {
    expect(isRateLimitError(new Error("Request failed with status code 429"))).toBe(true);
    expect(isRateLimitError("429 Too Many Requests")).toBe(true);
  });

  it("should return true for RATELIMIT_EXCEEDED message", () => {
    expect(isRateLimitError(new Error("The operation failed with RATELIMIT_EXCEEDED"))).toBe(true);
    expect(isRateLimitError("Error: RATELIMIT_EXCEEDED")).toBe(true);
  });

  it("should return true for quota exceeded message (case-insensitive)", () => {
    expect(isRateLimitError(new Error("You exceeded your Quota"))).toBe(true);
    expect(isRateLimitError("QUOTA_EXCEEDED")).toBe(true);
    expect(isRateLimitError("quota exceeded")).toBe(true);
  });

  it("should return true for rate limit message (case-insensitive)", () => {
    expect(isRateLimitError(new Error("Rate limit reached"))).toBe(true);
    expect(isRateLimitError("RATE LIMIT EXCEEDED")).toBe(true);
    expect(isRateLimitError("rate limit")).toBe(true);
  });

  it("should return false for unrelated errors", () => {
    expect(isRateLimitError(new Error("Internal Server Error"))).toBe(false);
    expect(isRateLimitError("Not Found")).toBe(false);
    expect(isRateLimitError(new Error("Validation Error"))).toBe(false);
  });

  it("should handle non-string and non-error objects gracefully", () => {
    expect(isRateLimitError({ status: 500 })).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError(429)).toBe(true); // String(429) is "429"
  });
});
