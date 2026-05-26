import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, merchantsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { app, cleanupTenant, createTestMerchant, request, uid } from "./helpers.js";

describe("Tenant management access control", () => {
  let regular: Awaited<ReturnType<typeof createTestMerchant>>;
  let platform: Awaited<ReturnType<typeof createTestMerchant>>;
  let platformCreatedTenantId: number | null = null;

  beforeAll(async () => {
    regular = await createTestMerchant();
    platform = await createTestMerchant();
    await db
      .update(merchantsTable)
      .set({ isPlatformAdmin: true })
      .where(eq(merchantsTable.id, platform.merchantId));
  });

  afterAll(async () => {
    if (platformCreatedTenantId) {
      await db.delete(tenantsTable).where(eq(tenantsTable.id, platformCreatedTenantId));
    }
    await cleanupTenant(regular.tenantId, regular.merchantId);
    await cleanupTenant(platform.tenantId, platform.merchantId);
  });

  it("requires authentication for tenant management endpoints", async () => {
    const list = await request(app).get("/api/tenants");
    const create = await request(app).post("/api/tenants").send({
      name: "Direct Tenant",
      slug: `direct-${uid()}`,
      description: "Should be rejected without auth",
      category: "fashion",
    });
    const get = await request(app).get(`/api/tenants/${regular.tenantId}`);
    const stats = await request(app).get(`/api/tenants/${regular.tenantId}/stats`);

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(get.status).toBe(401);
    expect(stats.status).toBe(401);
  });

  it("rejects regular merchants from direct tenant management", async () => {
    const list = await regular.agent.get("/api/tenants");
    const create = await regular.agent.post("/api/tenants").send({
      name: "Direct Tenant",
      slug: `direct-${uid()}`,
      description: "Should be rejected for merchants",
      category: "fashion",
    });
    const get = await regular.agent.get(`/api/tenants/${regular.tenantId}`);
    const stats = await regular.agent.get(`/api/tenants/${regular.tenantId}/stats`);

    expect(list.status).toBe(403);
    expect(create.status).toBe(403);
    expect(get.status).toBe(403);
    expect(stats.status).toBe(403);
  });

  it("allows platform admins to manage direct tenant records", async () => {
    const list = await platform.agent.get("/api/tenants");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const slug = `platform-direct-${uid()}`;
    const create = await platform.agent.post("/api/tenants").send({
      name: "Platform Direct Tenant",
      slug,
      description: "Created by platform admin only",
      category: "fashion",
    });
    expect(create.status).toBe(201);
    platformCreatedTenantId = create.body.id;

    const get = await platform.agent.get(`/api/tenants/${platformCreatedTenantId}`);
    expect(get.status).toBe(200);
    expect(get.body.slug).toBe(slug);

    const stats = await platform.agent.get(`/api/tenants/${platformCreatedTenantId}/stats`);
    expect(stats.status).toBe(200);
    expect(stats.body.tenantId).toBe(platformCreatedTenantId);
  });
});
