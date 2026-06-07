import { describe, it, expect } from "vitest";
import { ApiError } from "../custom-fetch";

describe("ApiError mapping", () => {
  const requestInfo = { method: "POST", url: "http://example.com/api" };

  it("handles string data", () => {
    const response = new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });
    const error = new ApiError(response, "Invalid input  ", requestInfo);
    expect(error.message).toBe("HTTP 400 Bad Request: Invalid input");
  });

  it("handles title and detail", () => {
    const response = new Response(null, {
      status: 422,
      statusText: "Unprocessable Entity",
    });
    const error = new ApiError(
      response,
      { title: "Validation Error", detail: "Email is required" },
      requestInfo,
    );
    expect(error.message).toBe(
      "HTTP 422 Unprocessable Entity: Validation Error — Email is required",
    );
  });

  it("handles detail only", () => {
    const response = new Response(null, {
      status: 422,
      statusText: "Unprocessable Entity",
    });
    const error = new ApiError(
      response,
      { detail: "Email is required" },
      requestInfo,
    );
    expect(error.message).toBe(
      "HTTP 422 Unprocessable Entity: Email is required",
    );
  });

  it("handles message", () => {
    const response = new Response(null, {
      status: 403,
      statusText: "Forbidden",
    });
    const error = new ApiError(
      response,
      { message: "Access denied" },
      requestInfo,
    );
    expect(error.message).toBe("HTTP 403 Forbidden: Access denied");
  });

  it("handles error_description fallback", () => {
    const response = new Response(null, {
      status: 401,
      statusText: "Unauthorized",
    });
    const error = new ApiError(
      response,
      { error_description: "Token expired" },
      requestInfo,
    );
    expect(error.message).toBe("HTTP 401 Unauthorized: Token expired");
  });

  it("handles error fallback", () => {
    const response = new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
    const error = new ApiError(
      response,
      { error: "Database connection failed" },
      requestInfo,
    );
    expect(error.message).toBe(
      "HTTP 500 Internal Server Error: Database connection failed",
    );
  });

  it("handles title only", () => {
    const response = new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
    const error = new ApiError(
      response,
      { title: "Resource missing" },
      requestInfo,
    );
    expect(error.message).toBe("HTTP 404 Not Found: Resource missing");
  });

  it("handles empty string data", () => {
    const response = new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
    const error = new ApiError(response, "   ", requestInfo);
    expect(error.message).toBe("HTTP 500 Internal Server Error");
  });

  it("handles null data", () => {
    const response = new Response(null, {
      status: 502,
      statusText: "Bad Gateway",
    });
    const error = new ApiError(response, null, requestInfo);
    expect(error.message).toBe("HTTP 502 Bad Gateway");
  });

  it("truncates long string data", () => {
    const response = new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });
    const longString = "A".repeat(400);
    const error = new ApiError(response, longString, requestInfo);
    expect(error.message).toBe(`HTTP 400 Bad Request: ${"A".repeat(299)}…`);
  });
});
