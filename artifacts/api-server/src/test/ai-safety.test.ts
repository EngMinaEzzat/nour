import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isAiMockEnabled,
  assertAiProviderConfigured,
  assertAiConfigured,
  isAiConfigurationError,
  AiConfigurationError,
} from "../lib/ai-safety.js";

describe("AI Safety Utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isAiMockEnabled", () => {
    it("returns false in production regardless of AI_USE_MOCK", () => {
      process.env.NODE_ENV = "production";
      process.env.AI_USE_MOCK = "true";
      expect(isAiMockEnabled()).toBe(false);

      process.env.AI_USE_MOCK = "false";
      expect(isAiMockEnabled()).toBe(false);
    });

    it("returns true when not in production and AI_USE_MOCK is true", () => {
      process.env.NODE_ENV = "development";
      process.env.AI_USE_MOCK = "true";
      expect(isAiMockEnabled()).toBe(true);

      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "true";
      expect(isAiMockEnabled()).toBe(true);
    });

    it("returns false when not in production and AI_USE_MOCK is not true", () => {
      process.env.NODE_ENV = "development";
      process.env.AI_USE_MOCK = "false";
      expect(isAiMockEnabled()).toBe(false);

      delete process.env.AI_USE_MOCK;
      expect(isAiMockEnabled()).toBe(false);
    });
  });

  describe("assertAiProviderConfigured", () => {
    it("does not throw if mock is enabled", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "true";
      delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

      expect(() => assertAiProviderConfigured()).not.toThrow();
    });

    it("throws if anthropic (default) is missing required env vars", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "false";
      delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

      expect(() => assertAiProviderConfigured()).toThrow(AiConfigurationError);
      expect(() => assertAiProviderConfigured()).toThrow(/requires env vars: AI_INTEGRATIONS_ANTHROPIC_API_KEY/);
    });

    it("does not throw if anthropic (default) has required env vars", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "false";
      process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-key";
      process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "test-url";

      expect(() => assertAiProviderConfigured()).not.toThrow();
    });

    it("throws if specified provider is missing required env vars", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "false";
      delete process.env.OPENAI_API_KEY;

      expect(() => assertAiProviderConfigured("openai")).toThrow(AiConfigurationError);
      expect(() => assertAiProviderConfigured("openai")).toThrow(/requires env vars: OPENAI_API_KEY/);
    });

    it("does not throw if specified provider has required env vars", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "false";
      process.env.OPENAI_API_KEY = "test-key";

      expect(() => assertAiProviderConfigured("openai")).not.toThrow();
    });

    it("uses AI_PROVIDER env var if provider argument is not passed", () => {
      process.env.NODE_ENV = "test";
      process.env.AI_USE_MOCK = "false";
      process.env.AI_PROVIDER = "gemini";
      delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;

      expect(() => assertAiProviderConfigured()).toThrow(AiConfigurationError);
      expect(() => assertAiProviderConfigured()).toThrow(/requires env vars: AI_INTEGRATIONS_GEMINI_API_KEY/);
    });
  });

  describe("assertAiConfigured", () => {
    it("does not throw when not in production", () => {
      process.env.NODE_ENV = "development";
      delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

      expect(() => assertAiConfigured()).not.toThrow();
    });

    it("throws in production if required env vars are missing", () => {
      process.env.NODE_ENV = "production";
      delete process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

      expect(() => assertAiConfigured()).toThrow(AiConfigurationError);
      expect(() => assertAiConfigured()).toThrow(/AI features will not function without these in production/);
    });

    it("does not throw in production if required env vars are present", () => {
      process.env.NODE_ENV = "production";
      process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-key";
      process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "test-url";

      expect(() => assertAiConfigured()).not.toThrow();
    });
  });

  describe("isAiConfigurationError", () => {
    it("returns true for AiConfigurationError instances", () => {
      const err = new AiConfigurationError("test error");
      expect(isAiConfigurationError(err)).toBe(true);
    });

    it("returns false for other Error instances", () => {
      const err = new Error("test error");
      expect(isAiConfigurationError(err)).toBe(false);
    });

    it("returns false for non-error values", () => {
      expect(isAiConfigurationError(null)).toBe(false);
      expect(isAiConfigurationError(undefined)).toBe(false);
      expect(isAiConfigurationError("error string")).toBe(false);
      expect(isAiConfigurationError({ message: "error" })).toBe(false);
    });
  });
});
