import { describe, expect, it } from "vitest";
import { toCsv } from "../lib/export-csv.js";

describe("toCsv", () => {
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
