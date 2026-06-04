import { performance } from "node:perf_hooks";
import { logger } from "./src/logger.ts";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const SLUG = process.argv[2];

if (!SLUG) {
  logger.error("Usage: node scripts/phase7-load-smoke.mjs <store-slug>");
  process.exit(1);
}

async function measure(name, fn) {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    logger.success("%s: %sms", name, duration.toFixed(2));
  } catch (err) {
    const duration = performance.now() - start;
    logger.error("%s: %sms - %s", name, duration.toFixed(2), err.message);
  }
}

async function run() {
  logger.info("Starting load smoke against %s for store %s", BASE_URL, SLUG);

  await measure("Health Check (/api/healthz)", async () => {
    const res = await fetch(`${BASE_URL}/api/healthz`);
    if (!res.ok) throw new Error("Healthz failed");
  });

  await measure("Public Storefront Home", async () => {
    const res = await fetch(`${BASE_URL}/api/store/${SLUG}`);
    if (!res.ok) throw new Error("Storefront home failed");
  });

  // Attempt to hit the admin orders endpoint (requires auth, so we expect 401 without auth, but we can measure the rejection speed or implement a test login)
  await measure("Admin Orders Rejection (unauth)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });
}

run().catch((err) => logger.error("Unhandled error: %s", err.message));