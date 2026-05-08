import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

describe("Automation Rules — CRUD", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let ruleId: number;

  beforeAll(async () => {
    ctx = await createTestMerchant();
    // Upgrade tenant to growth plan so automation is allowed
    await db.update(tenantsTable).set({ planCode: "growth" }).where(eq(tenantsTable.id, ctx.tenantId));
  });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ create automation rule returns 201", async () => {
    const res = await ctx.agent.post("/api/automation/rules").send({
      name: "تأكيد الطلب تلقائياً",
      trigger: "order_created",
      action: "send_whatsapp",
      config: { templateId: "order_confirm" },
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("تأكيد الطلب تلقائياً");
    expect(res.body.trigger).toBe("order_created");
    ruleId = res.body.id;
  });

  it("✅ list rules returns tenant-scoped", async () => {
    const res = await ctx.agent.get("/api/automation/rules");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r: { id: number }) => r.id === ruleId)).toBe(true);
  });

  it("✅ update rule changes config", async () => {
    const res = await ctx.agent.put(`/api/automation/rules/${ruleId}`).send({
      name: "اسم جديد",
      isEnabled: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("اسم جديد");
    expect(res.body.isEnabled).toBe(false);
  });

  it("✅ delete rule returns success", async () => {
    const create = await ctx.agent.post("/api/automation/rules").send({
      name: "للحذف", trigger: "order_created", action: "alert_merchant",
    });
    expect(create.status).toBe(201);
    const res = await ctx.agent.delete(`/api/automation/rules/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("❌ create without auth returns 401", async () => {
    const res = await request(app).post("/api/automation/rules").send({
      name: "Test", trigger: "order_created", action: "send_whatsapp",
    });
    expect(res.status).toBe(401);
  });

  it("❌ create with invalid trigger returns 400", async () => {
    const res = await ctx.agent.post("/api/automation/rules").send({
      name: "Bad Trigger", trigger: "invalid_trigger", action: "send_whatsapp",
    });
    expect(res.status).toBe(400);
  });

  it("❌ create with invalid action returns 400", async () => {
    const res = await ctx.agent.post("/api/automation/rules").send({
      name: "Bad Action", trigger: "order_created", action: "invalid_action",
    });
    expect(res.status).toBe(400);
  });

  it("❌ create without name returns 400", async () => {
    const res = await ctx.agent.post("/api/automation/rules").send({
      trigger: "order_created", action: "send_whatsapp",
    });
    expect(res.status).toBe(400);
  });

  it("❌ update rule from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    await db.update(tenantsTable).set({ planCode: "growth" }).where(eq(tenantsTable.id, other.tenantId));
    const res = await other.agent.put(`/api/automation/rules/${ruleId}`).send({
      name: "hijack",
    });
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });

  it("❌ delete rule from another tenant returns 403", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.delete(`/api/automation/rules/${ruleId}`);
    expect(res.status).toBe(403);
    await cleanupTenant(other.tenantId, other.merchantId);
  });
});

describe("Automation Rules — Plan Gating", () => {
  it("❌ starter plan rejects automation (402)", async () => {
    const ctx = await createTestMerchant();
    // Tenant starts on starter by default
    const res = await ctx.agent.post("/api/automation/rules").send({
      name: "Gated Rule", trigger: "order_created", action: "send_whatsapp",
    });
    expect(res.status).toBe(402);
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });
});
