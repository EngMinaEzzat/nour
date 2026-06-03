import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, backgroundJobsTable, exportJobsTable } from "@workspace/db";
import {
  claimJobs,
  processJob,
  markJobSuccess,
  markJobFailed,
} from "../jobs/worker.js";
import { eq } from "drizzle-orm";
import { createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Background Jobs Worker", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("✅ claims queued jobs and leaves locked jobs alone", async () => {
    const pastDate = new Date(Date.now() - 10000);
    const [job1] = await db
      .insert(backgroundJobsTable)
      .values({
        tenantId: ctx.tenantId,
        jobType: "test.stub",
        status: "queued",
        runAt: pastDate,
      })
      .returning();

    const [job2] = await db
      .insert(backgroundJobsTable)
      .values({
        tenantId: ctx.tenantId,
        jobType: "test.stub",
        status: "processing",
        lockedAt: new Date(),
        lockedBy: "other-worker",
        runAt: pastDate,
      })
      .returning();

    const claimed = await claimJobs();
    expect(claimed.length).toBeGreaterThan(0);
    const claimedIds = claimed.map((c) => c.id);
    expect(claimedIds).toContain(job1.id);
    expect(claimedIds).not.toContain(job2.id);

    // cleanup
    await db
      .delete(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job1.id));
    await db
      .delete(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job2.id));
  });

  it("✅ handles export.csv job successfully", async () => {
    // 1. Create a mock export job
    const [exportJob] = await db
      .insert(exportJobsTable)
      .values({
        tenantId: ctx.tenantId,
        exportType: "products",
        status: "queued",
      })
      .returning();

    // 2. Create the background job
    const [job] = await db
      .insert(backgroundJobsTable)
      .values({
        tenantId: ctx.tenantId,
        jobType: "export.csv",
        payload: { exportJobId: exportJob.id },
      })
      .returning();

    // 3. Process
    await processJob(job);

    // 4. Verify
    const [updatedBgJob] = await db
      .select()
      .from(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job.id));
    expect(updatedBgJob.status).toBe("succeeded");

    const [updatedExport] = await db
      .select()
      .from(exportJobsTable)
      .where(eq(exportJobsTable.id, exportJob.id));
    expect(updatedExport.status).toBe("complete");

    // cleanup
    await db
      .delete(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job.id));
    await db
      .delete(exportJobsTable)
      .where(eq(exportJobsTable.id, exportJob.id));
  });

  it("✅ dead-letters job after max attempts", async () => {
    const [job] = await db
      .insert(backgroundJobsTable)
      .values({
        tenantId: ctx.tenantId,
        jobType: "test.fail",
        attempts: 3,
        maxAttempts: 3,
      })
      .returning();

    await processJob(job); // it will fail because test.fail is unknown

    const [updated] = await db
      .select()
      .from(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job.id));
    expect(updated.status).toBe("failed");

    await db
      .delete(backgroundJobsTable)
      .where(eq(backgroundJobsTable.id, job.id));
  });
});
