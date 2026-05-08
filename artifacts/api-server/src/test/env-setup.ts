import fs from "node:fs";
import path from "node:path";

// Must be set before app.ts is imported (checks SESSION_SECRET at module load)
process.env.NODE_ENV = "test";
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "test-only-secret-not-for-production";
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function findEnvTest(startDir: string): string | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, ".env.test");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function loadEnvTestFallbacks(): void {
  const envTest = findEnvTest(process.cwd());
  if (!envTest) return;

  const contents = fs.readFileSync(envTest, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key] !== undefined) continue;

    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));
    if (key === "DATABASE_URL" || key === "NOUR_TEST_DATABASE_OK") {
      process.env[key] = value;
    }
  }
}

function loadTestDatabaseUrl(): string {
  loadEnvTestFallbacks();
  return process.env.DATABASE_URL ?? "";
}

// Safety guard: refuse to run tests against a database that doesn't look like
// a test/development database. This prevents accidental data destruction if
// DATABASE_URL points to a production database.
const dbUrl = loadTestDatabaseUrl();
const isSafeDb =
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1") ||
  dbUrl.includes("_test") ||
  dbUrl.includes("-test") ||
  dbUrl.includes("test_") ||
  dbUrl.includes("localtest") ||
  process.env.NOUR_TEST_DATABASE_OK === "true";

if (!isSafeDb) {
  console.error(
    "\nDATABASE_URL is missing or does not look like a dedicated test database.\n" +
    "Tests create and delete real data, so refusing to run.\n" +
    "Use a local database or a URL/name containing _test, -test, test_, or localtest.\n"
  );
  process.exit(1);
}
