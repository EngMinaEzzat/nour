const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  const uploadPath = "/api/uploads/";
  const baseUploadPath = BASE + uploadPath;

  // Strip BASE if it's already there in a relative path
  if (BASE && trimmed.startsWith(baseUploadPath)) {
    return trimmed.slice(BASE.length);
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    // Check if it's an internal upload URL (either same origin or localhost)
    const isInternal = isLocalHost(parsed.hostname) || parsed.origin === currentOrigin;
    const hasUploadPath = parsed.pathname.startsWith(uploadPath) ||
                         (BASE && parsed.pathname.startsWith(baseUploadPath));

    if (isInternal && hasUploadPath) {
      const pathname = (BASE && parsed.pathname.startsWith(baseUploadPath))
        ? parsed.pathname.slice(BASE.length)
        : parsed.pathname;
      return `${pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  const target = (!normalized || normalized === "/product-fashion.png") ? fallback : normalized;

  if (target.startsWith("/")) {
    return `${BASE}${target}`;
  }
  return target;
}
