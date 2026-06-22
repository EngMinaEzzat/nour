import { getBaseDomain } from "@/lib/utils";

// ─── Subdomain detection ──────────────────────────────────────────────────────
export function getSubdomainSlug(): string | null {
  if (typeof window === "undefined") return null;
  const initialPublicPage = (
    window as typeof window & {
      __MATJAREG_INITIAL_PUBLIC_PAGE__?: { slug?: string };
    }
  ).__MATJAREG_INITIAL_PUBLIC_PAGE__;
  if (initialPublicPage?.slug) {
    return initialPublicPage.slug;
  }

  const hostname = window.location.hostname;
  const PLATFORM_DOMAIN = getBaseDomain();
  
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = hostname.slice(0, hostname.length - PLATFORM_DOMAIN.length - 1);
  if (
    !sub ||
    sub.includes(".") ||
    sub === "www" ||
    sub === "app" ||
    sub === "api"
  )
    return null;
  return sub;
}

export function getStoreSlugFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  if (path.startsWith("/store/")) {
    const parts = path.split("/");
    if (parts.length > 2 && parts[2]) {
      return parts[2];
    }
  }
  return null;
}

export function isReadOnlyPublicRoute(subdomainSlug: string | null): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  const initialPublicPage = (
    window as typeof window & {
      __MATJAREG_INITIAL_PUBLIC_PAGE__?: { page?: string };
    }
  ).__MATJAREG_INITIAL_PUBLIC_PAGE__;

  if (path === "/checkout" || path.startsWith("/order-")) return false;
  if (initialPublicPage?.page) return true;
  
  const isStoreFallback = path.startsWith("/store/");
  const normalizedPath = isStoreFallback ? path.replace(/^\/store\/[^\/]+/, "") || "/" : path;

  if (
    subdomainSlug &&
    (normalizedPath === "/" ||
      normalizedPath.startsWith("/product/") ||
      normalizedPath.startsWith("/category/") ||
      normalizedPath.startsWith("/order-track/"))
  ) {
    return true;
  }
  return false;
}
