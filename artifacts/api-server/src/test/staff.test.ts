import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  request, app, uid, createTestMerchant, cleanupTenant,
} from "./helpers.js";

describe("Staff — CRUD", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let staffMemberId: number;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ owner can list staff members", async () => {
    const res = await ctx.agent.get("/api/staff");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should include at least the owner
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("✅ owner can add staff member (201)", async () => {
    const id = uid();
    const res = await ctx.agent.post("/api/staff").send({
      email: `staff.${id}@test.invalid`,
      name: `Staff ${id}`,
      password: "StaffPass123!",
      role: "staff",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.role).toBe("staff");
    staffMemberId = res.body.id;
  });

  it("✅ owner can change staff role", async () => {
    const res = await ctx.agent.put(`/api/staff/${staffMemberId}`).send({
      role: "manager",
    });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("manager");
  });

  it("✅ owner can delete staff member (204)", async () => {
    const res = await ctx.agent.delete(`/api/staff/${staffMemberId}`);
    expect(res.status).toBe(204);
  });

  it("❌ add staff without auth returns 401", async () => {
    const res = await request(app).post("/api/staff").send({
      email: `noauth.${uid()}@test.invalid`,
      name: "NoAuth",
      password: "Pass123!",
      role: "staff",
    });
    expect(res.status).toBe(401);
  });

  it("❌ add duplicate email returns 409", async () => {
    const id = uid();
    const email = `dup.${id}@test.invalid`;
    // First create succeeds
    const first = await ctx.agent.post("/api/staff").send({
      email, name: "Dup", password: "Pass123!", role: "staff",
    });
    expect(first.status).toBe(201);
    // Second with same email fails
    const second = await ctx.agent.post("/api/staff").send({
      email, name: "Dup2", password: "Pass456!", role: "staff",
    });
    expect(second.status).toBe(409);
  });

  it("❌ owner cannot delete self", async () => {
    const res = await ctx.agent.delete(`/api/staff/${ctx.merchantId}`);
    expect(res.status).toBe(400);
  });

  it("❌ owner cannot change own role", async () => {
    const res = await ctx.agent.put(`/api/staff/${ctx.merchantId}`).send({
      role: "staff",
    });
    expect(res.status).toBe(400);
  });

  it("❌ list staff without auth returns 401", async () => {
    const res = await request(app).get("/api/staff");
    expect(res.status).toBe(401);
  });
});

describe("Staff — Invitations", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
  let inviteToken: string;

  beforeAll(async () => { ctx = await createTestMerchant(); });
  afterAll(async () => { await cleanupTenant(ctx.tenantId, ctx.merchantId); });

  it("✅ owner can send invitation (201)", async () => {
    const res = await ctx.agent.post("/api/staff/invitations").send({
      email: `invite.${uid()}@test.invalid`,
      role: "staff",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("inviteLink");
    // Extract token from response
    inviteToken = res.body.token;
    expect(inviteToken).toBeDefined();
  });

  it("✅ invitation preview shows details", async () => {
    const res = await request(app).get(`/api/staff/invitations/preview/${inviteToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("invitedEmail");
    expect(res.body).toHaveProperty("tenantName");
    expect(res.body.role).toBe("staff");
  });

  it("✅ accept invitation creates merchant account", async () => {
    const res = await request(app).post(`/api/staff/invitations/${inviteToken}/accept`).send({
      name: "New Staff",
      password: "StaffPass123!",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("merchantId");
  });

  it("❌ accept already-accepted invitation fails", async () => {
    const res = await request(app).post(`/api/staff/invitations/${inviteToken}/accept`).send({
      name: "Again",
      password: "Pass123!",
    });
    expect([404, 409, 410]).toContain(res.status);
  });

  it("❌ preview nonexistent token returns 404", async () => {
    const res = await request(app).get("/api/staff/invitations/preview/nonexistent-token");
    expect(res.status).toBe(404);
  });

  it("❌ accept invitation without name/password returns 400", async () => {
    // Create a new invitation to test with
    const invRes = await ctx.agent.post("/api/staff/invitations").send({
      email: `nopw.${uid()}@test.invalid`, role: "staff",
    });
    expect(invRes.status).toBe(201);
    const token = invRes.body.token;

    const res = await request(app).post(`/api/staff/invitations/${token}/accept`).send({});
    expect(res.status).toBe(400);
  });

  it("✅ owner can list pending invitations", async () => {
    const res = await ctx.agent.get("/api/staff/invitations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("✅ owner can revoke invitation", async () => {
    const invRes = await ctx.agent.post("/api/staff/invitations").send({
      email: `revoke.${uid()}@test.invalid`, role: "staff",
    });
    expect(invRes.status).toBe(201);
    const res = await ctx.agent.delete(`/api/staff/invitations/${invRes.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("❌ cross-tenant: tenant B can't see tenant A's invitations", async () => {
    const other = await createTestMerchant();
    const res = await other.agent.get("/api/staff/invitations");
    expect(res.status).toBe(200);
    // Should not contain any of tenant A's invitations
    expect(res.body.every((i: { tenantId: number }) => i.tenantId === other.tenantId)).toBe(true);
    await cleanupTenant(other.tenantId, other.merchantId);
  });
});
