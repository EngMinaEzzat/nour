const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * Normalizes an image URL to a canonical relative path for storage.
 * Strips the BASE prefix and handles absolute URLs for internal uploads.
 */
export function normalizeStoredImageUrl(url?: string | null) {
  let trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  // Strip BASE prefix if present
  if (BASE && trimmed.startsWith(BASE)) {
    trimmed = trimmed.slice(BASE.length);
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    // If it's an internal upload URL (absolute), normalize to relative path
    if (
      parsed.pathname.includes("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      let path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (BASE && path.startsWith(BASE)) {
        path = path.slice(BASE.length);
      }
      return path;
    }
  } catch {
    // Already a relative path or invalid URL
  }

  return trimmed;
}

/**
 * Resolves an image URL for display, ensuring relative paths are prefixed with BASE.
 */
export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  const image = (!normalized || normalized === "/product-fashion.png") ? fallback : normalized;

  // Prepend BASE to relative paths
  if (image.startsWith("/") && !image.startsWith("//")) {
    return `${BASE}${image}`;
  }

  return image;
}
