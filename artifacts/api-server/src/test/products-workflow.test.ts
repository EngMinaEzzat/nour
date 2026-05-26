import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, categoriesTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  request, app, uid, createTestMerchant, createTestProduct, cleanupTenant,
} from "./helpers.js";

describe("Products - tenant workflow isolation", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let other: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    other = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("rejects a category from another tenant on product create/update", async () => {
    const [foreignCategory] = await db
      .insert(categoriesTable)
      .values({
        tenantId: other.tenantId,
        name: `Foreign ${uid()}`,
        nameAr: "Foreign category",
        type: "fashion",
      })
      .returning();

    const createRes = await ctx.agent.post("/api/products").send({
      name: `Category Guard ${uid()}`,
      price: 100,
      stock: 5,
      status: "active",
      categoryId: foreignCategory.id,
    });
    expect(createRes.status).toBe(400);

    const product = await createTestProduct(ctx.agent, { name: `Owned ${uid()}`, price: 150, stock: 3 });
    const updateRes = await ctx.agent.put(`/api/products/${product.body.id}`).send({
      categoryId: foreignCategory.id,
    });
    expect(updateRes.status).toBe(400);
  });

  it("hides inactive tenant products and variants from public callers while preserving owner access", async () => {
    const product = await createTestProduct(ctx.agent, { name: `Inactive ${uid()}`, price: 200, stock: 4 });
    const variant = await ctx.agent.post(`/api/products/${product.body.id}/variants`).send({
      size: "M",
      color: "Black",
      stock: 4,
    });
    expect(variant.status).toBe(201);

    await db.update(tenantsTable).set({ status: "inactive" }).where(eq(tenantsTable.id, ctx.tenantId));

    const publicProduct = await request(app).get(`/api/products/${product.body.id}`);
    expect(publicProduct.status).toBe(404);

    const publicVariants = await request(app).get(`/api/products/${product.body.id}/variants`);
    expect(publicVariants.status).toBe(404);

    const ownerProduct = await ctx.agent.get(`/api/products/${product.body.id}`);
    expect(ownerProduct.status).toBe(200);

    const ownerVariants = await ctx.agent.get(`/api/products/${product.body.id}/variants`);
    expect(ownerVariants.status).toBe(200);
    expect(ownerVariants.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: variant.body.id })]),
    );

    await db.update(tenantsTable).set({ status: "active" }).where(eq(tenantsTable.id, ctx.tenantId));
  });
});
