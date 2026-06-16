import { describe, it, expect } from "vitest";
import { isRateLimitError } from "../utils";

describe("isRateLimitError", () => {
  it("should return true for errors containing '429'", () => {
    expect(isRateLimitError(new Error("Request failed with status 429"))).toBe(true);
    expect(isRateLimitError("Error: 429 Too Many Requests")).toBe(true);
  });

  it("should return true for errors containing 'RATELIMIT_EXCEEDED'", () => {
    expect(isRateLimitError(new Error("Anthropic API Error: RATELIMIT_EXCEEDED"))).toBe(true);
    expect(isRateLimitError("RATELIMIT_EXCEEDED")).toBe(true);
  });

  it("should return true for errors containing 'quota' (case-insensitive)", () => {
    expect(isRateLimitError(new Error("You have exceeded your Quota"))).toBe(true);
    expect(isRateLimitError("Insufficient quota")).toBe(true);
    expect(isRateLimitError("QUOTA_EXCEEDED")).toBe(true);
  });

  it("should return true for errors containing 'rate limit' (case-insensitive)", () => {
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
    expect(isRateLimitError("Please wait, RATE LIMIT reached")).toBe(true);
    expect(isRateLimitError("rate limit applies")).toBe(true);
  });

  it("should return false for other errors", () => {
    expect(isRateLimitError(new Error("Internal Server Error"))).toBe(false);
    expect(isRateLimitError("Not Found 404")).toBe(false);
    expect(isRateLimitError("Network timeout")).toBe(false);
    expect(isRateLimitError(null)).toBe(false);
    expect(isRateLimitError(undefined)).toBe(false);
    expect(isRateLimitError({})).toBe(false);
    expect(isRateLimitError(123)).toBe(false);
  });
});
