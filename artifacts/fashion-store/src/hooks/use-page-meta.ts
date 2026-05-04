import { useEffect } from "react";

interface PageMetaOptions {
  title: string;
  description?: string;
  image?: string | null;
  canonicalPath?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown>;
}

function setMeta(selector: string, attr: string, value: string | null): void {
  if (!value) {
    document.querySelector(selector)?.remove();
    return;
  }
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrValue] = selector.match(/\[([^\]=]+)="([^"]+)"/)?.slice(1) ?? [];
    if (attrName && attrValue) el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string | null): void {
  if (!href) {
    document.querySelector(`link[rel="${rel}"]`)?.remove();
    return;
  }
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, data: Record<string, unknown> | null): void {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function usePageMeta(options: PageMetaOptions | null, deps: unknown[] = []): void {
  useEffect(() => {
    if (!options) return;
    const { title, description, image, canonicalPath, type = "website", jsonLd } = options;

    const siteBase = window.location.origin;
    const canonical = canonicalPath ? `${siteBase}${canonicalPath}` : null;

    document.title = title;
    setMeta('meta[name="description"]', "content", description ?? null);

    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description ?? null);
    setMeta('meta[property="og:image"]', "content", image ?? null);
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[property="og:locale"]', "content", "ar_EG");
    setMeta('meta[property="og:site_name"]', "content", "نور");

    setMeta('meta[name="twitter:card"]', "content", image ? "summary_large_image" : "summary");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description ?? null);
    setMeta('meta[name="twitter:image"]', "content", image ?? null);

    setLink("canonical", canonical);

    setJsonLd("page-json-ld", jsonLd ?? null);

    return () => {
      document.title = "نور — سوق الأزياء والجمال المصري";
      ["description", "og:type", "og:title", "og:description", "og:image", "og:url", "og:locale", "og:site_name",
        "twitter:card", "twitter:title", "twitter:description", "twitter:image"].forEach(k => {
        const selector = k.startsWith("og:") || k.startsWith("twitter:")
          ? `meta[property="${k}"]`
          : `meta[name="${k}"]`;
        document.querySelector(selector)?.remove();
      });
      document.querySelector("link[rel='canonical']")?.remove();
      document.getElementById("page-json-ld")?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
