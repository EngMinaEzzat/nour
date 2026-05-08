/**
 * Global fetch interceptor that automatically attaches the CSRF token
 * to all same-origin state-mutating requests (POST, PUT, PATCH, DELETE).
 *
 * This ensures that even pages using raw fetch() instead of the workspace
 * customFetch will not be rejected by CSRF middleware in production.
 *
 * Must be imported once at app startup before any fetch calls.
 */
import { getCsrfToken } from "@workspace/api-client-react";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const _originalFetch = window.fetch.bind(window);

function isSameOrigin(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    // Relative URL — always same-origin
    return true;
  }
}

window.fetch = function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();

  if (MUTATING_METHODS.has(method)) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (isSameOrigin(url)) {
      const csrf = getCsrfToken();
      if (csrf) {
        const headers = new Headers(init?.headers);
        if (!headers.has("x-csrf-token")) {
          headers.set("x-csrf-token", csrf);
        }
        return _originalFetch(input, { ...init, headers });
      }
    }
  }

  return _originalFetch(input, init);
};
