const HOURLY_LIMIT = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<number, RateLimitEntry>();

export function checkAiRateLimit(tenantId: number): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(tenantId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true };
  }

  if (entry.count >= HOURLY_LIMIT) {
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
