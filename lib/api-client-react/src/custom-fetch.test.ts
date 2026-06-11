import { describe, it, expect, beforeEach } from "vitest";
import { getCsrfToken, setCsrfToken } from "./custom-fetch";

describe("getCsrfToken", () => {
  beforeEach(() => {
    // Reset the internal state before each test
    setCsrfToken(null);
  });

  it("should return null initially", () => {
    expect(getCsrfToken()).toBeNull();
  });

  it("should return the token after setCsrfToken is called", () => {
    const token = "test-token-123";
    setCsrfToken(token);
    expect(getCsrfToken()).toBe(token);
  });

  it("should return null after setCsrfToken is called with null", () => {
    setCsrfToken("test-token-123");
    setCsrfToken(null);
    expect(getCsrfToken()).toBeNull();
  });
});
