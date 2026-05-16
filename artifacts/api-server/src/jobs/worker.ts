import crypto from "node:crypto";
import { backgroundJobsTable, db, exportJobsTable } from "@workspace/db";
import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  buildExportRows,
  toCsv,
  writeExportFile,
  type ExportType,
} from "../lib/export-csv.js";

const WORKER_ID = `worker-${crypto.randomBytes(4).toString("hex")}`;
const BATCH_SIZE = 10;
const LOCK_MINUTES = 5;

const logger = {
  info: (msg: string, ...args: unknown[]) =>
    console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) =>
    console.error(`[ERROR] ${msg}`, ...args),
};

export async function claimJobs() {
  const now = new Date();
  const lockTimeout = new Date(now.getTime() - LOCK_MINUTES * 60 * 1000);

  const jobsToClaim = await db
    .select({ id: backgroundJobsTable.id })
    .from(backgroundJobsTable)
    .where(
      and(
        lte(backgroundJobsTable.runAt, now),
        or(
          eq(backgroundJobsTable.status, "queued"),
          and(
            eq(backgroundJobsTable.status, "processing"),
            lte(backgroundJobsTable.lockedAt, lockTimeout),
          ),
        ),
      ),
    )
    .orderBy(asc(backgroundJobsTable.runAt))
    .limit(BATCH_SIZE);

  if (jobsToClaim.length === 0) return [];

  const jobIds = jobsToClaim.map((j) => j.id);
  return db
    .update(backgroundJobsTable)
    .set({
      status: "processing",
      lockedAt: now,
      lockedBy: WORKER_ID,
      attempts: sql`${backgroundJobsTable.attempts} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        inArray(backgroundJobsTable.id, jobIds),
        or(
          eq(backgroundJobsTable.status, "queued"),
          and(
            eq(backgroundJobsTable.status, "processing"),
            lte(backgroundJobsTable.lockedAt, lockTimeout),
          ),
        ),
      ),
    )
    .returning();
}

export async function markJobSuccess(id: number) {
  await db
    .update(backgroundJobsTable)
    .set({
      status: "succeeded",
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobsTable.id, id));
}

export async function markJobFailed(
  job: typeof backgroundJobsTable.$inferSelect,
  errorMsg: string,
) {
  const isDead = job.attempts >= job.maxAttempts;
  const nextRun = new Date(Date.now() + Math.pow(2, job.attempts) * 60 * 1000);

  await db
    .update(backgroundJobsTable)
    .set({
      status: isDead ? "dead" : "queued",
      lastError: errorMsg.slice(0, 1000),
      runAt: nextRun,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobsTable.id, job.id));
}

async function processExportCsv(job: typeof backgroundJobsTable.$inferSelect) {
  const payload = job.payload as { exportJobId?: number };
  if (!payload.exportJobId) throw new Error("Missing exportJobId");

  const [exportJob] = await db
    .select()
    .from(exportJobsTable)
    .where(eq(exportJobsTable.id, payload.exportJobId));
  if (!exportJob)
    throw new Error(`Export job ${payload.exportJobId} not found`);
  const downloadToken =
    exportJob.downloadToken ?? crypto.randomBytes(24).toString("hex");

  await db
    .update(exportJobsTable)
    .set({
      status: "processing",
      startedAt: new Date(),
      errorMessage: null,
      downloadToken,
    })
    .where(eq(exportJobsTable.id, exportJob.id));

  const rows = await buildExportRows({
    tenantId: exportJob.tenantId,
    exportType: exportJob.exportType as ExportType,
    dateFrom: exportJob.dateFrom,
    dateTo: exportJob.dateTo,
  });
  const csv = toCsv(rows);
  await writeExportFile(exportJob.id, downloadToken, csv);

  await db
    .update(exportJobsTable)
    .set({
      status: "complete",
      rowCount: rows.length,
      completedAt: new Date(),
      errorMessage: null,
    })
    .where(eq(exportJobsTable.id, exportJob.id));
}

export async function processJob(job: typeof backgroundJobsTable.$inferSelect) {
  logger.info(`Processing job ${job.id} of type ${job.jobType}`);
  try {
    if (job.jobType === "export.csv") {
      await processExportCsv(job);
    } else {
      throw new Error(`Unknown job type: ${job.jobType}`);
    }
    await markJobSuccess(job.id);
    logger.info(`Job ${job.id} succeeded`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown job error";
    logger.error(`Job ${job.id} failed: ${message}`);
    await markJobFailed(job, message);
  }
}

export async function runWorkerLoop() {
  logger.info(`Worker ${WORKER_ID} starting...`);

  while (true) {
    try {
      const claimed = await claimJobs();
      for (const job of claimed) {
        await processJob(job);
      }
      await new Promise((resolve) =>
        setTimeout(resolve, claimed.length === 0 ? 5000 : 1000),
      );
    } catch (err) {
      logger.error("Worker loop error", err);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerLoop().catch(console.error);
}
