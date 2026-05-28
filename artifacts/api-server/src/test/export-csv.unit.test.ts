import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExportFilePath, toCsv } from "../lib/export-csv.js";


describe("getExportFilePath", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses process.env.EXPORT_OUTPUT_DIR when it is set", () => {
    const customDir = "/custom/export/dir";
    vi.stubEnv("EXPORT_OUTPUT_DIR", customDir);

    const result = getExportFilePath(123, "token456");
    expect(result).toBe(path.join(customDir, "123-token456.csv"));
  });

  it("defaults to os.tmpdir()/nour-exports when EXPORT_OUTPUT_DIR is not set", () => {
    vi.stubEnv("EXPORT_OUTPUT_DIR", "");

    const result = getExportFilePath(789, "token101");
    const expectedDir = path.join(os.tmpdir(), "nour-exports");
    expect(result).toBe(path.join(expectedDir, "789-token101.csv"));
  });
});

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
