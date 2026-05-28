import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { toCsv, writeExportFile } from "../lib/export-csv.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

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

describe("writeExportFile", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates the directory and writes the file", async () => {
    process.env.EXPORT_OUTPUT_DIR = "/mock/dir";
    const exportJobId = 123;
    const downloadToken = "token456";
    const csvContent = "id,name\n1,test";

    const expectedPath = path.join("/mock/dir", `${exportJobId}-${downloadToken}.csv`);

    const result = await writeExportFile(exportJobId, downloadToken, csvContent);

    expect(result).toBe(expectedPath);
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(expectedPath), { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, csvContent, "utf8");
  });

  it("uses os.tmpdir() when EXPORT_OUTPUT_DIR is not set", async () => {
    delete process.env.EXPORT_OUTPUT_DIR;
    const exportJobId = 789;
    const downloadToken = "tokenXYZ";
    const csvContent = "id,name\n2,test2";

    const expectedPath = path.join(os.tmpdir(), "nour-exports", `${exportJobId}-${downloadToken}.csv`);

    const result = await writeExportFile(exportJobId, downloadToken, csvContent);

    expect(result).toBe(expectedPath);
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(expectedPath), { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledWith(expectedPath, csvContent, "utf8");
  });
});
