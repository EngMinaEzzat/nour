const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = `${BASE}/product-fashion-optimized.jpg`;

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  let path = trimmed;
  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    if (
      parsed.pathname.startsWith("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } else {
      return trimmed;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  if (path.startsWith("/") && BASE && !path.startsWith(BASE + "/")) {
    return `${BASE}${path}`;
  }

  return path;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === "/product-fashion.png" || normalized === `${BASE}/product-fashion.png`) return fallback;
  return normalized;
}
