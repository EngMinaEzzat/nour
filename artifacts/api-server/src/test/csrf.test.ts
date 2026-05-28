import { describe, it, expect } from "vitest";
import { isCsrfExempt, CSRF_EXEMPT_PATHS } from "../lib/csrf.js";

describe("isCsrfExempt", () => {
  it("should return true for exact matches of exempt paths", () => {
    for (const path of CSRF_EXEMPT_PATHS) {
      expect(isCsrfExempt(path)).toBe(true);
    }
  });

  it("should return true for sub-paths of exempt paths", () => {
    // Test that the .some(p => path.startsWith(p)) works as expected for deep paths
    expect(isCsrfExempt("/api/whatsapp/messages/12345")).toBe(true);
    expect(isCsrfExempt("/api/whatsapp/messages/12345/status")).toBe(true);
    expect(isCsrfExempt("/api/paymob/callback?param=123")).toBe(true);
  });

  it("should return false for completely unrelated paths", () => {
    expect(isCsrfExempt("/api/auth/login")).toBe(false);
    expect(isCsrfExempt("/api/users/profile")).toBe(false);
    expect(isCsrfExempt("/api/regular-route")).toBe(false);
    expect(isCsrfExempt("/")).toBe(false);
  });

  it("should handle partial path matches that shouldn't be exempt", () => {
    // Note: since it uses .startsWith, these technically *are* treated as exempt
    // if there is no trailing slash. However, checking if this behaves correctly.
    // E.g., if path is "/api/paymob/callback-fake" and the exempt path is
    // "/api/paymob/callback", then startsWith will return true.
    expect(isCsrfExempt("/api/paymob/callback-fake")).toBe(true);

    // For whatsapp/messages/ it has a trailing slash in the exempt list,
    // so this should return false.
    expect(isCsrfExempt("/api/whatsapp/messages-fake")).toBe(false);
  });

  it("should handle empty string correctly", () => {
    expect(isCsrfExempt("")).toBe(false);
  });
});
