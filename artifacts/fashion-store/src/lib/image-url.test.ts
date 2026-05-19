import { describe, it, expect, vi } from "vitest";
import { productImageUrl, normalizeStoredImageUrl, getBase } from "./image-url";

describe("image-url", () => {
  describe("getBase", () => {
    it("should return sanitized BASE_URL", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(getBase()).toBe("/my-store");

      vi.stubEnv("BASE_URL", "/");
      expect(getBase()).toBe("");

      vi.stubEnv("BASE_URL", "");
      expect(getBase()).toBe("");
    });
  });

  describe("normalizeStoredImageUrl", () => {
    it("should strip BASE prefix from internal paths", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(normalizeStoredImageUrl("/my-store/api/uploads/image.jpg")).toBe("/api/uploads/image.jpg");
    });

    it("should handle relative paths", () => {
      expect(normalizeStoredImageUrl("/api/uploads/image.jpg")).toBe("/api/uploads/image.jpg");
      expect(normalizeStoredImageUrl("custom/path.jpg")).toBe("custom/path.jpg");
    });

    it("should return empty string for empty input", () => {
      expect(normalizeStoredImageUrl(null)).toBe("");
      expect(normalizeStoredImageUrl(undefined)).toBe("");
      expect(normalizeStoredImageUrl("   ")).toBe("");
    });

    it("should handle absolute URLs for own uploads", () => {
        vi.stubGlobal("location", { origin: "http://localhost:5000" });
        expect(normalizeStoredImageUrl("http://localhost:5000/api/uploads/test.jpg")).toBe("/api/uploads/test.jpg");
    });
  });

  describe("productImageUrl", () => {
    it("should prepend BASE to relative paths", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(productImageUrl("/api/uploads/image.jpg")).toBe("/my-store/api/uploads/image.jpg");
      expect(productImageUrl("test.jpg")).toBe("/my-store/test.jpg");
    });

    it("should return external URLs as is", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(productImageUrl("https://example.com/image.jpg")).toBe("https://example.com/image.jpg");
      expect(productImageUrl("http://example.com/image.jpg")).toBe("http://example.com/image.jpg");
      expect(productImageUrl("//example.com/image.jpg")).toBe("//example.com/image.jpg");
    });

    it("should use fallback for empty/null input", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(productImageUrl(null)).toBe("/my-store/product-fashion-optimized.jpg");
      expect(productImageUrl("")).toBe("/my-store/product-fashion-optimized.jpg");
    });

    it("should handle the special /product-fashion.png case", () => {
      vi.stubEnv("BASE_URL", "/my-store/");
      expect(productImageUrl("/product-fashion.png")).toBe("/my-store/product-fashion-optimized.jpg");
    });
  });
});
