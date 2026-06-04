import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDelivery, trackDelivery, isConfigured } from "../lib/bosta.js";

describe("Bosta Integration", () => {
  beforeEach(() => {
    // We stub fetch and we will override it in each test if needed
    vi.stubGlobal("fetch", vi.fn());
    // Backup process.env
    vi.stubEnv("BOSTA_API_KEY", "test_key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe("isConfigured", () => {
    it("returns true when BOSTA_API_KEY is set", () => {
      expect(isConfigured()).toBe(true);
    });

    it("returns false when BOSTA_API_KEY is not set", () => {
      vi.unstubAllEnvs();
      delete process.env.BOSTA_API_KEY;
      expect(isConfigured()).toBe(false);
    });
  });

  describe("createDelivery", () => {
    const defaultParams = {
      orderId: 123,
      orderTotal: 150.5,
      paymentMethod: "cod" as const,
      customerFirstName: "John",
      customerLastName: "Doe",
      customerPhone: "01012345678",
      dropOffAddress: "123 Main St",
    };

    it("successfully creates a delivery and returns shipment info", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _id: "ship_123", trackingNumber: "TRK123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await createDelivery(defaultParams);

      expect(result).toEqual({
        shipmentId: "ship_123",
        trackingNumber: "TRK123",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const requestCall = mockFetch.mock.calls[0];
      expect(requestCall[0]).toBe("https://app.bosta.co/api/v2/deliveries");
      expect(requestCall[1]).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "test_key",
          },
        }),
      );

      const body = JSON.parse(requestCall[1].body);
      expect(body).toEqual(
        expect.objectContaining({
          businessReference: "NOUR-123",
          notes: "طلب نور #123",
          cod: 151, // Math.round(150.5)
          receiver: {
            firstName: "John",
            lastName: "Doe",
            phone: "+201012345678", // added +2
          },
          dropOffAddress: {
            city: "Cairo",
            firstLine: "123 Main St",
            zone: "N/A",
            district: "N/A",
          },
        }),
      );
    });

    it("handles customer phone that already starts with +", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _id: "ship_123", trackingNumber: "TRK123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await createDelivery({
        ...defaultParams,
        customerPhone: "+201012345678",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.receiver.phone).toBe("+201012345678"); // should not add +2
    });

    it("sets cod to 0 for non-cod payment methods", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _id: "ship_123", trackingNumber: "TRK123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await createDelivery({
        ...defaultParams,
        paymentMethod: "paymob",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.cod).toBe(0);
    });

    it("uses custom notes and dropOffCity if provided", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ _id: "ship_123", trackingNumber: "TRK123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await createDelivery({
        ...defaultParams,
        notes: "Custom notes",
        dropOffCity: "Alexandria",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.notes).toBe("Custom notes");
      expect(body.dropOffAddress.city).toBe("Alexandria");
    });

    it("throws an error if the bosta API request fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid phone number",
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(createDelivery(defaultParams)).rejects.toThrow(
        "Bosta create delivery failed (400): Invalid phone number",
      );
    });
  });

  describe("trackDelivery", () => {
    it("successfully tracks a delivery", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "Delivered", history: [] }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await trackDelivery("TRK123");

      expect(result).toEqual({ status: "Delivered", history: [] });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const requestCall = mockFetch.mock.calls[0];
      expect(requestCall[0]).toBe(
        "https://app.bosta.co/api/v2/deliveries/business/tracking/TRK123",
      );
      expect(requestCall[1]).toEqual(
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
            Authorization: "test_key",
          },
        }),
      );
    });

    it("throws an error if the tracking API request fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(trackDelivery("TRK123")).rejects.toThrow(
        "Bosta tracking failed: 404",
      );
    });
  });
});
