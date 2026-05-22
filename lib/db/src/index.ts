import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { loadWorkspaceEnv } from "./env";

const { Pool } = pg;

loadWorkspaceEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const requiresSsl =
  process.env.NODE_ENV === "production" &&
  !/[?&]sslmode=disable(?:&|$)/.test(process.env.DATABASE_URL);

const DEFAULT_POOL_MAX = 5;

function parsePoolMax(value: string | undefined): number {
  if (!value) return DEFAULT_POOL_MAX;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_POOL_MAX;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: parsePoolMax(process.env.DB_POOL_MAX),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./constants";
