import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveAiModel, providerToClientModel, resolveAiProvider } from "../lib/ai-provider.js";

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
      expect(resolveAiModel("openai", "gpt-4-turbo")).toBe("gpt-4-turbo");
      expect(resolveAiModel("gemini", "gemini-1.5-pro")).toBe("gemini-1.5-pro");
    });

    it("does not return requested if it is a generic provider name", () => {
      // It should fall through to default model resolution
      expect(resolveAiModel("gemini", "gemini")).toBe("gemini-3.5-flash");
      expect(resolveAiModel("openai", "openai")).toBe("gpt-4o-mini");
      expect(resolveAiModel("openai", "gpt")).toBe("gpt-4o-mini");
    });

    it("returns AI_MODEL environment variable if set", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("gemini")).toBe("env-model-override");
      expect(resolveAiModel("openai")).toBe("env-model-override");
    });

    it("prioritizes specific requested model over AI_MODEL env var", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("gemini", "gemini-1.5-pro")).toBe("gemini-1.5-pro");
    });

    it("falls back to AI_MODEL if requested model is generic", () => {
      process.env.AI_MODEL = "env-model-override";
      expect(resolveAiModel("gemini", "gemini")).toBe("env-model-override");
    });

    it("returns default model for provider when nothing else specified", () => {
      expect(resolveAiModel("openai")).toBe("gpt-4o-mini");
      expect(resolveAiModel("gemini")).toBe("gemini-3.5-flash");
      // Any other fallback also resolves to gemini-3.5-flash in current implementation
      // @ts-ignore - testing fallback
      expect(resolveAiModel("unknown")).toBe("gemini-3.5-flash");
    });
  });

  describe("providerToClientModel", () => {
    it("returns 'gemini' when provider is 'gemini'", () => {
      expect(providerToClientModel("gemini")).toBe("gemini");
    });

    it("returns 'openai' when provider is 'openai'", () => {
      expect(providerToClientModel("openai")).toBe("openai");
    });
  });

  describe("resolveAiProvider", () => {
    beforeEach(() => {
      delete process.env.AI_PROVIDER;
    });

    it("returns the requested provider if one is provided", () => {
      expect(resolveAiProvider("openai")).toBe("openai");
      expect(resolveAiProvider("gemini")).toBe("gemini");
    });

    it("returns 'gemini' if process.env.AI_PROVIDER is 'gemini' (case-insensitive)", () => {
      process.env.AI_PROVIDER = "gemini";
      expect(resolveAiProvider()).toBe("gemini");

      process.env.AI_PROVIDER = "GEMINI";
      expect(resolveAiProvider()).toBe("gemini");
    });

    it("returns 'openai' if process.env.AI_PROVIDER is 'openai' (case-insensitive)", () => {
      process.env.AI_PROVIDER = "openai";
      expect(resolveAiProvider()).toBe("openai");

      process.env.AI_PROVIDER = "OpenAI";
      expect(resolveAiProvider()).toBe("openai");
    });

    it("defaults to returning 'gemini' if no requested provider and process.env.AI_PROVIDER is not set", () => {
      delete process.env.AI_PROVIDER;
      expect(resolveAiProvider()).toBe("gemini");
    });

    it("defaults to returning 'gemini' if process.env.AI_PROVIDER is an unknown value", () => {
      process.env.AI_PROVIDER = "unknown";
      expect(resolveAiProvider()).toBe("gemini");
    });
  });
});
