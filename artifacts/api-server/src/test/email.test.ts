import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, sendOrderConfirmationEmail } from "../lib/email.js";

const mockSend = vi.fn().mockResolvedValue({ data: { id: "mock-email-id" }, error: null });

// Mock the entire resend module
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(function (this: any) {
      this.emails = {
        send: mockSend,
      };
    }),
  };
});

describe("Email System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-key";
  });

  it("should send a generic email correctly", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      fromName: "Custom Store",
    });

    expect(result).toEqual({ id: "mock-email-id" });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Custom Store <onboarding@resend.dev>",
        to: "test@example.com",
        subject: "Test Subject",
      })
    );
  });

  it("should send order confirmation with item details", async () => {
    await sendOrderConfirmationEmail({
      to: "customer@example.com",
      customerName: "Ahmed",
      orderId: 101,
      storeName: "My Boutique",
      totalAmount: 500,
      items: [
        { name: "Dress", quantity: 2 },
        { name: "Shoes", quantity: 1 },
      ],
      merchantEmail: "owner@boutique.com",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "My Boutique <onboarding@resend.dev>",
        replyTo: "owner@boutique.com",
        subject: expect.stringContaining("#101"),
      })
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("Dress");
    expect(callArgs.html).toContain("Shoes");
    expect(callArgs.html).toContain("٥٠٠");
  });

  it("should escape user-controlled order email fields", async () => {
    await sendOrderConfirmationEmail({
      to: "customer@example.com",
      customerName: "<script>alert(1)</script>",
      orderId: 102,
      storeName: "My Boutique",
      totalAmount: 100,
      items: [{ name: `<img src=x onerror="alert(1)">`, quantity: 1 }],
    });

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).not.toContain("<script>");
    expect(callArgs.html).not.toContain("<img src=x");
    expect(callArgs.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(callArgs.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("should return null if RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Fail",
      html: "...",
    });
    expect(result).toBeNull();
  });
});
