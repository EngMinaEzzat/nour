const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    // If it's a full URL to our own API uploads, store it as a relative path
    if (
      parsed.pathname.includes("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      // Extract the path after /api/uploads/ to make it base-agnostic for storage
      const match = parsed.pathname.match(/\/api\/uploads\/(.+)$/);
      if (match) return `/api/uploads/${match[1]}${parsed.search}${parsed.hash}`;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === "/product-fashion.png") {
    return fallback.startsWith("http") ? fallback : `${BASE}${fallback}`;
  }

  // If it's a local upload path, ensure it's prefixed with the current BASE
  if (normalized.startsWith("/api/uploads/")) {
    return `${BASE}${normalized}`;
  }

  return normalized;
}
