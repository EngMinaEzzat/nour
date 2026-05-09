const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = `${BASE}/product-fashion-optimized.jpg`;

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    if (
      parsed.pathname.startsWith("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      return `${BASE}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths
  }

  if (trimmed.startsWith("/")) {
    return `${BASE}${trimmed}`;
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === `${BASE}/product-fashion.png`) return fallback;
  return normalized;
}
