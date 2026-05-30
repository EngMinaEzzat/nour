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
  if (!normalized || normalized === "/product-fashion.png") return fallback;
  return normalized;
}

export function getResponsiveImageProps(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const src = productImageUrl(url, fallback);
  if (!src.startsWith('/uploads/') && !src.startsWith('/api/uploads/')) {
    return { src };
  }
  
  const w300 = `/api/images/resize?url=${encodeURIComponent(src)}&w=300`;
  const w600 = `/api/images/resize?url=${encodeURIComponent(src)}&w=600`;
  const w900 = `/api/images/resize?url=${encodeURIComponent(src)}&w=900`;
  
  return {
    src: w600,
    srcSet: `${w300} 300w, ${w600} 600w, ${w900} 900w`,
    sizes: "(max-width: 640px) 300px, (max-width: 1024px) 600px, 900px"
  };
}
