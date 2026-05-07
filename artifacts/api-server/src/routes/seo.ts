import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

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

function productSlug(id: number, name: string): string {
  return `${id}-${slugPart(name)}`;
}

// Legacy API SEO endpoints now point to the universal public SSR routes.
router.get("/seo/store/:slug", (req, res) => {
  res.redirect(301, `/store/${req.params.slug}`);
});

router.get("/seo/product/:id", async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) return res.status(400).send("Invalid product id");

  try {
    const [product] = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        tenantId: productsTable.tenantId,
      })
      .from(productsTable)
      .where(eq(productsTable.id, productId));

    if (!product) return res.status(404).send("Product not found");

    const [tenant] = await db
      .select({ slug: tenantsTable.slug })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, product.tenantId));

    if (!tenant) return res.status(404).send("Store not found");

    res.redirect(301, `/store/${tenant.slug}/product/${productSlug(product.id, product.name)}`);
  } catch (err) {
    req.log.error(err);
    res.status(500).send("SEO redirect failed");
  }
});

export default router;
