import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockDoubleCsrf = vi.fn().mockReturnValue({
  generateCsrfToken: vi.fn(),
  doubleCsrfProtection: vi.fn()
});

vi.mock("csrf-csrf", () => {
  return {
    doubleCsrf: mockDoubleCsrf
  };
});

describe("CSRF Configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    mockDoubleCsrf.mockClear();

    // Ensure we start with a clean process.env for these specific keys
    const originalEnv = process.env;
    vi.stubGlobal('process', {
      ...process,
      env: { ...originalEnv }
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("should provide correct options based on non-production environment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_SECRET", "test-secret");

    await import("../lib/csrf.js");

    expect(mockDoubleCsrf).toHaveBeenCalledTimes(1);
    const options = mockDoubleCsrf.mock.calls[0][0];

    expect(options.cookieName).toBe("x-csrf-token");
    expect(options.cookieOptions.secure).toBe(false);
    expect(options.cookieOptions.sameSite).toBe("lax");

    expect(options.getSecret()).toBe("test-secret");

    // test getSessionIdentifier
    const mockReqWithSession = { session: { id: "session-123" } } as any;
    expect(options.getSessionIdentifier(mockReqWithSession)).toBe("session-123");

    const mockReqWithIp = { ip: "127.0.0.1" } as any;
    expect(options.getSessionIdentifier(mockReqWithIp)).toBe("127.0.0.1");

    const mockEmptyReq = {} as any;
    expect(options.getSessionIdentifier(mockEmptyReq)).toBe("anon");

    // test getCsrfTokenFromRequest
    const mockReqWithToken = { headers: { "x-csrf-token": "token-123" } } as any;
    expect(options.getCsrfTokenFromRequest(mockReqWithToken)).toBe("token-123");

    const mockReqWithoutToken = { headers: {} } as any;
    expect(options.getCsrfTokenFromRequest(mockReqWithoutToken)).toBe("");
  });

  it("should provide correct options for production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await import("../lib/csrf.js");

    expect(mockDoubleCsrf).toHaveBeenCalledTimes(1);
    const options = mockDoubleCsrf.mock.calls[0][0];

    expect(options.cookieName).toBe("x-csrf-token");
    expect(options.cookieOptions.secure).toBe(true);
    expect(options.cookieOptions.sameSite).toBe("lax");
  });

  it("should fallback to dev secret if SESSION_SECRET is not set", async () => {
    // Delete SESSION_SECRET to test fallback
    delete process.env.SESSION_SECRET;

    await import("../lib/csrf.js");
    const options = mockDoubleCsrf.mock.calls[0][0];
    expect(options.getSecret()).toBe("dev-secret-change-in-prod");
  });

  it("should correctly identify exempt paths", async () => {
    const { isCsrfExempt } = await import("../lib/csrf.js");

    expect(isCsrfExempt("/api/paymob/callback")).toBe(true);
    expect(isCsrfExempt("/api/paymob/hmac-verify")).toBe(true);
    expect(isCsrfExempt("/api/paymob/public/initiate?query=1")).toBe(true);
    expect(isCsrfExempt("/api/whatsapp/messages/123")).toBe(true);

    expect(isCsrfExempt("/api/users")).toBe(false);
    expect(isCsrfExempt("/api/paymob/other")).toBe(false);
  });
});

describe("isCsrfExempt sub-paths and edge cases", () => {
  it("should return true for exact matches of exempt paths", async () => {
    const { isCsrfExempt, CSRF_EXEMPT_PATHS } = await import("../lib/csrf.js");
    for (const path of CSRF_EXEMPT_PATHS) {
      expect(isCsrfExempt(path)).toBe(true);
    }
  });

  it("should return true for sub-paths of exempt paths", async () => {
    const { isCsrfExempt } = await import("../lib/csrf.js");
    expect(isCsrfExempt("/api/whatsapp/messages/12345")).toBe(true);
    expect(isCsrfExempt("/api/whatsapp/messages/12345/status")).toBe(true);
    expect(isCsrfExempt("/api/paymob/callback?param=123")).toBe(true);
  });

  it("should return false for completely unrelated paths", async () => {
    const { isCsrfExempt } = await import("../lib/csrf.js");
    expect(isCsrfExempt("/api/auth/login")).toBe(false);
    expect(isCsrfExempt("/api/users/profile")).toBe(false);
    expect(isCsrfExempt("/api/regular-route")).toBe(false);
    expect(isCsrfExempt("/")).toBe(false);
  });

  it("should handle partial path matches that shouldn't be exempt", async () => {
    const { isCsrfExempt } = await import("../lib/csrf.js");
    expect(isCsrfExempt("/api/paymob/callback-fake")).toBe(false);
    expect(isCsrfExempt("/api/whatsapp/messages-fake")).toBe(false);
  });

  it("should handle empty string correctly", async () => {
    const { isCsrfExempt } = await import("../lib/csrf.js");
    expect(isCsrfExempt("")).toBe(false);
  });
});
