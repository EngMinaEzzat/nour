/**
 * Public SSR and crawl infrastructure for storefront pages.
 *
 * These routes intentionally serve the same initial HTML to shoppers and
 * crawlers. The SPA bundle is still attached so the page becomes interactive
 * after the first paint.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { categoriesTable, productsTable, tenantsTable } from "@workspace/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

const router = Router();

type TenantPublic = {
  id: number;
  name: string;
  description: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: "fashion" | "cosmetics" | "both";
  city: string | null;
  status: "active" | "inactive" | "pending";
  customDomain: string | null;
  customDomainVerified: boolean;
};

type ProductPublic = {
  id: number;
  name: string;
  description: string;
  price: string | number;
  originalPrice: string | number | null;
  imageUrl: string | null;
  stock: number;
  status: "active" | "out_of_stock" | "hidden";
  tenantId: number;
  categoryId: number | null;
  categoryName?: string | null;
  categoryNameAr?: string | null;
};

type CategoryPublic = {
  id: number;
  name: string;
  nameAr: string;
  type: "fashion" | "cosmetics";
  tenantId: number | null;
};

type ClientAssets = {
  links: string;
  scripts: string;
};

let cachedAssets: ClientAssets | undefined;

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
}

function requestBase(req: Request): string {
  const configured = process.env.APP_BASE_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = req.get("host") ?? req.hostname;
  return `${protocol}://${host}`;
}

function tenantUsesCustomDomain(tenant: Pick<TenantPublic, "customDomain" | "customDomainVerified">): boolean {
  return Boolean(tenant.customDomainVerified && tenant.customDomain);
}

function tenantBase(req: Request, tenant: Pick<TenantPublic, "customDomain" | "customDomainVerified">): string {
  if (tenantUsesCustomDomain(tenant) && tenant.customDomain) {
    return `https://${normalizeDomain(tenant.customDomain)}`;
  }
  return requestBase(req);
}

function absoluteUrl(req: Request, url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${requestBase(req)}${url.startsWith("/") ? url : `/${url}`}`;
}

function slugPart(value: string | null | undefined): string {
  const slug = (value || "item")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return slug || "item";
}

function productSlug(product: Pick<ProductPublic, "id" | "name">): string {
  return `${product.id}-${slugPart(product.name)}`;
}

function categorySlug(category: Pick<CategoryPublic, "id" | "name" | "nameAr">): string {
  return `${category.id}-${slugPart(category.nameAr || category.name)}`;
}

function parseIdSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function storeUrl(req: Request, tenant: TenantPublic): string {
  const base = tenantBase(req, tenant);
  return tenantUsesCustomDomain(tenant) ? `${base}/` : `${base}/store/${tenant.slug}`;
}

function productUrl(req: Request, tenant: TenantPublic, product: Pick<ProductPublic, "id" | "name">): string {
  const base = tenantBase(req, tenant);
  const slug = productSlug(product);
  return tenantUsesCustomDomain(tenant)
    ? `${base}/product/${slug}`
    : `${base}/store/${tenant.slug}/product/${slug}`;
}

function categoryUrl(req: Request, tenant: TenantPublic, category: CategoryPublic): string {
  const base = tenantBase(req, tenant);
  const slug = categorySlug(category);
  return tenantUsesCustomDomain(tenant)
    ? `${base}/category/${slug}`
    : `${base}/store/${tenant.slug}/category/${slug}`;
}

function formatPrice(price: string | number): string {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return `${price} EGP`;
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function getClientAssets(): ClientAssets {
  if (cachedAssets !== undefined) return cachedAssets;

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    cachedAssets = {
      links: '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
      scripts: `<script type="module">
import RefreshRuntime from "/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>
<script type="module" src="/src/main.tsx"></script>`,
    };
    return cachedAssets;
  }

  const indexCandidates = [
    path.resolve(process.cwd(), "artifacts/fashion-store/dist/public/index.html"),
    path.resolve(process.cwd(), "dist/public/index.html"),
  ];

  for (const filePath of indexCandidates) {
    try {
      const html = fs.readFileSync(filePath, "utf8");
      const links = [...html.matchAll(/<link\s+[^>]*>/gi)].map((m) => m[0]).join("\n");
      const scripts = [...html.matchAll(/<script\s+[^>]*type=["']module["'][^>]*><\/script>/gi)]
        .map((m) => m[0])
        .join("\n");
      if (scripts) {
        cachedAssets = { links, scripts };
        return cachedAssets;
      }
    } catch {
      // Built frontend assets are absent in API tests and during API-only dev.
    }
  }

  cachedAssets = {
    links: '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    scripts: '<script type="module" crossorigin src="/assets/index.js"></script>',
  };
  cachedAssets.links += '\n<link rel="stylesheet" crossorigin href="/assets/index.css" />';
  return cachedAssets;
}

async function getActiveTenantBySlug(slug: string): Promise<TenantPublic | null> {
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
      customDomain: tenantsTable.customDomain,
      customDomainVerified: tenantsTable.customDomainVerified,
    })
    .from(tenantsTable)
    .where(and(eq(tenantsTable.slug, slug), eq(tenantsTable.status, "active")));

  return tenant ?? null;
}

async function getActiveTenantByDomain(req: Request): Promise<TenantPublic | null> {
  const host = normalizeDomain(req.hostname || req.get("host") || "");
  if (!host) return null;

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
      customDomain: tenantsTable.customDomain,
      customDomainVerified: tenantsTable.customDomainVerified,
    })
    .from(tenantsTable)
    .where(
      and(
        eq(tenantsTable.customDomain, host),
        eq(tenantsTable.customDomainVerified, true),
        eq(tenantsTable.status, "active"),
      ),
    );

  return tenant ?? null;
}

async function getStoreProducts(tenantId: number): Promise<ProductPublic[]> {
  return db
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
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryNameAr: categoriesTable.nameAr,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(and(eq(productsTable.tenantId, tenantId), eq(productsTable.status, "active")));
}

async function getStoreCategories(products: ProductPublic[]): Promise<CategoryPublic[]> {
  const ids = [...new Set(products.map((p) => p.categoryId).filter((id): id is number => Boolean(id)))];
  if (ids.length === 0) return [];
  return db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      nameAr: categoriesTable.nameAr,
      type: categoriesTable.type,
      tenantId: categoriesTable.tenantId,
    })
    .from(categoriesTable)
    .where(inArray(categoriesTable.id, ids));
}

async function getPublicProduct(tenant: TenantPublic, id: number): Promise<ProductPublic | null> {
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
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryNameAr: categoriesTable.nameAr,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(productsTable.id, id),
        eq(productsTable.tenantId, tenant.id),
        eq(productsTable.status, "active"),
      ),
    );

  return product ?? null;
}

async function getPublicCategory(tenant: TenantPublic, id: number): Promise<CategoryPublic | null> {
  const [category] = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      nameAr: categoriesTable.nameAr,
      type: categoriesTable.type,
      tenantId: categoriesTable.tenantId,
    })
    .from(categoriesTable)
    .where(
      and(
        eq(categoriesTable.id, id),
        or(eq(categoriesTable.tenantId, tenant.id), isNull(categoriesTable.tenantId)),
      ),
    );

  return category ?? null;
}

function renderDocument(opts: {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  ogType?: "website" | "product";
  jsonLd: Record<string, unknown>;
  body: string;
  initialData: Record<string, unknown>;
  preloadApi?: string;
}): string {
  const assets = getClientAssets();
  const twitterCard = opts.image ? "summary_large_image" : "summary";
  const preload = opts.preloadApi
    ? `<link rel="preload" href="${esc(opts.preloadApi)}" as="fetch" crossorigin="anonymous" />`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${esc(opts.canonical)}" />
  ${preload}
  <meta property="og:type" content="${opts.ogType ?? "website"}" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${esc(opts.description)}" />
  ${opts.image ? `<meta property="og:image" content="${esc(opts.image)}" />` : ""}
  <meta property="og:url" content="${esc(opts.canonical)}" />
  <meta property="og:locale" content="ar_EG" />
  <meta property="og:site_name" content="نــور" />
  <meta name="twitter:card" content="${twitterCard}" />
  <meta name="twitter:title" content="${esc(opts.title)}" />
  <meta name="twitter:description" content="${esc(opts.description)}" />
  ${opts.image ? `<meta name="twitter:image" content="${esc(opts.image)}" />` : ""}
  <script type="application/ld+json">${safeJson(opts.jsonLd)}</script>
  ${assets.links}
  <style>
    .ssr-public-page{font-family:Cairo,Tajawal,system-ui,sans-serif;background:#faf7f4;color:#1f1a17;min-height:100vh}
    .ssr-wrap{width:min(1120px,calc(100% - 32px));margin-inline:auto}
    .ssr-hero{padding:48px 0 28px;display:grid;gap:18px}
    .ssr-logo{width:72px;height:72px;object-fit:cover;border-radius:16px;background:#fff}
    .ssr-kicker{color:#8b1a35;font-weight:700;font-size:13px}
    .ssr-title{font-size:clamp(30px,5vw,54px);line-height:1.08;margin:0}
    .ssr-desc{font-size:18px;line-height:1.8;max-width:760px;margin:0;color:#5f504a}
    .ssr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;padding:26px 0 64px}
    .ssr-card{background:#fff;border:1px solid #eee1dc;border-radius:8px;overflow:hidden;color:inherit;text-decoration:none}
    .ssr-card img{width:100%;aspect-ratio:3/4;object-fit:cover;background:#eee1dc;display:block}
    .ssr-card-body{padding:12px}
    .ssr-card-title{font-size:16px;margin:0 0 8px;line-height:1.45}
    .ssr-price{font-weight:800;color:#8b1a35}
    .ssr-muted{color:#776a63;font-size:14px}
    .ssr-list{display:flex;flex-wrap:wrap;gap:10px;padding:0;margin:10px 0 0;list-style:none}
    .ssr-chip{display:inline-flex;border:1px solid #dccbc4;border-radius:999px;padding:8px 12px;background:#fff;color:#4b403b;text-decoration:none;font-size:14px}
    .ssr-product{display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:34px;padding:42px 0 76px}
    .ssr-product img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;background:#eee1dc}
    .ssr-cta{position:fixed;left:16px;right:16px;bottom:14px;z-index:20;display:none;justify-content:center;background:#8b1a35;color:#fff;text-decoration:none;padding:14px 18px;border-radius:8px;font-weight:800}
    @media (max-width:720px){.ssr-product{grid-template-columns:1fr}.ssr-cta{display:flex}.ssr-grid{padding-bottom:92px}}
  </style>
</head>
<body>
  <div id="root">${opts.body}</div>
  <script>window.__NOUR_INITIAL_PUBLIC_PAGE__=${safeJson(opts.initialData)};</script>
  ${assets.scripts}
</body>
</html>`;
}

function storeJsonLd(req: Request, tenant: TenantPublic, products: ProductPublic[]) {
  const canonical = storeUrl(req, tenant);
  const image = absoluteUrl(req, tenant.coverUrl ?? tenant.logoUrl);
  const description = tenant.seoDescription ?? tenant.description;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
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
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `منتجات ${tenant.name}`,
          numberOfItems: products.length,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: requestBase(req) },
          { "@type": "ListItem", position: 2, name: tenant.name, item: canonical },
        ],
      },
    ],
  };
}

function renderStorePage(req: Request, tenant: TenantPublic, products: ProductPublic[], categories: CategoryPublic[]): string {
  const title = tenant.seoTitle ?? `${tenant.name} | نور`;
  const description = tenant.seoDescription ?? tenant.description;
  const canonical = storeUrl(req, tenant);
  const image = absoluteUrl(req, tenant.coverUrl ?? tenant.logoUrl);
  const categoryLinks = categories
    .map((category) => `<li><a class="ssr-chip" href="${esc(categoryUrl(req, tenant, category))}">${esc(category.nameAr || category.name)}</a></li>`)
    .join("");
  const cards = products
    .map((product) => {
      const productImage = absoluteUrl(req, product.imageUrl) ?? "/product-fashion.png";
      const availability = product.stock > 0 ? "متاح" : "نفذت الكمية";
      return `<a class="ssr-card" href="${esc(productUrl(req, tenant, product))}">
        <img src="${esc(productImage)}" alt="${esc(product.name)}" width="600" height="800" loading="lazy" />
        <div class="ssr-card-body">
          ${product.categoryNameAr || product.categoryName ? `<p class="ssr-muted">${esc(product.categoryNameAr || product.categoryName)}</p>` : ""}
          <h2 class="ssr-card-title">${esc(product.name)}</h2>
          <p class="ssr-price">${esc(formatPrice(product.price))}</p>
          <p class="ssr-muted">${availability}</p>
        </div>
      </a>`;
    })
    .join("");

  const body = `<main class="ssr-public-page">
    <section class="ssr-wrap ssr-hero">
      ${image ? `<img class="ssr-logo" src="${esc(image)}" alt="${esc(tenant.name)}" width="72" height="72" />` : ""}
      <p class="ssr-kicker">${esc(tenant.city ?? "متجر مصري")}</p>
      <h1 class="ssr-title">${esc(tenant.name)}</h1>
      <p class="ssr-desc">${esc(description)}</p>
      ${categoryLinks ? `<nav aria-label="فئات المتجر"><ul class="ssr-list">${categoryLinks}</ul></nav>` : ""}
    </section>
    <section class="ssr-wrap" aria-labelledby="products-heading">
      <h2 id="products-heading">منتجات ${esc(tenant.name)}</h2>
      <div class="ssr-grid">${cards || `<p class="ssr-muted">لا توجد منتجات متاحة حاليا.</p>`}</div>
    </section>
    <a class="ssr-cta" href="/checkout">عرض السلة وإتمام الطلب</a>
  </main>`;

  return renderDocument({
    title,
    description,
    canonical,
    image,
    jsonLd: storeJsonLd(req, tenant, products),
    body,
    initialData: { page: "store", slug: tenant.slug, canonical },
    preloadApi: `/api/store/${tenant.slug}`,
  });
}

function renderProductPage(req: Request, tenant: TenantPublic, product: ProductPublic): string {
  const canonical = productUrl(req, tenant, product);
  const title = `${product.name} | ${tenant.name}`;
  const description = product.description || `${product.name} من ${tenant.name}`;
  const image = absoluteUrl(req, product.imageUrl);
  const price = Number(product.price);
  const availability = product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const categoryName = product.categoryNameAr || product.categoryName;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        description,
        url: canonical,
        ...(image ? { image } : {}),
        ...(categoryName ? { category: categoryName } : {}),
        offers: {
          "@type": "Offer",
          price: Number.isFinite(price) ? price : String(product.price),
          priceCurrency: "EGP",
          availability,
          url: canonical,
          seller: {
            "@type": "Organization",
            name: tenant.name,
            url: storeUrl(req, tenant),
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: requestBase(req) },
          { "@type": "ListItem", position: 2, name: tenant.name, item: storeUrl(req, tenant) },
          { "@type": "ListItem", position: 3, name: product.name, item: canonical },
        ],
      },
    ],
  };

  const body = `<main class="ssr-public-page">
    <section class="ssr-wrap ssr-product">
      <div>
        <img src="${esc(image ?? "/product-fashion.png")}" alt="${esc(product.name)}" width="900" height="1200" fetchpriority="high" />
      </div>
      <article>
        <p class="ssr-kicker"><a href="${esc(storeUrl(req, tenant))}">${esc(tenant.name)}</a>${categoryName ? ` / ${esc(categoryName)}` : ""}</p>
        <h1 class="ssr-title">${esc(product.name)}</h1>
        <p class="ssr-price">${esc(formatPrice(product.price))}</p>
        <p class="ssr-desc">${esc(description)}</p>
        <p class="ssr-muted">حالة التوفر: ${product.stock > 0 ? "متاح" : "نفذت الكمية"}</p>
        <a class="ssr-chip" href="/checkout">إتمام الطلب</a>
      </article>
    </section>
    <a class="ssr-cta" href="/checkout">أضف للسلة وإتمام الطلب</a>
  </main>`;

  return renderDocument({
    title,
    description,
    canonical,
    image,
    ogType: "product",
    jsonLd,
    body,
    initialData: { page: "product", slug: tenant.slug, productId: product.id, canonical },
    preloadApi: `/api/products/${product.id}`,
  });
}

function renderCategoryPage(
  req: Request,
  tenant: TenantPublic,
  category: CategoryPublic,
  products: ProductPublic[],
): string {
  const canonical = categoryUrl(req, tenant, category);
  const title = `${category.nameAr || category.name} | ${tenant.name}`;
  const description = `تسوق ${category.nameAr || category.name} من ${tenant.name} على نور.`;
  const image = absoluteUrl(req, tenant.coverUrl ?? tenant.logoUrl);
  const cards = products
    .map((product) => {
      const productImage = absoluteUrl(req, product.imageUrl) ?? "/product-fashion.png";
      return `<a class="ssr-card" href="${esc(productUrl(req, tenant, product))}">
        <img src="${esc(productImage)}" alt="${esc(product.name)}" width="600" height="800" loading="lazy" />
        <div class="ssr-card-body">
          <h2 class="ssr-card-title">${esc(product.name)}</h2>
          <p class="ssr-price">${esc(formatPrice(product.price))}</p>
          <p class="ssr-muted">${product.stock > 0 ? "متاح" : "نفذت الكمية"}</p>
        </div>
      </a>`;
    })
    .join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url: canonical,
        ...(image ? { image } : {}),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: productUrl(req, tenant, product),
            name: product.name,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: requestBase(req) },
          { "@type": "ListItem", position: 2, name: tenant.name, item: storeUrl(req, tenant) },
          { "@type": "ListItem", position: 3, name: category.nameAr || category.name, item: canonical },
        ],
      },
    ],
  };

  const body = `<main class="ssr-public-page">
    <section class="ssr-wrap ssr-hero">
      <p class="ssr-kicker"><a href="${esc(storeUrl(req, tenant))}">${esc(tenant.name)}</a></p>
      <h1 class="ssr-title">${esc(category.nameAr || category.name)}</h1>
      <p class="ssr-desc">${esc(description)}</p>
    </section>
    <section class="ssr-wrap">
      <div class="ssr-grid">${cards || `<p class="ssr-muted">لا توجد منتجات متاحة في هذه الفئة حاليا.</p>`}</div>
    </section>
    <a class="ssr-cta" href="/checkout">عرض السلة وإتمام الطلب</a>
  </main>`;

  return renderDocument({
    title,
    description,
    canonical,
    image,
    jsonLd,
    body,
    initialData: { page: "category", slug: tenant.slug, categoryId: category.id, canonical },
    preloadApi: `/api/store/${tenant.slug}?categoryId=${category.id}`,
  });
}

async function sendStore(req: Request, res: Response, tenant: TenantPublic): Promise<void> {
  const products = await getStoreProducts(tenant.id);
  const categories = await getStoreCategories(products);
  res.type("html");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.send(renderStorePage(req, tenant, products, categories));
}

async function sendProduct(
  req: Request,
  res: Response,
  next: NextFunction,
  tenant: TenantPublic,
  rawSlug: string,
): Promise<void> {
  const id = parseIdSlug(rawSlug);
  if (!id) return next();
  const product = await getPublicProduct(tenant, id);
  if (!product) return next();
  res.type("html");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.send(renderProductPage(req, tenant, product));
}

async function sendCategory(
  req: Request,
  res: Response,
  next: NextFunction,
  tenant: TenantPublic,
  rawSlug: string,
): Promise<void> {
  const id = parseIdSlug(rawSlug);
  if (!id) return next();
  const category = await getPublicCategory(tenant, id);
  if (!category) return next();
  const products = await db
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
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryNameAr: categoriesTable.nameAr,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(productsTable.tenantId, tenant.id),
        eq(productsTable.categoryId, category.id),
        eq(productsTable.status, "active"),
      ),
    );

  res.type("html");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.send(renderCategoryPage(req, tenant, category, products));
}

router.get("/robots.txt", (req, res) => {
  const base = requestBase(req);
  res.type("text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "Allow: /store/",
      "Allow: /product/",
      "Allow: /category/",
      "Disallow: /api/",
      "Disallow: /dashboard",
      "Disallow: /orders",
      "Disallow: /customers",
      "Disallow: /analytics",
      "Disallow: /billing",
      "Disallow: /tracking",
      "Disallow: /exports",
      "Disallow: /store-settings",
      "Disallow: /login",
      "Disallow: /register",
      "Disallow: /setup",
      `Sitemap: ${base}/sitemap.xml`,
    ].join("\n"),
  );
});

router.get("/sitemap.xml", async (req, res) => {
  try {
    const tenants = await db
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
        customDomain: tenantsTable.customDomain,
        customDomainVerified: tenantsTable.customDomainVerified,
        createdAt: tenantsTable.createdAt,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.status, "active"));

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        tenantId: productsTable.tenantId,
        categoryId: productsTable.categoryId,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(eq(productsTable.status, "active"));

    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        nameAr: categoriesTable.nameAr,
        type: categoriesTable.type,
        tenantId: categoriesTable.tenantId,
      })
      .from(categoriesTable);

    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant as TenantPublic & { createdAt: Date }]));
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const seenCategoryTenant = new Set<string>();
    const now = new Date().toISOString().split("T")[0];

    const urls: string[] = [
      `  <url>
    <loc>${esc(requestBase(req))}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
    ];

    for (const tenant of tenants) {
      urls.push(`  <url>
    <loc>${esc(storeUrl(req, tenant as TenantPublic))}</loc>
    <lastmod>${tenant.createdAt ? new Date(tenant.createdAt).toISOString().split("T")[0] : now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
    }

    for (const product of products) {
      const tenant = tenantMap.get(product.tenantId);
      if (!tenant) continue;
      urls.push(`  <url>
    <loc>${esc(productUrl(req, tenant, product))}</loc>
    <lastmod>${product.createdAt ? new Date(product.createdAt).toISOString().split("T")[0] : now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);

      if (product.categoryId) {
        const category = categoryMap.get(product.categoryId);
        if (category) {
          const key = `${tenant.id}:${category.id}`;
          if (!seenCategoryTenant.has(key)) {
            seenCategoryTenant.add(key);
            urls.push(`  <url>
    <loc>${esc(categoryUrl(req, tenant, category))}</loc>
    <lastmod>${product.createdAt ? new Date(product.createdAt).toISOString().split("T")[0] : now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.65</priority>
  </url>`);
          }
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.type("application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "sitemap generation failed");
    res.status(500).send("sitemap generation failed");
  }
});

router.get("/", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantByDomain(req);
    if (!tenant) return next();
    return sendStore(req, res, tenant);
  } catch (err) {
    req.log.error({ err }, "custom-domain store SSR failed");
    return next();
  }
});

router.get("/product/:productSlug", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantByDomain(req);
    if (!tenant) return next();
    return sendProduct(req, res, next, tenant, req.params.productSlug);
  } catch (err) {
    req.log.error({ err }, "custom-domain product SSR failed");
    return next();
  }
});

router.get("/category/:categorySlug", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantByDomain(req);
    if (!tenant) return next();
    return sendCategory(req, res, next, tenant, req.params.categorySlug);
  } catch (err) {
    req.log.error({ err }, "custom-domain category SSR failed");
    return next();
  }
});

router.get("/store/:slug/product/:productSlug", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantBySlug(req.params.slug);
    if (!tenant) return next();
    return sendProduct(req, res, next, tenant, req.params.productSlug);
  } catch (err) {
    req.log.error({ err }, "store product SSR failed");
    return next();
  }
});

router.get("/store/:slug/category/:categorySlug", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantBySlug(req.params.slug);
    if (!tenant) return next();
    return sendCategory(req, res, next, tenant, req.params.categorySlug);
  } catch (err) {
    req.log.error({ err }, "store category SSR failed");
    return next();
  }
});

router.get("/store/:slug", async (req, res, next) => {
  try {
    const tenant = await getActiveTenantBySlug(req.params.slug);
    if (!tenant) return next();
    return sendStore(req, res, tenant);
  } catch (err) {
    req.log.error({ err }, "store SSR failed");
    return next();
  }
});

export default router;
