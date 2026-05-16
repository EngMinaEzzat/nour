import { db } from "@workspace/db";
import { backgroundJobsTable, exportJobsTable, ordersTable, productsTable, customersTable, orderItemsTable, returnCasesTable, stockAdjustmentLogsTable } from "@workspace/db";
import { eq, and, sql, lte, asc, inArray, gte, desc } from "drizzle-orm";
import crypto from "crypto";

const WORKER_ID = `worker-${crypto.randomBytes(4).toString("hex")}`;
const BATCH_SIZE = 10;
const LOCK_MINUTES = 5;

// Basic Pino-like logger for the worker
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
};

export async function claimJobs() {
  const now = new Date();
  const lockTimeout = new Date(now.getTime() - LOCK_MINUTES * 60 * 1000);

  // We find jobs that are either queued, or processing but their lock expired
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
            lte(backgroundJobsTable.lockedAt, lockTimeout)
          )
        )
      )
    )
    .limit(BATCH_SIZE)
    .orderBy(asc(backgroundJobsTable.runAt));

  if (jobsToClaim.length === 0) return [];

  const jobIds = jobsToClaim.map(j => j.id);

  // Atomically claim
  const claimed = await db
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
            lte(backgroundJobsTable.lockedAt, lockTimeout)
          )
        )
      )
    )
    .returning();

  return claimed;
}

export async function markJobSuccess(id: number) {
  await db
    .update(backgroundJobsTable)
    .set({
      status: "succeeded",
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobsTable.id, id));
}

export async function markJobFailed(job: any, errorMsg: string) {
  const isDead = job.attempts >= job.maxAttempts;
  // exponential backoff: 2^attempts minutes
  const nextRun = new Date(Date.now() + Math.pow(2, job.attempts) * 60 * 1000);

  await db
    .update(backgroundJobsTable)
    .set({
      status: isDead ? "dead" : "queued",
      lastError: errorMsg,
      runAt: nextRun,
      lockedAt: null,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobsTable.id, job.id));
}

async function processExportCsv(job: any) {
  const payload = job.payload as { exportJobId: number };
  if (!payload.exportJobId) throw new Error("Missing exportJobId");

  const [exportJob] = await db
    .select()
    .from(exportJobsTable)
    .where(eq(exportJobsTable.id, payload.exportJobId));

  if (!exportJob) throw new Error(`Export job ${payload.exportJobId} not found`);

  // We will do the actual CSV generation logic here.
  const { tenantId, exportType, dateFrom, dateTo } = exportJob;
  
  let rows: Record<string, unknown>[] = [];
  const buildConditions = (tableTenantIdCol: any, tableDateCol: any) => {
    const conds = [eq(tableTenantIdCol, tenantId)];
    if (dateFrom) conds.push(gte(tableDateCol, new Date(dateFrom)));
    if (dateTo) conds.push(lte(tableDateCol, new Date(dateTo)));
    return and(...conds);
  };

  if (exportType === "orders") {
    const data = await db.select().from(ordersTable).where(buildConditions(ordersTable.tenantId, ordersTable.createdAt)).orderBy(desc(ordersTable.createdAt));
    rows = data.map((o) => ({ id: o.id, status: o.status, total: o.totalAmount, payment: o.paymentMethod, customer: o.customerName, phone: o.customerPhone, governorate: o.shippingGovernorate, created: o.createdAt }));
  } else if (exportType === "products") {
    const data = await db.select().from(productsTable).where(buildConditions(productsTable.tenantId, productsTable.createdAt));
    rows = data.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, status: p.status }));
  } else if (exportType === "customers") {
    const data = await db.selectDistinct({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      email: customersTable.email,
      city: customersTable.city
    })
    .from(customersTable)
    .innerJoin(ordersTable, eq(ordersTable.customerId, customersTable.id))
    .where(buildConditions(ordersTable.tenantId, ordersTable.createdAt));
    
    rows = data;
  } else if (exportType === "order_items") {
    const data = await db.select({
      orderId: ordersTable.id,
      productId: orderItemsTable.productId,
      variantId: orderItemsTable.variantId,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      created: ordersTable.createdAt
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(buildConditions(ordersTable.tenantId, ordersTable.createdAt))
    .orderBy(desc(ordersTable.createdAt));

    rows = data;
  } else if (exportType === "returns") {
    const data = await db.select().from(returnCasesTable).where(buildConditions(returnCasesTable.tenantId, returnCasesTable.createdAt));
    rows = data.map((r) => ({ id: r.id, orderId: r.orderId, status: r.status, reason: r.reason, created: r.createdAt }));
  } else if (exportType === "inventory_adjustments") {
    const data = await db.select().from(stockAdjustmentLogsTable).where(buildConditions(stockAdjustmentLogsTable.tenantId, stockAdjustmentLogsTable.createdAt));
    rows = data.map((s) => ({ id: s.id, productId: s.productId, delta: s.delta, source: s.source, reason: s.reason, created: s.createdAt }));
  }

  // Very naive CSV builder
  let csvString = "";
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    csvString = headers.join(",") + "\\n";
    csvString += rows.map(r => headers.map(h => {
      const val = r[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes("\"") || str.includes("\\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")).join("\\n");
  } else {
    csvString = "No data\\n";
  }

  // If we had object storage, we'd upload here. For now we just mark complete.
  await db.update(exportJobsTable).set({
    status: "complete",
    completedAt: new Date(),
    // Normally wouldn't store big strings in DB, but this is a placeholder
  }).where(eq(exportJobsTable.id, payload.exportJobId));

}

export async function processJob(job: any) {
  logger.info(`Processing job ${job.id} of type ${job.jobType}`);
  try {
    if (job.jobType === "export.csv") {
      await processExportCsv(job);
    } else {
      throw new Error(`Unknown job type: ${job.jobType}`);
    }
    await markJobSuccess(job.id);
    logger.info(`Job ${job.id} succeeded`);
  } catch (err: any) {
    logger.error(`Job ${job.id} failed: ${err.message}`);
    await markJobFailed(job, err.message);
  }
}

function or(...args: any[]) {
  const { or: orOriginal } = require('drizzle-orm');
  return orOriginal(...args);
}

export async function runWorkerLoop() {
  logger.info(`Worker ${WORKER_ID} starting...`);
  
  while (true) {
    try {
      const claimed = await claimJobs();
      for (const job of claimed) {
        await processJob(job);
      }
      
      // If no jobs, sleep 5 seconds. If jobs, sleep 1 second.
      await new Promise(r => setTimeout(r, claimed.length === 0 ? 5000 : 1000));
    } catch (err) {
      logger.error("Worker loop error", err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerLoop().catch(console.error);
}
