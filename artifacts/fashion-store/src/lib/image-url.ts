const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getBase() {
  return (import.meta.env.BASE_URL || "").replace(/\/$/, "");
}

export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  const BASE = getBase();

  // If it starts with BASE, strip it to store as canonical relative path
  if (BASE && trimmed.startsWith(BASE + "/")) {
    return trimmed.slice(BASE.length);
  }

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    // Handle absolute URLs that point to our own uploads
    if (
      parsed.pathname.startsWith("/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    // Also handle absolute URLs that include the BASE path
    if (
      BASE &&
      parsed.pathname.startsWith(BASE + "/api/uploads/") &&
      (isLocalHost(parsed.hostname) || parsed.origin === currentOrigin)
    ) {
      return `${parsed.pathname.slice(BASE.length)}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  const target = (!normalized || normalized === "/product-fashion.png") ? fallback : normalized;

  // External URLs (http, https, //) should be returned as is
  if (/^https?:\/\/|^\/\//i.test(target)) {
    return target;
  }

  // Prepend BASE to relative paths
  const BASE = getBase();
  return `${BASE}${target.startsWith("/") ? "" : "/"}${target}`;
}
