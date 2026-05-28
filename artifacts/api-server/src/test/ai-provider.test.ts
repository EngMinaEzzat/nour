import { describe, expect, it } from "vitest";
import { providerToClientModel } from "../lib/ai-provider.js";

describe("ai-provider", () => {
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
