import { performance } from "node:perf_hooks";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const SLUG = process.argv[2];

if (!SLUG) {
  console.error("Usage: node scripts/phase7-load-smoke.mjs <store-slug>");
  process.exit(1);
}

async function measure(name, fn) {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    console.log(`[PASS] ${name}: ${duration.toFixed(2)}ms`);
  } catch (err) {
    const duration = performance.now() - start;
    console.log(`[FAIL] ${name}: ${duration.toFixed(2)}ms - ${err.message}`);
  }
}

async function run() {
  console.log(`Starting load smoke against ${BASE_URL} for store ${SLUG}`);

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

run().catch(console.error);