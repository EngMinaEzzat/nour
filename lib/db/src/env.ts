import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function getEnvFileNames(): string[] {
  const names: string[] = [];
  if (process.env.NODE_ENV) names.push(`.env.${process.env.NODE_ENV}`);
  names.push(".env");
  // Only include .env.test when explicitly running in test mode.
  // Previous behavior unconditionally appended .env.test, which could
  // cause production/staging runs to silently use test credentials.
  if (process.env.NODE_ENV === "test" && !names.includes(".env.test")) {
    names.push(".env.test");
  }
  return names;
}

function isUsableDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function findEnvFile(startDir: string): string | null {
  const names = getEnvFileNames();
  let current = path.resolve(startDir);
  while (true) {
    for (const name of names) {
      const candidate = path.join(current, name);
      if (fs.existsSync(candidate)) return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadWorkspaceEnv(): void {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const envFile = findEnvFile(process.cwd()) ?? findEnvFile(moduleDir);
  if (!envFile) return;

  const contents = fs.readFileSync(envFile, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));
    if (!key) continue;
    if (process.env[key] !== undefined) {
      if (key !== "DATABASE_URL" || isUsableDatabaseUrl(process.env[key])) {
        continue;
      }
    }

    process.env[key] = value;
  }
}
