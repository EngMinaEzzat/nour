import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import {
  merchantsTable,
  tenantsTable,
  productsTable,
  categoriesTable,
  ordersTable,
  customersTable,
} from "@workspace/db";

async function main() {
  if (process.env.NODE_ENV !== "test" && process.env.MATJAREG_TEST_DATABASE_OK !== "true") {
    console.error("ERROR: Destructive seed scripts require NODE_ENV=test or MATJAREG_TEST_DATABASE_OK=true");
    process.exit(1);
  }

  console.log("Seeding scale data...");
  const slug = `scale-test-${randomBytes(4).toString("hex")}`;
  
  const [tenant] = await db.insert(tenantsTable).values({
    name: "Scale Test Store",
    slug,
    description: "Scale test store for phase 7 performance baseline",
    category: "fashion",
    status: "active",
  }).returning();
  
  const [merchant] = await db.insert(merchantsTable).values({
    tenantId: tenant.id,
    email: `merchant@${slug}.invalid`,
    passwordHash: "dummy",
    role: "owner",
  }).returning();

  console.log(`Created tenant: ${slug} (ID: ${tenant.id})`);

  // Insert 50 categories
  const categoriesToInsert = Array.from({ length: 50 }).map((_, i) => ({
    tenantId: tenant.id,
    name: `Category ${i}`,
    nameAr: `تصنيف ${i}`,
    slug: `category-${i}`,
    type: "fashion" as const,
  }));
  const insertedCats = await db.insert(categoriesTable).values(categoriesToInsert).returning();

  // Insert 1000 products
  const productsToInsert = Array.from({ length: 1000 }).map((_, i) => ({
    tenantId: tenant.id,
    name: `Scale Product ${i}`,
    description: `Description for Scale Product ${i}`,
    slug: `scale-product-${i}`,
    price: (Math.random() * 1000).toFixed(2),
    stock: 100,
    status: "active" as const,
    categoryId: insertedCats[i % insertedCats.length].id,
  }));
  
  const chunkPromises = [];
  for (let i = 0; i < productsToInsert.length; i += 500) {
    const chunk = productsToInsert.slice(i, i + 500);
    chunkPromises.push(db.insert(productsTable).values(chunk).returning());
  }
  const chunkResults = await Promise.all(chunkPromises);
  const insertedProds = chunkResults.flat();
  console.log(`Inserted 1000 products`);

  // Insert Customers and Orders
  console.log(`Inserting 2000 orders...`);
  const allCustomers = Array.from({ length: 2000 }).map((_, i) => ({
    name: `Customer ${i}`,
    email: `customer${i}@${slug}.invalid`,
    phone: `010${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
  }));

  const custPromises = [];
  for (let i = 0; i < allCustomers.length; i += 500) {
    const chunk = allCustomers.slice(i, i + 500);
    custPromises.push(db.insert(customersTable).values(chunk).returning());
  }
  const custResults = await Promise.all(custPromises);
  const insertedCustsFlat = custResults.flat();

  const allOrders = insertedCustsFlat.map((c) => ({
    tenantId: tenant.id,
    customerId: c.id,
    status: "pending" as const,
    totalAmount: (Math.random() * 1000).toFixed(2),
    publicCode: randomBytes(6).toString("hex").toUpperCase(),
    trackingToken: randomBytes(16).toString("hex"),
  }));

  const orderPromises = [];
  for(let i = 0; i < allOrders.length; i += 500) {
    const chunk = allOrders.slice(i, i + 500);
    orderPromises.push(db.insert(ordersTable).values(chunk));
  }
  await Promise.all(orderPromises);

  console.log("Scale seed complete.");
  console.log(`Store Slug: ${slug}`);
}

main().catch(console.error);