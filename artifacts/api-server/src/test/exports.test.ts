import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as exportCsv from "../lib/export-csv.js";
import { db, exportJobsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  request,
  app,
  uid,
  createTestMerchant,
  createTestProduct,
  createTestOrder,
  cleanupTenant,
} from "./helpers.js";

describe("Exports - CSV Export", () => {
  let ctx1: Awaited<ReturnType<typeof createTestMerchant>>;
  let ctx2: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx1 = await createTestMerchant();
    ctx2 = await createTestMerchant();

    const p1 = await createTestProduct(ctx1.agent, {
      name: `Export Prod 1 ${uid()}`,
      price: 100,
      stock: 10,
    });
    const p2 = await createTestProduct(ctx2.agent, {
      name: `Export Prod 2 ${uid()}`,
      price: 100,
      stock: 10,
    });

    await createTestOrder(ctx1.tenantId, p1.body.id);
    await createTestOrder(ctx2.tenantId, p2.body.id);
  });

  afterAll(async () => {
    await cleanupTenant(ctx1.tenantId, ctx1.merchantId);
    await cleanupTenant(ctx2.tenantId, ctx2.merchantId);
  });

  it("returns downloadable order CSV by default", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "orders" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("id");
  });

  it("returns tenant-scoped product CSV by default", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "products" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Export Prod 1");
    expect(res.text).not.toContain("Export Prod 2");
  });

  it("returns customer CSV by default", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "customers" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });

  it("exports order_items as tenant-scoped CSV", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "order_items" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });

  it("applies date filtering", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "orders", dateFrom: futureDate });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });

  it("enqueues async export jobs and returns a download URL", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "orders", async: true });

    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.downloadUrl).toBe(
      `/api/exports/${res.body.jobId}/download`,
    );
  });

  it("lists export jobs and omits downloadToken", async () => {
    const res = await ctx1.agent.get("/api/exports");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0].downloadToken).toBeUndefined();
    }
  });

  it("rejects export without auth", async () => {
    const res = await request(app)
      .post("/api/exports")
      .send({ exportType: "orders" });

    expect(res.status).toBe(401);
  });

  it("rejects invalid export type", async () => {
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "invalid_type" });

    expect(res.status).toBe(400);
  });

  it("rejects listing exports without auth", async () => {
    const res = await request(app).get("/api/exports");

    expect(res.status).toBe(401);
  });

  it("handles and logs errors during sync export generation", async () => {
    // Mock buildExportRows to throw an intentional error
    const mockError = new Error("Mocked export failure");
    const spy = vi.spyOn(exportCsv, "buildExportRows").mockRejectedValueOnce(mockError);

    // Call the synchronous export endpoint
    const res = await ctx1.agent
      .post("/api/exports")
      .send({ exportType: "orders" });

    // Ensure we get a 500 response
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("فشل التصدير");

    // Fetch the most recent export job to verify the catch block updated its status
    const [failedJob] = await db
      .select()
      .from(exportJobsTable)
      .where(eq(exportJobsTable.tenantId, ctx1.tenantId))
      .orderBy(desc(exportJobsTable.createdAt))
      .limit(1);

    expect(failedJob).toBeDefined();
    expect(failedJob.status).toBe("failed");
    expect(failedJob.errorMessage).toContain("Mocked export failure");

    // Restore the spy
    spy.mockRestore();
  });
});