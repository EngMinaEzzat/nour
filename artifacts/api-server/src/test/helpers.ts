import request from "supertest";
import app from "../app.js";
import { db } from "@workspace/db";
import {
  merchantsTable, tenantsTable, productsTable, ordersTable,
  orderItemsTable, discountCodesTable, billingTransferRequestsTable,
  billingInvoicesTable, orderStatusHistoryTable, merchantOnboardingTable,
  categoriesTable, productReviewsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

export { app, request };

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export interface TestCtx {
  agent: ReturnType<typeof request.agent>;
  slug: string;
  email: string;
  tenantId: number;
  merchantId: number;
  storeName: string;
}

export async function createTestMerchant(opts?: { slug?: string }): Promise<TestCtx> {
  const id = uid();
  const slug = opts?.slug ?? `test${id}`;
  const email = `test.${id}@nourtest.invalid`;
  const storeName = `TestStore ${id}`;

  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({
    storeName,
    slug,
    email,
    password: "TestPass123!",
    category: "fashion",
    description: "Auto-generated test store for automated testing",
  });

  if (res.status !== 201) {
    throw new Error(`Registration failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    agent,
    slug,
    email,
    tenantId: res.body.tenantId,
    merchantId: res.body.merchantId,
    storeName,
  };
}

export async function createTestProduct(
  agent: ReturnType<typeof request.agent>,
  override: Record<string, unknown> = {}
) {
  const res = await agent.post("/api/products").send({
    name: `Test Product ${uid()}`,
    price: 150,
    stock: 10,
    status: "active",
    ...override,
  });
  return res;
}

export async function createTestCustomer(overrides: Record<string, unknown> = {}) {
  const id = uid();
  const res = await request(app).post("/api/customers").send({
    name: `Test Customer ${id}`,
    phone: "01012345678",
    email: `customer.${id}@test.invalid`,
    ...overrides,
  });
  return res;
}

export async function createTestOrder(
  tenantId: number,
  productId: number,
  overrides: Record<string, unknown> = {}
) {
  const custRes = await createTestCustomer();
  const customerId = custRes.body.id;

  const res = await request(app)
    .post("/api/orders")
    .send({
      tenantId,
      customerId,
      customerPhone: "01012345678",
      paymentMethod: "cod",
      shippingAddress: "Test Address, Cairo",
      items: [{ productId, quantity: 1 }],
      ...overrides,
    });
  return res;
}

export async function cleanupTenant(tenantId: number, merchantId: number) {
  try {
    const orderIds = (
      await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.tenantId, tenantId))
    ).map((r) => r.id);

    if (orderIds.length) {
      await db.delete(orderStatusHistoryTable).where(inArray(orderStatusHistoryTable.orderId, orderIds));
      await db.delete(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds));
    }
    await db.delete(ordersTable).where(eq(ordersTable.tenantId, tenantId));
    await db.delete(productReviewsTable).where(eq(productReviewsTable.tenantId, tenantId));
    await db.delete(productsTable).where(eq(productsTable.tenantId, tenantId));
    await db.delete(discountCodesTable).where(eq(discountCodesTable.tenantId, tenantId));
    await db.delete(billingTransferRequestsTable).where(eq(billingTransferRequestsTable.tenantId, tenantId));
    await db.delete(billingInvoicesTable).where(eq(billingInvoicesTable.tenantId, tenantId));
    await db.delete(categoriesTable).where(eq(categoriesTable.tenantId, tenantId));
    await db.delete(merchantOnboardingTable).where(eq(merchantOnboardingTable.tenantId, tenantId));
    await db.delete(merchantsTable).where(eq(merchantsTable.id, merchantId));
    await db.delete(tenantsTable).where(eq(tenantsTable.id, tenantId));
  } catch (err) {
    console.warn("[cleanup] Non-fatal error:", err);
  }
}

export function unauthAgent() {
  return request.agent(app);
}
