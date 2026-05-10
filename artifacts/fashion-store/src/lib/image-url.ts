const FALLBACK_PRODUCT_IMAGE = "/product-fashion-optimized.jpg";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * Normalizes URLs we persist from uploads or manual entry.
 * - Collapses absolute upload URLs to a path when they belong to this browser origin,
 *   or when both the page and the URL host are local (Vite + API on different ports).
 * - Does not collapse localhost upload URLs when the user is on a public site, so we
 *   do not turn them into relative paths that would hit the wrong host (still broken
 *   if the file only existed on dev — re-upload or use a public CDN URL).
 */
export function normalizeStoredImageUrl(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const browsingLocal = typeof window !== "undefined" && isLocalHost(window.location.hostname);
    if (
      parsed.pathname.startsWith("/api/uploads/") &&
      (parsed.origin === currentOrigin || (browsingLocal && isLocalHost(parsed.hostname)))
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Relative paths are already valid stored URLs.
  }

  return trimmed;
}

function viteBasePath() {
  return (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
}

function apiPublicOrigin() {
  return (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/+$/, "") ?? "";
}

/**
 * If path points at an uploaded file under /api/uploads/, rewrite for display:
 * - VITE_API_ORIGIN: API is on another host (set to e.g. https://api.example.com).
 * - Otherwise prefix Vite BASE_URL so subpath deploys match upload POST (/base/api/...).
 */
function resolveRelativeUploadPath(path: string): string {
  const base = viteBasePath();
  let uploadPath: string | null = null;

  if (path.startsWith("/api/uploads/")) {
    uploadPath = path;
  } else if (base && path.startsWith(`${base}/api/uploads/`)) {
    uploadPath = `/api/uploads/${path.slice(`${base}/api/uploads/`.length)}`;
  }

  if (!uploadPath) {
    if (base && path.startsWith("/api/")) {
      return `${base}${path}`;
    }
    return path;
  }

  const origin = apiPublicOrigin();
  if (origin) {
    return `${origin}${uploadPath}`;
  }
  if (base) {
    return `${base}${uploadPath}`;
  }
  return uploadPath;
}

export function productImageUrl(url?: string | null, fallback = FALLBACK_PRODUCT_IMAGE) {
  const normalized = normalizeStoredImageUrl(url);
  if (!normalized || normalized === "/product-fashion.png") return fallback;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return resolveRelativeUploadPath(normalized);
}
