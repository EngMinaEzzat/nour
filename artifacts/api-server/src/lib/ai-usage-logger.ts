/**
 * Persists AI generation attempts/results to ai_usage_events.
 * Summaries are truncated so logs do not become a raw PII dump. Successful
 * generations fail closed if usage cannot be recorded, preserving billability.
 */

import { db, aiUsageEventsTable } from "@workspace/db";
import { logger } from "./logger.js";

export interface AiUsageParams {
  tenantId: number;
  merchantId: number;
  promptType: string;
  inputSummary?: string;
  resultSummary?: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostCents?: number;
  status: "success" | "failure" | "blocked" | "rate_limited";
  errorMessage?: string;
  durationMs?: number;
}

const MAX_INPUT_SUMMARY = 200;
const MAX_RESULT_SUMMARY = 500;
const MAX_ERROR_MESSAGE = 300;

const DEFAULT_COST_CENTS_PER_MILLION: Record<string, { input: number; output: number }> = {
  anthropic: { input: 300, output: 1500 },
  gemini: { input: 30, output: 250 },
  openai: { input: 15, output: 60 },
};

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function estimateCostCents(params: AiUsageParams): number | null {
  if (params.estimatedCostCents != null) return params.estimatedCostCents;

  const inputTokens = params.inputTokens ?? 0;
  const outputTokens = params.outputTokens ?? 0;
  if (inputTokens <= 0 && outputTokens <= 0) return null;

  const rates = DEFAULT_COST_CENTS_PER_MILLION[params.provider];
  if (!rates) return null;

  const rawCents = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  return Math.max(1, Math.ceil(rawCents));
}

export async function logAiUsage(params: AiUsageParams): Promise<void> {
  try {
    await db.insert(aiUsageEventsTable).values({
      tenantId: params.tenantId,
      merchantId: params.merchantId,
      promptType: params.promptType,
      inputSummary: truncate(params.inputSummary, MAX_INPUT_SUMMARY) ?? null,
      resultSummary: truncate(params.resultSummary, MAX_RESULT_SUMMARY) ?? null,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens ?? null,
      outputTokens: params.outputTokens ?? null,
      estimatedCostCents: estimateCostCents(params),
      status: params.status,
      errorMessage: truncate(params.errorMessage, MAX_ERROR_MESSAGE) ?? null,
      durationMs: params.durationMs ?? null,
    });
  } catch (err) {
    logger.error(
      { err, params: { ...params, inputSummary: "[redacted]", resultSummary: "[redacted]" } },
      "Failed to log AI usage event",
    );
    throw err;
  }
}
