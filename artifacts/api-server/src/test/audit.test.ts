import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, createTestMerchant, cleanupTenant, type TestCtx, unauthAgent } from "./helpers.js";
import { db } from "@workspace/db";
import { tenantAuditEventsTable, merchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("Audit Routes", () => {
  let merchantCtx: TestCtx;
  let adminCtx: TestCtx;
  let otherCtx: TestCtx;

  beforeAll(async () => {
    // 1. Regular merchant
    merchantCtx = await createTestMerchant();

    // 2. Platform Admin
    adminCtx = await createTestMerchant();
    await db
      .update(merchantsTable)
      .set({ isPlatformAdmin: true })
      .where(eq(merchantsTable.id, adminCtx.merchantId));

    // 3. Another merchant to verify isolation
    otherCtx = await createTestMerchant();

    // Insert some dummy audit events
    await db.insert(tenantAuditEventsTable).values([
      {
        tenantId: merchantCtx.tenantId,
        actorId: merchantCtx.merchantId,
        eventType: "product_deleted",
        summary: "Product A deleted",
      },
      {
        tenantId: merchantCtx.tenantId,
        actorId: merchantCtx.merchantId,
        eventType: "plan_changed",
        summary: "Upgraded plan",
      },
      {
        tenantId: otherCtx.tenantId,
        actorId: otherCtx.merchantId,
        eventType: "product_deleted",
        summary: "Product B deleted",
      }
    ]);
  });

  afterAll(async () => {
    if (merchantCtx) await cleanupTenant(merchantCtx.tenantId, merchantCtx.merchantId);
    if (adminCtx) await cleanupTenant(adminCtx.tenantId, adminCtx.merchantId);
    if (otherCtx) await cleanupTenant(otherCtx.tenantId, otherCtx.merchantId);
  });

  describe("GET /api/audit/events/my", () => {
    it("✅ should get own tenant audit events", async () => {
      const res = await merchantCtx.agent.get("/api/audit/events/my");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.map((e: any) => e.eventType)).toEqual(expect.arrayContaining(["product_deleted", "plan_changed"]));
    });

    it("❌ should reject unauthenticated requests", async () => {
      const res = await unauthAgent().get("/api/audit/events/my");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/audit/events", () => {
    it("✅ platform admin sees all events without filters", async () => {
      const res = await adminCtx.agent.get("/api/audit/events");
      expect(res.status).toBe(200);
      const events = res.body;
      const myTenantEvents = events.filter((e: any) => e.tenantId === merchantCtx.tenantId);
      const otherTenantEvents = events.filter((e: any) => e.tenantId === otherCtx.tenantId);

      expect(myTenantEvents.length).toBeGreaterThanOrEqual(2);
      expect(otherTenantEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("✅ platform admin can filter by tenantId", async () => {
      const res = await adminCtx.agent.get(`/api/audit/events?tenantId=${merchantCtx.tenantId}`);
      expect(res.status).toBe(200);
      const events = res.body;

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.every((e: any) => e.tenantId === merchantCtx.tenantId)).toBe(true);
    });

    it("✅ platform admin can filter by eventType", async () => {
      const res = await adminCtx.agent.get(`/api/audit/events?eventType=plan_changed`);
      expect(res.status).toBe(200);
      const events = res.body;

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.every((e: any) => e.eventType === "plan_changed")).toBe(true);
    });

    it("✅ platform admin can filter by both tenantId and eventType", async () => {
      const res = await adminCtx.agent.get(`/api/audit/events?tenantId=${merchantCtx.tenantId}&eventType=product_deleted`);
      expect(res.status).toBe(200);
      const events = res.body;

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.every((e: any) => e.tenantId === merchantCtx.tenantId && e.eventType === "product_deleted")).toBe(true);
    });

    it("❌ regular merchant is forbidden from platform admin route", async () => {
      const res = await merchantCtx.agent.get("/api/audit/events");
      expect(res.status).toBe(403);
    });

    it("❌ unauthenticated request is rejected", async () => {
      const res = await unauthAgent().get("/api/audit/events");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/audit/logs", () => {
    it("✅ should act as an alias for /audit/events/my", async () => {
      const res = await merchantCtx.agent.get("/api/audit/logs");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.map((e: any) => e.eventType)).toEqual(expect.arrayContaining(["product_deleted", "plan_changed"]));
    });

    it("❌ should reject unauthenticated requests", async () => {
      const res = await unauthAgent().get("/api/audit/logs");
      expect(res.status).toBe(401);
    });
  });
});
