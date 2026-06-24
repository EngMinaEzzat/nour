/**
 * AI Safety Checks
 *
 * Production must never silently fall back to mock AI.
 * Development/test may use deterministic mocks only when explicitly enabled.
 */

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

const AI_PROVIDER_ENV_KEYS: Record<string, string[]> = {
  gemini: ["AI_INTEGRATIONS_GEMINI_API_KEY", "AI_INTEGRATIONS_GEMINI_BASE_URL"],
  openai: ["OPENAI_API_KEY"],
};

/**
 * Returns true only if mock mode is explicitly enabled AND we are NOT in production.
 */
export function isAiMockEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.AI_USE_MOCK === "true";
}

/**
 * Verify that the selected real provider can be called. Mock mode is explicit
 * and never allowed in production, so missing provider keys fail closed.
 */
export function assertAiProviderConfigured(provider?: string): void {
  if (isAiMockEnabled()) return;
  const normalizedProvider = provider?.toLowerCase() ?? process.env.AI_PROVIDER?.toLowerCase() ?? "gemini";
  const requiredKeys = AI_PROVIDER_ENV_KEYS[normalizedProvider] ?? AI_PROVIDER_ENV_KEYS["gemini"];

  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new AiConfigurationError(
      `AI provider "${normalizedProvider}" requires env vars: ${missing.join(", ")}.`
    );
  }
}

export function assertAiConfigured(): void {
  if (process.env.NODE_ENV !== "production") return;

  const provider = process.env.AI_PROVIDER?.toLowerCase() ?? "gemini";
  const requiredKeys = AI_PROVIDER_ENV_KEYS[provider] ?? AI_PROVIDER_ENV_KEYS["gemini"];

  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new AiConfigurationError(
      `AI provider "${provider}" requires env vars: ${missing.join(", ")}. ` +
      "AI features will not function without these in production."
    );
  }
}

export function isAiConfigurationError(err: unknown): boolean {
  return err instanceof AiConfigurationError;
}
