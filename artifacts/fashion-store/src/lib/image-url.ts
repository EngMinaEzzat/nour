const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  // Strip BASE prefix if it exists to store canonical relative path
  if (BASE && trimmed.startsWith(BASE + "/")) {
    return trimmed.slice(BASE.length);
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    if (
      parsed.pathname.startsWith("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  const target = (!normalized || normalized === "/product-fashion.png") ? fallback : normalized;

  if (target.startsWith("/") && !target.startsWith(BASE + "/")) {
    return `${BASE}${target}`;
  }

  return target;
}
