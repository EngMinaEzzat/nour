const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    const pathname = parsed.pathname;
    const isUploadPath = pathname.startsWith("/api/uploads/") ||
                         (BASE !== "" && pathname.startsWith(BASE + "/api/uploads/"));

    if (
      isUploadPath &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      let path = `${pathname}${parsed.search}${parsed.hash}`;
      if (BASE !== "" && path.startsWith(BASE + "/")) {
        path = path.substring(BASE.length);
      }
      return path;
    }
  } catch {
    if (BASE !== "" && trimmed.startsWith(BASE + "/")) {
      return trimmed.substring(BASE.length);
    }
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  let normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === "/product-fashion.png") {
    normalized = fallback;
  }

  if (normalized.startsWith("/") && !normalized.startsWith(BASE + "/")) {
    return `${BASE}${normalized}`;
  }
  return normalized;
}
