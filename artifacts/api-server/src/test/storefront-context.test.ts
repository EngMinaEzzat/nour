import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getStorefrontContext, resolveStorefrontTenantId } from "../lib/storefront-context.js";
import { Request } from "express";
import { createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Storefront Context Utilities", () => {
  describe("getStorefrontContext", () => {
    it("should return host and subdomain from request headers", () => {
      const mockReq = {
        headers: {
          host: "custom.domain.com",
          "x-tenant-domain": "tenant-subdomain.example.com",
        },
      } as unknown as Request;

      const result = getStorefrontContext(mockReq);

      expect(result).toEqual({
        host: "custom.domain.com",
        subdomain: "tenant-subdomain.example.com",
      });
    });

    it("should return undefined for missing headers", () => {
      const mockReq = {
        headers: {},
      } as unknown as Request;

      const result = getStorefrontContext(mockReq);

      expect(result).toEqual({
        host: undefined,
        subdomain: undefined,
      });
    });
  });

  describe("resolveStorefrontTenantId", () => {
    let ctx: Awaited<ReturnType<typeof createTestMerchant>>;
    let mockLog = { error: vi.fn() };

    beforeAll(async () => {
      ctx = await createTestMerchant();
    });

    afterAll(async () => {
      await cleanupTenant(ctx.tenantId, ctx.merchantId);
    });

    it("should resolve tenant ID via slug in headers", async () => {
      const mockReq = {
        headers: {
          "x-storefront-slug": ctx.slug,
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should resolve tenant ID via slug in body", async () => {
      const mockReq = {
        headers: {},
        body: {
          storefrontSlug: ctx.slug,
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should resolve tenant ID via slug in query", async () => {
      const mockReq = {
        headers: {},
        body: {},
        query: {
            storefrontSlug: ctx.slug,
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should resolve tenant ID via direct direct id in headers", async () => {
      const mockReq = {
        headers: {
            "x-tenant-id": ctx.tenantId.toString()
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should resolve tenant ID via direct direct id in body", async () => {
      const mockReq = {
        headers: {},
        body: {
            tenantId: ctx.tenantId.toString()
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should resolve tenant ID via direct direct id in query", async () => {
      const mockReq = {
        headers: {},
        body: {},
        query: {
            tenantId: ctx.tenantId.toString()
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBe(ctx.tenantId);
    });

    it("should return null for non-existent slug", async () => {
      const mockReq = {
        headers: {
          "x-storefront-slug": "non-existent-slug-12345",
        },
        log: mockLog,
      } as unknown as Request;

      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
      expect(id).toBeNull();
    });

    it("should return null for non-existent direct id", async () => {
        const mockReq = {
          headers: {
            "x-tenant-id": "999999",
          },
          log: mockLog,
        } as unknown as Request;

        const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
        expect(id).toBeNull();
    });

    it("should use test fallback when NODE_ENV is test and allowed", async () => {
      const mockReq = {
        headers: {},
        log: mockLog,
      } as unknown as Request;

      // NODE_ENV is already 'test' during vitest runs
      const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: true });
      expect(id).not.toBeNull();
      expect(typeof id).toBe("number");
    });

    it("should not use test fallback when NODE_ENV is test and not allowed", async () => {
        const mockReq = {
          headers: {},
          log: mockLog,
        } as unknown as Request;

        const id = await resolveStorefrontTenantId(mockReq, { allowTestFallback: false });
        expect(id).toBeNull();
    });

  });
});
