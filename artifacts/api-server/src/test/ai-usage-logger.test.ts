import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logAiUsage } from "../lib/ai-usage-logger.js";
import { db, aiUsageEventsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

// Mock the db dependency
vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return {
    ...actual,
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    },
  };
});

describe("logAiUsage", () => {
  let tenantId = 100;
  let merchantId = 200;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log successful AI usage event", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      inputSummary: "Short input summary",
      resultSummary: "Short result summary",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
      status: "success",
      durationMs: 500,
    });

    expect(db.insert).toHaveBeenCalledWith(aiUsageEventsTable);
    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues).toHaveBeenCalledWith({
      tenantId,
      merchantId,
      promptType: "product_description",
      inputSummary: "Short input summary",
      resultSummary: "Short result summary",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 200,
      estimatedCostCents: 1, // rounded up
      status: "success",
      errorMessage: null,
      durationMs: 500,
    });
  });

  it("should calculate correct estimated cost if not provided", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      provider: "openai", // OpenAI: 15 input, 60 output cents per million
      model: "gpt-4o",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      status: "success",
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues.mock.calls[0][0].estimatedCostCents).toBe(15 + 60); // 75
  });

  it("should respect provided estimatedCostCents instead of calculating", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      estimatedCostCents: 500, // Manual override
      status: "success",
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues.mock.calls[0][0].estimatedCostCents).toBe(500);
  });

  it("should round up estimated cost to at least 1 cent if usage > 0", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 10,
      outputTokens: 10,
      status: "success",
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues.mock.calls[0][0].estimatedCostCents).toBe(1);
  });

  it("should return null estimated cost if tokens are 0 and none is provided", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 0,
      outputTokens: 0,
      status: "success",
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues.mock.calls[0][0].estimatedCostCents).toBeNull();
  });

  it("should return null estimated cost if unknown provider", async () => {
    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      provider: "unknown-provider",
      model: "unknown-model",
      inputTokens: 1000,
      outputTokens: 1000,
      status: "success",
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    expect(mockValues.mock.calls[0][0].estimatedCostCents).toBeNull();
  });

  it("should truncate long summaries and error messages", async () => {
    const longInput = "a".repeat(300);
    const longResult = "b".repeat(600);
    const longError = "c".repeat(400);

    await logAiUsage({
      tenantId,
      merchantId,
      promptType: "product_description",
      inputSummary: longInput,
      resultSummary: longResult,
      provider: "openai",
      model: "gpt-4o",
      status: "failure",
      errorMessage: longError,
    });

    const mockValues = (db.insert(aiUsageEventsTable) as any).values;
    const callArgs = mockValues.mock.calls[0][0];

    // MAX_INPUT_SUMMARY = 200, MAX_RESULT_SUMMARY = 500, MAX_ERROR_MESSAGE = 300
    expect(callArgs.inputSummary?.length).toBe(203); // 200 + 3 for "..."
    expect(callArgs.inputSummary?.endsWith("...")).toBe(true);

    expect(callArgs.resultSummary?.length).toBe(503); // 500 + 3
    expect(callArgs.resultSummary?.endsWith("...")).toBe(true);

    expect(callArgs.errorMessage?.length).toBe(303); // 300 + 3
    expect(callArgs.errorMessage?.endsWith("...")).toBe(true);
  });

  it("should throw error and log it if DB insertion fails", async () => {
    const mockError = new Error("DB Connection Failed");
    (db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockRejectedValueOnce(mockError),
    });

    await expect(
      logAiUsage({
        tenantId,
        merchantId,
        promptType: "product_description",
        inputSummary: "Input summary",
        resultSummary: "Result summary",
        provider: "openai",
        model: "gpt-4o",
        status: "success",
      }),
    ).rejects.toThrow("DB Connection Failed");

    expect(logger.error).toHaveBeenCalledWith(
      {
        err: mockError,
        params: expect.objectContaining({
          inputSummary: "[redacted]",
          resultSummary: "[redacted]",
        }),
      },
      "Failed to log AI usage event",
    );
  });
});
