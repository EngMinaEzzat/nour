import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveAiModel, providerToClientModel } from "../lib/ai-provider.js";

describe("ai-provider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("resolveAiModel", () => {
    it("returns specific requested model if it is not a generic provider name", () => {
      expect(resolveAiModel("anthropic", "claude-3-opus-20240229")).toBe("claude-3-opus-20240229");
      expect(resolveAiModel("openai", "gpt-4-turbo")).toBe("gpt-4-turbo");
      expect(resolveAiModel("gemini", "gemini-1.5-pro")).toBe("gemini-1.5-pro");
    });

    it("does not return requested if it is a generic provider name", () => {
      // It should fall through to default model resolution
      expect(resolveAiModel("anthropic", "claude")).toBe("claude-sonnet-4-6");
      expect(resolveAiModel("gemini", "gemini")).toBe("gemini-2.5-flash");
      expect(resolveAiModel("openai", "openai")).toBe("gpt-4o-mini");
      expect(resolveAiModel("openai", "gpt")).toBe("gpt-4o-mini");
    });

    it("returns AI_MODEL environment variable if set", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("anthropic")).toBe("env-model-override");
      expect(resolveAiModel("gemini")).toBe("env-model-override");
      expect(resolveAiModel("openai")).toBe("env-model-override");
    });

    it("prioritizes specific requested model over AI_MODEL env var", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("anthropic", "claude-3-opus")).toBe("claude-3-opus");
    });

    it("falls back to AI_MODEL if requested model is generic", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("anthropic", "claude")).toBe("env-model-override");
    });

    it("returns default model for provider when nothing else specified", () => {
      expect(resolveAiModel("openai")).toBe("gpt-4o-mini");
      expect(resolveAiModel("gemini")).toBe("gemini-2.5-flash");
      expect(resolveAiModel("anthropic")).toBe("claude-sonnet-4-6");
      // Any other fallback also resolves to claude-sonnet-4-6 in current implementation
      // @ts-ignore - testing fallback
      expect(resolveAiModel("unknown")).toBe("claude-sonnet-4-6");
    });
  });

  describe("providerToClientModel", () => {
    it("returns 'claude' when provider is 'anthropic'", () => {
      expect(providerToClientModel("anthropic")).toBe("claude");
    });

    it("returns 'gemini' when provider is 'gemini'", () => {
      expect(providerToClientModel("gemini")).toBe("gemini");
    });

    it("returns 'openai' when provider is 'openai'", () => {
      expect(providerToClientModel("openai")).toBe("openai");
    });
  });
});
