/**
 * seo-public.ts
 *
 * Top-level (non-/api) routes for SEO infrastructure:
 *   GET /robots.txt          — crawl policy + sitemap pointer
 *   GET /sitemap.xml         — dynamic index of all active stores + products
 *   GET /store/:slug         — bot-only dynamic rendering (regular users fall through to Vite)
 *   GET /products/:id        — bot-only dynamic rendering for product pages
 *
 * Mount this router in app.ts BEFORE the /api router and BEFORE the Vite proxy,
 * so bots are served pre-rendered HTML while real users still get the SPA.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, productsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

// ─── Bot detection ────────────────────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "facebookexternalhit", "facebookcatalog", "twitterbot", "linkedinbot",
  "whatsapp", "telegrambot", "slackbot", "discordbot", "applebot",
  "pinterest", "snapchat", "viber", "line-", "kakaotalk",
  "rogerbot", "semrushbot", "ahrefsbot", "mj12bot", "dotbot",
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => lower.includes(p));
}

// ─── HTML escaping ────────────────────────────────────────────────────────────
function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Pre-rendered HTML builder ────────────────────────────────────────────────
function buildMeta(opts: {
  title: string;
  description: string;
  image: string | null;
  canonical: string;
  jsonLd: object;
  robots?: string;
}): string {
  const { title, description, image, canonical, jsonLd, robots = "index, follow" } = opts;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="${robots}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  ${image ? `<meta property="og:image" content="${esc(image)}" />` : ""}
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:locale" content="ar_EG" />
  <meta property="og:site_name" content="نور" />

  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${image ? `<meta name="twitter:image" content="${esc(image)}" />` : ""}

  <link rel="canonical" href="${esc(canonical)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
  <a href="${esc(canonical)}">زيارة المتجر</a>
</body>
</html>`;
}

// ─── Resolve canonical base URL ───────────────────────────────────────────────
function appBase(req: import("express").Request): string {
  return process.env.APP_BASE_URL ?? `https://${req.hostname}`;
}

// ─── GET /robots.txt ──────────────────────────────────────────────────────────
router.get("/robots.txt", (req, res) => {
  const base = appBase(req);
  res.type("text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400"); // 24 h
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "Allow: /store/",
      "Allow: /products/",
      "Disallow: /dashboard",
      "Disallow: /api/",
      "Disallow: /login",
      "Disallow: /register",
      "Disallow: /setup",
      `Sitemap: ${base}/sitemap.xml`,
    ].join("\n"),
  );
});

// ─── GET /sitemap.xml ─────────────────────────────────────────────────────────
router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = appBase(req);

    // Fetch all active tenant slugs
    const tenants = await db
      .select({ slug: tenantsTable.slug, updatedAt: tenantsTable.createdAt })
      .from(tenantsTable)
      .where(eq(tenantsTable.status, "active"));

    // Fetch all active products with their tenant slug (for canonical URLs)
    const products = await db
      .select({
        id: productsTable.id,
        tenantId: productsTable.tenantId,
        updatedAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(eq(productsTable.status, "active"));

    const now = new Date().toISOString().split("T")[0];

    const storeUrls = tenants
      .map(
        (t) =>
          `  <url>
    <loc>${base}/store/${esc(t.slug)}</loc>
    <lastmod>${t.updatedAt ? new Date(t.updatedAt).toISOString().split("T")[0] : now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
      )
      .join("\n");

    const productUrls = products
      .map(
        (p) =>
          `  <url>
    <loc>${base}/products/${p.id}</loc>
    <lastmod>${p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`,
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${storeUrls}
${productUrls}
</urlset>`;

    res.type("application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 h
    res.send(xml);
  } catch (err) {
    console.error("sitemap error", err);
    res.status(500).send("sitemap generation failed");
  }
});

// ─── GET /store/:slug — dynamic rendering for bots ───────────────────────────
router.get("/store/:slug", async (req, res, next) => {
  const ua = req.headers["user-agent"] ?? "";
  if (!isBot(ua)) return next(); // real users → Vite SPA

  try {
    const [tenant] = await db
      .select({
        id: tenantsTable.id,
        name: tenantsTable.name,
        description: tenantsTable.description,
        slug: tenantsTable.slug,
        logoUrl: tenantsTable.logoUrl,
        coverUrl: tenantsTable.coverUrl,
        seoTitle: tenantsTable.seoTitle,
        seoDescription: tenantsTable.seoDescription,
        category: tenantsTable.category,
        city: tenantsTable.city,
        status: tenantsTable.status,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, req.params.slug));

    if (!tenant) return next(); // no such store → 404 from Vite

    const base = appBase(req);
    const canonical = `${base}/store/${tenant.slug}`;
    const title = tenant.seoTitle ?? `${tenant.name} | نور`;
    const description =
      tenant.seoDescription ??
      tenant.description ??
      `تسوقي من ${tenant.name} على منصة نور — أزياء وجمال مصري أصيل`;
    const image = tenant.coverUrl ?? tenant.logoUrl ?? null;

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: tenant.name,
      description,
      url: canonical,
      ...(image ? { image } : {}),
      ...(tenant.city
        ? {
            location: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: tenant.city,
                addressCountry: "EG",
              },
            },
          }
        : {}),
    };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min for bots
    res.setHeader("Vary", "User-Agent");
    res.send(buildMeta({ title, description, image, canonical, jsonLd }));
  } catch (err) {
    console.error("bot prerender /store/:slug error", err);
    return next();
  }
});

// ─── GET /products/:id — dynamic rendering for bots ─────────────────────────
router.get("/products/:id", async (req, res, next) => {
  const ua = req.headers["user-agent"] ?? "";
  if (!isBot(ua)) return next(); // real users → Vite SPA

  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) return next();

  try {
    const [product] = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        originalPrice: productsTable.originalPrice,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        status: productsTable.status,
        tenantId: productsTable.tenantId,
      })
      .from(productsTable)
      .where(eq(productsTable.id, productId));

    if (!product) return next();

    const [tenant] = await db
      .select({ name: tenantsTable.name, slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, product.tenantId));

    const base = appBase(req);
    const canonical = `${base}/products/${product.id}`;
    const storeName = tenant?.name ?? "نور";
    const title = `${product.name} | ${storeName}`;
    const description =
      product.description || `${product.name} — بسعر ${product.price} ج.م`;
    const image = product.imageUrl ?? null;
    const price = parseFloat(String(product.price));
    const availability =
      product.stock > 0 && product.status === "active"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description,
      url: canonical,
      ...(image ? { image } : {}),
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "EGP",
        availability,
        url: canonical,
        ...(tenant?.slug
          ? {
              seller: {
                "@type": "Organization",
                name: storeName,
                url: `${base}/store/${tenant.slug}`,
              },
            }
          : {}),
      },
    };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Vary", "User-Agent");
    res.send(buildMeta({ title, description, image, canonical, jsonLd }));
  } catch (err) {
    console.error("bot prerender /products/:id error", err);
    return next();
  }
});

export default router;
