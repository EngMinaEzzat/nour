import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveAiProvider } from "../lib/ai-provider.js";

describe("resolveAiProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns the requested provider if one is provided", () => {
    expect(resolveAiProvider("openai")).toBe("openai");
    expect(resolveAiProvider("gemini")).toBe("gemini");
    expect(resolveAiProvider("anthropic")).toBe("anthropic");
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

  it("defaults to returning 'anthropic' if no requested provider and process.env.AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    expect(resolveAiProvider()).toBe("anthropic");
  });

  it("defaults to returning 'anthropic' if process.env.AI_PROVIDER is an unknown value", () => {
    process.env.AI_PROVIDER = "unknown";
    expect(resolveAiProvider()).toBe("anthropic");
  });
});
