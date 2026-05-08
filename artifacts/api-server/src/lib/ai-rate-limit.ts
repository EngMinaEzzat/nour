/**
 * AI Rate Limiting (tenant-based, plan-aware)
 *
 * In-memory rate limiter scoped by tenant ID.
 * Plan-based limits use the tenant's planCode from the DB schema.
 * Falls back to conservative defaults when plan data is unavailable.
 */

// TODO: Finalize plan limits when billing/plan infrastructure is fully wired.
// These are conservative defaults based on the existing plan codes in tenants.planCode.
const PLAN_HOURLY_LIMITS: Record<string, number> = {
  starter: 20,
  growth: 50,
  pro: 100,
};

const DEFAULT_HOURLY_LIMIT = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<number, RateLimitEntry>();

/**
 * Check if a tenant has exceeded their AI rate limit.
 * @param tenantId - The tenant's ID
 * @param planCode - The tenant's plan code (e.g. "starter", "growth", "pro")
 */
export function checkAiRateLimit(
  tenantId: number,
  planCode?: string,
): { allowed: boolean; retryAfter?: number } {
  const limit = planCode
    ? (PLAN_HOURLY_LIMITS[planCode] ?? DEFAULT_HOURLY_LIMIT)
    : DEFAULT_HOURLY_LIMIT;

  const now = Date.now();
  const entry = rateLimitMap.get(tenantId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

// Export for billing/plan changes to reset if needed
export function resetAiRateLimit(tenantId: number): void {
  rateLimitMap.delete(tenantId);
}

/**
 * Per-prompt-type maximum input character limits.
 * Returns the max allowed input length in characters.
 */
const PROMPT_INPUT_LIMITS: Record<string, number> = {
  chat: 4000,
  pricing_advice: 2000,
  import_facebook: 4000,
  product_description: 1000,
  draft_reply: 2000,
};

const DEFAULT_INPUT_LIMIT = 4000;

export function getMaxInputLength(promptType: string): number {
  return PROMPT_INPUT_LIMITS[promptType] ?? DEFAULT_INPUT_LIMIT;
}
