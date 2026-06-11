import { describe, it, expect } from "vitest";
import { ApiError } from "../custom-fetch";

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
      // Using an arbitrary URL to test request url vs response url fallback
      Object.defineProperty(response, 'url', { value: "https://response.com/url" });

      const error = new ApiError(response, { message: "test" }, { method: "POST", url: "https://request.com/url" });

      expect(error.name).toBe("ApiError");
      expect(error.status).toBe(400);
      expect(error.statusText).toBe("Bad Request");
      expect(error.data).toEqual({ message: "test" });
      expect(error.headers.get("x-test")).toBe("test-header");
      expect(error.response).toBe(response);
      expect(error.method).toBe("POST");
      expect(error.url).toBe("https://response.com/url"); // should prefer response.url
    });

    it("should fallback to requestInfo.url when response.url is empty", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      Object.defineProperty(response, 'url', { value: "" }); // explicitly empty string

      const error = new ApiError(response, null, { method: "POST", url: "https://request.com/url" });
      expect(error.url).toBe("https://request.com/url");
    });
  });
});
