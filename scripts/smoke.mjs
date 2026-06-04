import { parseArgs } from "node:util";
import { performance } from "node:perf_hooks";
import { logger } from "./src/logger.ts";

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

logger.info("Starting Operational Smoke Test against %s", baseUrl);

async function check(name, url, expectedStatus = 200, checkBody = null) {
  const start = performance.now();
  try {
    const res = await fetch(url);
    const duration = performance.now() - start;
    if (res.status !== expectedStatus) {
      logger.error(
        "%s: Expected %s, got %s (%sms)",
        name,
        expectedStatus,
        res.status,
        duration.toFixed(2),
      );
      process.exitCode = 1;
      return;
    }
    if (checkBody) {
      const body = await res.json();
      if (!checkBody(body)) {
        logger.error(
          "%s: Body check failed (%sms)",
          name,
          duration.toFixed(2),
        );
        process.exitCode = 1;
        return;
      }
    }
    logger.success(
      "%s: %s (%sms)",
      name,
      res.status,
      duration.toFixed(2),
    );
  } catch (error) {
    logger.error("%s: Network error - %s", name, error.message);
    process.exitCode = 1;
  }
}

async function run() {
  await check(
    "Liveness (/api/healthz)",
    `${baseUrl}/api/healthz`,
    200,
    (body) => body.status === "ok",
  );
  await check(
    "Readiness (/api/readyz)",
    `${baseUrl}/api/readyz`,
    200,
    (body) => body.status === "ok" || body.status === "error",
  );
  await check(
    "CSRF Token (/api/csrf-token)",
    `${baseUrl}/api/csrf-token`,
    200,
    (body) => typeof body.csrfToken === "string",
  );

  if (slug) {
    await check(
      "Storefront Payload (/api/store/:slug)",
      `${baseUrl}/api/store/${slug}`,
      200,
      (body) => body.slug === slug,
    );
  } else {
    logger.skip(
      "Storefront Payload check. Pass --tenant-slug to run this check.",
    );
  }
}

run();
