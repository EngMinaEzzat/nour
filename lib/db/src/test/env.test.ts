import { describe, it, expect } from "vitest";
import { isUsableDatabaseUrl } from "../env";

describe("isUsableDatabaseUrl", () => {
  it("should return true for valid postgres URLs", () => {
    expect(isUsableDatabaseUrl("postgres://user:pass@localhost:5432/db")).toBe(true);
    expect(isUsableDatabaseUrl("postgresql://user:pass@localhost:5432/db")).toBe(true);
  });

  it("should return false for invalid protocols", () => {
    expect(isUsableDatabaseUrl("mysql://user:pass@localhost:3306/db")).toBe(false);
    expect(isUsableDatabaseUrl("http://localhost:5432/db")).toBe(false);
  });

  it("should return false for empty or undefined values", () => {
    expect(isUsableDatabaseUrl("")).toBe(false);
    expect(isUsableDatabaseUrl(undefined)).toBe(false);
  });

  it("should return false for malformed/invalid URL strings", () => {
    expect(isUsableDatabaseUrl("not-a-url")).toBe(false);
    expect(isUsableDatabaseUrl("invalid:///:::")).toBe(false);
  });
});
