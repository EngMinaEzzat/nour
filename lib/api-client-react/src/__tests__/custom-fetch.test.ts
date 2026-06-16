import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiError,
  ResponseParseError,
  customFetch,
  getCsrfToken,
  setCsrfToken,
  fetchAndSetCsrfToken,
  setBaseUrl,
  setAuthTokenGetter,
} from "../custom-fetch";

describe("ApiError", () => {
  describe("String data handling", () => {
    it("should parse string errors", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, "Some error message", { method: "POST", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request: Some error message");
    });

    it("should trim string errors", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, "  Trimmed message  \n", { method: "POST", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request: Trimmed message");
    });

    it("should fallback to prefix if string is empty after trimming", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, "   \n  ", { method: "POST", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request");
    });

    it("should truncate long string errors", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const longString = "A".repeat(400);
      const error = new ApiError(response, longString, { method: "GET", url: "/test" });
      expect(error.message).toBe(`HTTP 400 Bad Request: ${"A".repeat(299)}…`);
    });
  });

  describe("Object data handling", () => {
    it("should parse object with title and detail", () => {
      const response = new Response(null, { status: 404, statusText: "Not Found" });
      const error = new ApiError(response, { title: "Error Title", detail: "Error detail" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 404 Not Found: Error Title — Error detail");
    });

    it("should parse object with just detail", () => {
      const response = new Response(null, { status: 422, statusText: "Unprocessable Entity" });
      const error = new ApiError(response, { detail: "Just a detail" }, { method: "PUT", url: "/test" });
      expect(error.message).toBe("HTTP 422 Unprocessable Entity: Just a detail");
    });

    it("should parse object with message", () => {
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      const error = new ApiError(response, { message: "Internal error message" }, { method: "DELETE", url: "/test" });
      expect(error.message).toBe("HTTP 500 Internal Server Error: Internal error message");
    });

    it("should parse object with error_description", () => {
      const response = new Response(null, { status: 401, statusText: "Unauthorized" });
      const error = new ApiError(response, { error_description: "Invalid token" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 401 Unauthorized: Invalid token");
    });

    it("should parse object with error", () => {
      const response = new Response(null, { status: 401, statusText: "Unauthorized" });
      const error = new ApiError(response, { error: "Authentication failed" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 401 Unauthorized: Authentication failed");
    });

    it("should parse object with just title", () => {
      const response = new Response(null, { status: 403, statusText: "Forbidden" });
      const error = new ApiError(response, { title: "Access Denied" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 403 Forbidden: Access Denied");
    });

    it("should fallback to prefix when object has no recognized fields", () => {
      const response = new Response(null, { status: 502, statusText: "Bad Gateway" });
      const error = new ApiError(response, { something_else: "Ignored" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 502 Bad Gateway");
    });

    it("should fallback to prefix when data is null", () => {
      const response = new Response(null, { status: 502, statusText: "Bad Gateway" });
      const error = new ApiError(response, null, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 502 Bad Gateway");
    });

    it("should fallback to prefix when data is not an object or string", () => {
      const response = new Response(null, { status: 502, statusText: "Bad Gateway" });
      const error = new ApiError(response, 12345, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 502 Bad Gateway");
    });
  });

  describe("getStringField edge cases", () => {
    it("should ignore fields that are not strings", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, { title: 123, detail: { obj: true }, message: ["array"] }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request");
    });

    it("should ignore fields that are empty strings or just whitespace", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, { title: "", detail: "   \n " }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request");
    });

    it("should trim string fields from objects", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = new ApiError(response, { title: "  Padded Title  ", detail: "\n  Padded Detail\n" }, { method: "GET", url: "/test" });
      expect(error.message).toBe("HTTP 400 Bad Request: Padded Title — Padded Detail");
    });
  });

  describe("Properties assignment", () => {
    it("should set properties correctly", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request", headers: new Headers({ "x-test": "test-header" }) });
      Object.defineProperty(response, 'url', { value: "https://response.com/url" });

      const error = new ApiError(response, { message: "test" }, { method: "POST", url: "https://request.com/url" });

      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(400);
      expect(error.statusText).toBe("Bad Request");
      expect(error.data).toEqual({ message: "test" });
      expect(error.headers.get("x-test")).toBe("test-header");
      expect(error.response).toBe(response);
      expect(error.method).toBe("POST");
      expect(error.url).toBe("https://response.com/url");
    });

    it("should fallback to requestInfo.url when response.url is empty", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      Object.defineProperty(response, 'url', { value: "" });

      const error = new ApiError(response, null, { method: "POST", url: "https://request.com/url" });
      expect(error.url).toBe("https://request.com/url");
    });
  });
});

describe("CSRF config and customFetch", () => {
  beforeEach(() => {
    setCsrfToken("preset-csrf"); // Set default CSRF token to prevent unwanted side-effect fetches in non-CSRF tests
    setBaseUrl(null);
    setAuthTokenGetter(null);
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getCsrfToken / setCsrfToken", () => {
    it("should return null initially when reset", () => {
      setCsrfToken(null);
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

  describe("fetchAndSetCsrfToken", () => {
    beforeEach(() => {
      setCsrfToken(null);
    });

    it("should fetch and set CSRF token from default endpoint", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response(JSON.stringify({ csrfToken: "default-csrf" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      });

      await fetchAndSetCsrfToken();
      expect(getCsrfToken()).toBe("default-csrf");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/csrf-token", expect.objectContaining({ credentials: "include" }));
    });

    it("should fetch from custom base URL if provided", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response(JSON.stringify({ csrfToken: "custom-csrf" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      });

      await fetchAndSetCsrfToken("https://api.site");
      expect(getCsrfToken()).toBe("custom-csrf");
      expect(globalThis.fetch).toHaveBeenCalledWith("https://api.site/api/csrf-token", expect.objectContaining({ credentials: "include" }));
    });

    it("should reuse the in-flight promise and not fetch twice", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response(JSON.stringify({ csrfToken: "csrf-once" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      });

      await Promise.all([fetchAndSetCsrfToken(), fetchAndSetCsrfToken()]);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(getCsrfToken()).toBe("csrf-once");
    });

    it("should force refetch if options.force is true", async () => {
      setCsrfToken("existing-csrf");

      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response(JSON.stringify({ csrfToken: "new-csrf" }), {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      });

      await fetchAndSetCsrfToken(undefined, { force: true });
      expect(getCsrfToken()).toBe("new-csrf");
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("setBaseUrl", () => {
    it("should prepend base URL to relative paths only", async () => {
      setBaseUrl("https://myapi.com");

      await customFetch("/relative");
      expect(globalThis.fetch).toHaveBeenNthCalledWith(1, "https://myapi.com/relative", expect.any(Object));

      await customFetch("https://external.com/absolute");
      expect(globalThis.fetch).toHaveBeenNthCalledWith(2, "https://external.com/absolute", expect.any(Object));
    });

    it("should handle base URL trailing slashes nicely", async () => {
      setBaseUrl("https://myapi.com///");

      await customFetch("/relative");
      expect(globalThis.fetch).toHaveBeenCalledWith("https://myapi.com/relative", expect.any(Object));
    });
  });

  describe("setAuthTokenGetter", () => {
    it("should attach Authorization header when token is available", async () => {
      setAuthTokenGetter(() => "secret-bearer-token");

      await customFetch("/test");
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const requestHeaders = callArgs[1]?.headers as Headers;
      expect(requestHeaders.get("authorization")).toBe("Bearer secret-bearer-token");
    });

    it("should support async token getter", async () => {
      setAuthTokenGetter(async () => "async-secret-token");

      await customFetch("/test");
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const requestHeaders = callArgs[1]?.headers as Headers;
      expect(requestHeaders.get("authorization")).toBe("Bearer async-secret-token");
    });

    it("should not overwrite existing Authorization header", async () => {
      setAuthTokenGetter(() => "secret-bearer-token");

      const headers = new Headers({ authorization: "Bearer custom-user-token" });
      await customFetch("/test", { headers });
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const requestHeaders = callArgs[1]?.headers as Headers;
      expect(requestHeaders.get("authorization")).toBe("Bearer custom-user-token");
    });
  });

  describe("customFetch behaviour and constraints", () => {
    it("should throw TypeError if GET/HEAD request has a body", async () => {
      await expect(customFetch("/test", { method: "GET", body: "body content" })).rejects.toThrowError(
        "customFetch: GET requests cannot have a body."
      );
      await expect(customFetch("/test", { method: "HEAD", body: "body content" })).rejects.toThrowError(
        "customFetch: HEAD requests cannot have a body."
      );
    });

    it("should auto-set application/json content-type for stringified JSON body", async () => {
      await customFetch("/test", { method: "POST", body: JSON.stringify({ x: 1 }) });
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const requestHeaders = callArgs[1]?.headers as Headers;
      expect(requestHeaders.get("content-type")).toBe("application/json");
    });

    it("should auto-fetch and attach CSRF token on mutating requests if not set", async () => {
      setCsrfToken(null);

      vi.mocked(globalThis.fetch).mockImplementation(async (input) => {
        const url = typeof input === "string" ? input : (input as any).url || "";
        if (url.includes("/csrf-token")) {
          return new Response(JSON.stringify({ csrfToken: "fetched-csrf" }), { status: 200 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      await customFetch("/test", { method: "POST", body: "payload" });

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(1, "/api/csrf-token", expect.any(Object));

      const secondCall = vi.mocked(globalThis.fetch).mock.calls[1];
      const requestHeaders = secondCall[1]?.headers as Headers;
      expect(requestHeaders.get("x-csrf-token")).toBe("fetched-csrf");
    });

    it("should attach CSRF token on mutating requests if already set", async () => {
      setCsrfToken("preset-csrf");

      await customFetch("/test", { method: "POST", body: "payload" });

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0];
      const requestHeaders = callArgs[1]?.headers as Headers;
      expect(requestHeaders.get("x-csrf-token")).toBe("preset-csrf");
    });

    it("should throw ResponseParseError when success response contains malformed JSON", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response("invalid json", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
        });
      });

      await expect(customFetch("/test", { responseType: "json" })).rejects.toThrowError(ResponseParseError);
    });

    it("should parse text response successfully", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        return new Response("some plain text", {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "text/plain" },
        });
      });

      const data = await customFetch("/test", { responseType: "text" });
      expect(data).toBe("some plain text");
    });

    it("should parse blob response successfully", async () => {
      vi.mocked(globalThis.fetch).mockImplementation(async () => {
        const blobObj = new Blob(["test"], { type: "application/octet-stream" });
        return new Response(blobObj, {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/octet-stream" },
        });
      });

      const data = await customFetch("/test", { responseType: "blob" });
      expect(data).toBeInstanceOf(Blob);
    });
  });
});
