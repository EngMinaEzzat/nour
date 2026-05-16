import { parseArgs } from "node:util";
import fetch from "node:fetch";
import { performance } from "node:perf_hooks";

const { values } = parseArgs({
  options: {
    "base-url": {
      type: "string",
      default: "http://localhost:8080",
    },
    "tenant-slug": {
      type: "string",
    },
  },
  strict: false,
});

const baseUrl = values["base-url"];
const slug = values["tenant-slug"];

console.log(`Starting Operational Smoke Test against ${baseUrl}`);

async function check(name, url, expectedStatus = 200, checkBody = null) {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const duration = performance.now() - start;
    if (res.status !== expectedStatus) {
      console.error(`[FAIL] ${name}: Expected ${expectedStatus}, got ${res.status} (${duration.toFixed(2)}ms)`);
      process.exitCode = 1;
      return;
    }
    if (checkBody) {
      const body = await res.json();
      if (!checkBody(body)) {
        console.error(`[FAIL] ${name}: Body check failed (${duration.toFixed(2)}ms)`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`[PASS] ${name}: ${res.status} (${duration.toFixed(2)}ms)`);
  } catch (error) {
    console.error(`[FAIL] ${name}: Network error - ${error.message}`);
    process.exitCode = 1;
  }
}

async function run() {
  await check("Liveness (/api/healthz)", `${baseUrl}/api/healthz`, 200, (body) => body.status === "ok");
  await check("Readiness (/api/readyz)", `${baseUrl}/api/readyz`, 200, (body) => body.status === "ok" || body.status === "error");
  await check("CSRF Token (/api/csrf-token)", `${baseUrl}/api/csrf-token`, 200, (body) => typeof body.csrfToken === "string");

  if (slug) {
    await check("Storefront Payload (/api/store/:slug)", `${baseUrl}/api/store/${slug}`, 200, (body) => body.slug === slug);
  } else {
    console.log("[SKIP] Storefront Payload check. Pass --tenant-slug to run this check.");
  }
}

run();