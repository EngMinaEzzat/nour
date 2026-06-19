import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, cleanupTenant,
} from "./helpers.js";

describe("Smoke Test — End-to-End COD Flow", () => {
  let tenantId: number;
  let merchantId: number;
  let slug: string;
  let productId: number;
  let orderId: number;
  let customerId: number;
  let agent: ReturnType<typeof request.agent>;

  afterAll(async () => {
    if (tenantId && merchantId) {
      await cleanupTenant(tenantId, merchantId);
    }
  });

  it("✅ completely executes the E2E COD flow", async () => {
    // 1. Merchant registers store
    const id = uid();
    slug = `smoke${id}`;
    agent = request.agent(app);
    
    let res = await agent.post("/api/auth/register").send({
      storeName: `Smoke Store ${id}`,
      slug,
      email: `smoke.${id}@test.invalid`,
      password: "TestPass123!",
      category: "fashion",
      phone: "01099999999",
      description: "Automated smoke-test store",
    });
    
    expect(res.status).toBe(201);
    tenantId = res.body.tenantId;
    merchantId = res.body.merchantId;

    // 2. Merchant creates a product
    res = await agent.post("/api/products").send({
      name: "Smoke Test Product",
      price: 250,
      stock: 10,
      status: "active",
    });
    
    expect(res.status).toBe(201);
    productId = res.body.id;

    // 3. Merchant configures shipping zones
    res = await agent.post("/api/shipping/zones").send({
      governorate: "القاهرة",
      shippingCost: 50,
      deliveryDays: 2,
    });
    expect(res.status).toBe(201);

    // 4. Public storefront shows product
    res = await request(app).get(`/api/store/${slug}`);
    expect(res.status).toBe(200);
    const ids = res.body.products.map((p: { id: number }) => p.id);
    expect(ids).toContain(productId);

    // 5. Customer registers during checkout
    res = await request(app).post("/api/customers").send({
      name: "Smoke Customer",
      email: `smoke.customer.${id}@test.invalid`,
      phone: "01099999999",
      tenantId,
    });
    expect([200, 201]).toContain(res.status);
    customerId = res.body.id;

    // 6. Customer calculates shipping
    res = await request(app).post("/api/shipping/calculate").send({
      tenantId,
      governorate: "القاهرة",
    });
    expect(res.status).toBe(200);
    expect(res.body.shippingCost).toBe(50);

    // 7. Customer places COD order
    res = await request(app).post("/api/orders").send({
      tenantId,
      customerId,
      customerPhone: "01099999999",
      paymentMethod: "cod",
      shippingAddress: "Street 1, Cairo",
      items: [{ productId, quantity: 2 }],
    });
    
    expect([200, 201]).toContain(res.status);
    orderId = res.body.id;
    expect(res.body.status).toBe("pending");

    // 8. Product stock is decremented
    res = await request(app).get(`/api/store/${slug}`);
    let product = res.body.products.find((p: { id: number }) => p.id === productId);
    expect(product.stock).toBe(8);

    // 9. Merchant confirms order
    res = await agent.put(`/api/orders/${orderId}`).send({
      status: "confirmed",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("confirmed");

    // 10. Merchant dispatches order
    res = await agent.put(`/api/orders/${orderId}`).send({
      status: "shipped",
    });
    expect(res.status).toBe(200);

    // 11. Merchant delivers order
    res = await agent.put(`/api/orders/${orderId}`).send({
      status: "delivered",
    });
    expect(res.status).toBe(200);

    // 12. Merchant reviews analytics
    res = await agent.get("/api/analytics/merchant");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("grossRevenue");
    expect(res.body).toHaveProperty("totalOrders");

    // 13. Order is returned (stock restored)
    res = await agent.put(`/api/orders/${orderId}`).send({
      status: "returned",
    });
    expect(res.status).toBe(200);

    const productRes = await request(app).get(`/api/store/${slug}`);
    product = productRes.body.products.find((p: { id: number }) => p.id === productId);
    expect(product.stock).toBe(10);
  }, 120_000);
});
