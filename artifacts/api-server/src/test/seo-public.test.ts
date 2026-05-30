import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { app, request, createTestMerchant, createTestProduct, cleanupTenant } from "./helpers.js";
import { db } from "@workspace/db";
import { categoriesTable, tenantsTable } from "@workspace/db";

function publicSlug(id: number, name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${id}-${slug || "item"}`;
}

describe("Public storefront SSR and SEO", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let category: { id: number; name: string; nameAr: string };
  let product: { id: number; name: string };
  let hiddenProduct: { id: number; name: string };

  beforeAll(async () => {
    ctx = await createTestMerchant();
    const [createdCategory] = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name, nameAr: categoriesTable.nameAr })
      .from(categoriesTable)
      .where(eq(categoriesTable.tenantId, ctx.tenantId))
      .limit(1);
    category = createdCategory;

    const productRes = await createTestProduct(ctx.agent, {
      name: "LCP Dress",
      description: "Fast first paint product description",
      price: 499,
      imageUrl: "/uploads/lcp-dress.webp",
      categoryId: category.id,
      stock: 7,
      status: "active",
    });
    expect(productRes.status).toBe(201);
    product = { id: productRes.body.id, name: productRes.body.name };

    const hiddenRes = await createTestProduct(ctx.agent, {
      name: "Hidden SEO Product",
      description: "This product must not be crawled",
      categoryId: category.id,
      status: "hidden",
    });
    expect(hiddenRes.status).toBe(201);
    hiddenProduct = { id: hiddenRes.body.id, name: hiddenRes.body.name };
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("serves store content, metadata, and JSON-LD in raw HTML for normal users", async () => {
    const res = await request(app).get(`/store/${ctx.slug}`).set("User-Agent", "Mozilla/5.0");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain(ctx.storeName);
    expect(res.text).toContain(`rel="alternate" hreflang="ar"`);
    expect(res.text).toContain(`rel="alternate" hreflang="en"`);
    expect(res.text).toContain(`rel="preload" as="style" href="https://fonts.googleapis.com`);
    expect(res.text).toContain(product.name);
    expect(res.text).not.toContain(hiddenProduct.name);
    expect(res.text).toContain(`rel="canonical"`);
    expect(res.text).toContain(`/store/${ctx.slug}`);
    expect(res.text).toContain("application/ld+json");
    expect(res.text).toContain("OnlineStore");
    expect(res.text).toContain("BreadcrumbList");
  });

  it("serves product content, price, availability, image, and Product JSON-LD in raw HTML", async () => {
    const res = await request(app)
      .get(`/store/${ctx.slug}/product/${publicSlug(product.id, product.name)}`)
      .set("User-Agent", "Mozilla/5.0");

    expect(res.status).toBe(200);
    expect(res.text).toContain(product.name);
    expect(res.text).toContain("499");
    expect(res.text).toContain("InStock");
    expect(res.text).toContain("/uploads/lcp-dress.webp");
    expect(res.text).toContain('srcset="/api/images/resize');
    expect(res.text).toContain('"@type":"Product"');
    expect(res.text).toContain('"sku":"' + product.id + '"');
    expect(res.text).toContain('"brand":{');
    expect(res.text).toContain("BreadcrumbList");
  });

  it("serves category pages with crawlable product links and category metadata", async () => {
    const res = await request(app)
      .get(`/store/${ctx.slug}/category/${publicSlug(category.id, category.nameAr || category.name)}`)
      .set("User-Agent", "Mozilla/5.0");

    expect(res.status).toBe(200);
    expect(res.text).toContain(category.nameAr || category.name);
    expect(res.text).toContain(product.name);
    expect(res.text).toContain("CollectionPage");
    expect(res.text).toContain("ItemList");
  });

  it("keeps sitemap public-only and handles sitemap chunking", async () => {
    const resIndex = await request(app).get("/sitemap.xml");
    expect(resIndex.status).toBe(200);
    expect(resIndex.text).toContain("<sitemapindex");
    expect(resIndex.text).toContain("/sitemap-1.xml");

    const res = await request(app).get("/sitemap-1.xml");
    expect(res.status).toBe(200);
    expect(res.text).toContain(`/store/${ctx.slug}`);
    expect(res.text).toContain(`/store/${ctx.slug}/product/${publicSlug(product.id, product.name)}`);
    expect(res.text).toContain(`/store/${ctx.slug}/category/${publicSlug(category.id, category.nameAr || category.name)}`);
    expect(res.text).not.toContain(`/product/${hiddenProduct.id}-`);
    expect(res.text).not.toContain("/dashboard");
    expect(res.text).not.toContain("/api/");
  });

  it("uses one custom-domain canonical when a store domain is verified", async () => {
    await db
      .update(tenantsTable)
      .set({ customDomain: "shop.example.com", customDomainVerified: true })
      .where(and(eq(tenantsTable.id, ctx.tenantId), eq(tenantsTable.slug, ctx.slug)));

    const res = await request(app).get(`/store/${ctx.slug}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('rel="canonical" href="https://shop.example.com/"');
    expect(res.text).not.toContain(`rel="canonical" href="http://127.0.0.1:${ctx.slug}`);
  });

  it("blocks admin and private API surfaces in robots.txt", async () => {
    const res = await request(app).get("/robots.txt");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Disallow: /api/");
    expect(res.text).toContain("Disallow: /dashboard");
    expect(res.text).toContain("Disallow: /store-settings");
    expect(res.text).toContain("Sitemap:");
  });
});
