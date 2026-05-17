function getBase() {
  return (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
}

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
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

export function productImageUrl(url?: string | null, fallback?: string) {
  const base = getBase();
  const defaultFallback = `${base}/product-fashion-optimized.jpg`;
  const finalFallback = fallback || defaultFallback;

  const normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === "/product-fashion.png") return finalFallback;

  // If it's a relative path (starts with /) and doesn't already start with base, prepend it.
  if (normalized.startsWith("/") && (base === "" || !normalized.startsWith(base + "/"))) {
    return `${base}${normalized}`;
  }

  return normalized;
}
