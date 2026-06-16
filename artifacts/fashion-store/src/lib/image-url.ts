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

    // Handle Vercel Blob URLs (convert them back to internal paths for resizing)
    if (parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
      const filename = parsed.pathname.split('/').pop();
      if (filename) {
        return `/api/uploads/${filename}`;
      }
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

export function getResponsiveImageProps(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const src = productImageUrl(url, fallback);
  
  // Extract just the pathname safely, even if src is an absolute URL
  let apiPath = src;
  try {
    if (/^https?:\/\//i.test(src)) {
      apiPath = new URL(src).pathname;
    } else {
      apiPath = src.split('?')[0];
    }
  } catch {
    apiPath = src.split('?')[0];
  }

  // If it's not pointing to our uploads, we can't resize it via our API
  if (!apiPath.startsWith('/uploads/') && !apiPath.startsWith('/api/uploads/')) {
    return { src };
  }

  // Normalize path to always start with /api/uploads/
  if (apiPath.startsWith('/uploads/')) {
    apiPath = `/api${apiPath}`;
  }
  
  const BASE = getBase();
  const prefix = BASE ? BASE : '';
  
  let origin = '';
  try {
    if (/^https?:\/\//i.test(src)) {
      origin = new URL(src).origin;
    }
  } catch {}

  const fullPrefix = origin ? origin + prefix : prefix;
  const w300 = `${fullPrefix}/api/images/resize?src=${encodeURIComponent(apiPath)}&w=300`;
  const w600 = `${fullPrefix}/api/images/resize?src=${encodeURIComponent(apiPath)}&w=600`;
  const w900 = `${fullPrefix}/api/images/resize?src=${encodeURIComponent(apiPath)}&w=900`;
  
  return {
    src: w600,
    srcSet: `${w300} 300w, ${w600} 600w, ${w900} 900w`,
    sizes: "(max-width: 640px) 300px, (max-width: 1024px) 600px, 900px"
  };
}
