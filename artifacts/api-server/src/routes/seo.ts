import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const BOT_PATTERNS = [
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot",
  "facebookexternalhit", "twitterbot", "linkedinbot", "whatsapp", "telegrambot",
  "slackbot", "discordbot", "applebot",
];

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p));
}

function escHtml(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string | null;
  canonical: string;
  jsonLd: object;
}): string {
  const { title, description, image, canonical, jsonLd } = opts;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${escHtml(title)}"/>
  <meta property="og:description" content="${escHtml(description)}"/>
  ${image ? `<meta property="og:image" content="${escHtml(image)}"/>` : ""}
  <meta property="og:url" content="${escHtml(canonical)}"/>
  <meta property="og:locale" content="ar_EG"/>
  <meta property="og:site_name" content="نور"/>
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}"/>
  <meta name="twitter:title" content="${escHtml(title)}"/>
  <meta name="twitter:description" content="${escHtml(description)}"/>
  ${image ? `<meta name="twitter:image" content="${escHtml(image)}"/>` : ""}
  <link rel="canonical" href="${escHtml(canonical)}"/>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <h1>${escHtml(title)}</h1>
  <p>${escHtml(description)}</p>
</body>
</html>`;
}

// GET /api/seo/store/:slug — bot-only prerendered storefront meta page
router.get("/seo/store/:slug", async (req, res) => {
  const ua = req.headers["user-agent"] ?? "";

  // For non-bots, redirect to the actual storefront SPA page
  if (!isBot(ua)) {
    return res.redirect(302, `/store/${req.params.slug}`);
  }

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
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, req.params.slug));

    if (!tenant) return res.status(404).send("المتجر غير موجود");

    const appBase = process.env.APP_BASE_URL ?? `https://${req.hostname}`;
    const canonical = `${appBase}/store/${tenant.slug}`;
    const title = tenant.seoTitle ?? `${tenant.name} | نور`;
    const description = tenant.seoDescription ?? tenant.description ?? `تسوق من ${tenant.name} على منصة نور`;
    const image = tenant.coverUrl ?? tenant.logoUrl ?? null;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "name": tenant.name,
      "description": description,
      "url": canonical,
      ...(image ? { "image": image } : {}),
      ...(tenant.city ? { "location": { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": tenant.city, "addressCountry": "EG" } } } : {}),
    };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(buildHtml({ title, description, image, canonical, jsonLd }));
  } catch (err) {
    req.log.error(err);
    res.status(500).send("حدث خطأ");
  }
});

// GET /api/seo/product/:id — bot-only prerendered product meta page
router.get("/seo/product/:id", async (req, res) => {
  const ua = req.headers["user-agent"] ?? "";
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) return res.status(400).send("معرّف المنتج غير صالح");

  if (!isBot(ua)) {
    return res.redirect(302, `/products/${productId}`);
  }

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

    if (!product) return res.status(404).send("المنتج غير موجود");

    const [tenant] = await db
      .select({ name: tenantsTable.name, slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, product.tenantId));

    const appBase = process.env.APP_BASE_URL ?? `https://${req.hostname}`;
    const canonical = `${appBase}/products/${product.id}`;
    const title = `${product.name} | ${tenant?.name ?? "نور"}`;
    const description = product.description ?? `${product.name} بسعر ${product.price} ج.م`;
    const image = product.imageUrl ?? null;
    const price = parseFloat(String(product.price));
    const availability = product.stock > 0 && product.status === "active"
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": description,
      "url": canonical,
      ...(image ? { "image": image } : {}),
      "offers": {
        "@type": "Offer",
        "price": price,
        "priceCurrency": "EGP",
        "availability": availability,
        "url": canonical,
        ...(tenant?.slug ? { "seller": { "@type": "Organization", "name": tenant.name, "url": `${appBase}/store/${tenant.slug}` } } : {}),
      },
    };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(buildHtml({ title, description, image, canonical, jsonLd }));
  } catch (err) {
    req.log.error(err);
    res.status(500).send("حدث خطأ");
  }
});

export default router;
