import { describe, expect, it } from "vitest";
import { toCsv, buildConditions } from "../lib/export-csv.js";

describe("toCsv", () => {
  it("returns an empty string when given an empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("converts a standard array of objects to CSV (happy path)", () => {
    const data = [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false },
    ];
    expect(toCsv(data)).toBe(
      ["id,name,active", "1,Alice,true", "2,Bob,false"].join("\n"),
    );
  });

  it("converts null and undefined values to empty strings", () => {
    const data = [
      { id: 1, name: null, note: undefined, extra: "text" },
    ];
    expect(toCsv(data)).toBe(
      ["id,name,note,extra", "1,,,text"].join("\n"),
    );
  });

  it("handles rows missing keys present in the first row", () => {
    const data = [
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob" },
    ];
    // Object.keys is called on the first row, so headers are id, name, age
    expect(toCsv(data)).toBe(
      ["id,name,age", "1,Alice,30", "2,Bob,"].join("\n"),
    );
  });

  it("prefixes formula-like cells with an apostrophe", () => {
    const csv = toCsv([
      {
        equal: "=SUM(1,1)",
        plus: "+cmd",
        minus: "-cmd",
        at: "@cmd",
        spaced: " \t=SUM(A1:A2)",
        safe: "plain",
      },
    ]);

    expect(csv).toBe(
      [
        "equal,plus,minus,at,spaced,safe",
        "\"'=SUM(1,1)\",'+cmd,'-cmd,'@cmd,' \t=SUM(A1:A2),plain",
      ].join("\n"),
    );
  });

  it("still escapes commas, quotes, and newlines after sanitizing", () => {
    const csv = toCsv([
      {
        formulaWithComma: '=HYPERLINK("https://example.com","click")',
        safeWithQuote: 'hello "there"',
        safeWithNewline: "line 1\nline 2",
      },
    ]);

    expect(csv).toBe(
      [
        "formulaWithComma,safeWithQuote,safeWithNewline",
        "\"'=HYPERLINK(\"\"https://example.com\"\",\"\"click\"\")\",\"hello \"\"there\"\"\",\"line 1\nline 2\"",
      ].join("\n"),
    );
  });
});

import { eq, gte, lte, and } from "drizzle-orm";
import { ordersTable } from "@workspace/db";

describe("buildConditions", () => {
  it("returns only tenant ID condition when no dates are provided", () => {
    const tenantId = 123;
    const cond = buildConditions(ordersTable.tenantId, ordersTable.createdAt, tenantId, {});

    const expected = and(eq(ordersTable.tenantId, tenantId));
    expect(cond).toEqual(expected);
  });

  it("includes gte condition when dateFrom is provided", () => {
    const tenantId = 123;
    const dateFrom = new Date("2023-01-01T00:00:00Z");
    const cond = buildConditions(ordersTable.tenantId, ordersTable.createdAt, tenantId, { dateFrom });

    const expected = and(
      eq(ordersTable.tenantId, tenantId),
      gte(ordersTable.createdAt, dateFrom)
    );
    expect(cond).toEqual(expected);
  });

  it("includes lte condition when dateTo is provided", () => {
    const tenantId = 123;
    const dateTo = new Date("2023-12-31T23:59:59Z");
    const cond = buildConditions(ordersTable.tenantId, ordersTable.createdAt, tenantId, { dateTo });

    const expected = and(
      eq(ordersTable.tenantId, tenantId),
      lte(ordersTable.createdAt, dateTo)
    );
    expect(cond).toEqual(expected);
  });

  it("includes both gte and lte conditions when both dateFrom and dateTo are provided", () => {
    const tenantId = 123;
    const dateFrom = new Date("2023-01-01T00:00:00Z");
    const dateTo = new Date("2023-12-31T23:59:59Z");
    const cond = buildConditions(ordersTable.tenantId, ordersTable.createdAt, tenantId, { dateFrom, dateTo });

    const expected = and(
      eq(ordersTable.tenantId, tenantId),
      gte(ordersTable.createdAt, dateFrom),
      lte(ordersTable.createdAt, dateTo)
    );
    expect(cond).toEqual(expected);
  });
});
