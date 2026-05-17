import { describe, it, expect, vi } from "vitest";
import * as imageUrlModule from "./image-url";

describe("image-url", () => {
  describe("normalizeStoredImageUrl", () => {
    it("should return empty string for null/undefined", () => {
      expect(imageUrlModule.normalizeStoredImageUrl(null)).toBe("");
      expect(imageUrlModule.normalizeStoredImageUrl(undefined)).toBe("");
    });

    it("should return relative path for /api/uploads/ on same origin", () => {
      vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
      const url = "http://localhost:3000/api/uploads/image.jpg";
      expect(imageUrlModule.normalizeStoredImageUrl(url)).toBe("/api/uploads/image.jpg");
      vi.unstubAllGlobals();
    });

    it("should return absolute URL for external images", () => {
      const url = "https://external.com/image.jpg";
      expect(imageUrlModule.normalizeStoredImageUrl(url)).toBe(url);
    });
  });

  describe("productImageUrl", () => {
    it("should prepend BASE_URL to relative paths", () => {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const url = "/api/uploads/image.jpg";
      expect(imageUrlModule.productImageUrl(url)).toBe(`${base}${url}`);
    });

    it("should use fallback with BASE_URL if url is empty", () => {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      expect(imageUrlModule.productImageUrl("")).toBe(`${base}/product-fashion-optimized.jpg`);
    });

    it("should not double prepend BASE_URL", () => {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      if (base) {
        const url = `${base}/api/uploads/image.jpg`;
        expect(imageUrlModule.productImageUrl(url)).toBe(url);
      }
    });

    it("should return absolute URLs as is", () => {
      const url = "https://external.com/image.jpg";
      expect(imageUrlModule.productImageUrl(url)).toBe(url);
    });
  });
});
