import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, sendNewMerchantNotification, sendOrderConfirmationEmail, sendWelcomeEmail, sendSubscriptionReminderEmail } from "../lib/email.js";

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
    mockSend.mockResolvedValue({ data: { id: "mock-email-id" }, error: null });
    process.env.RESEND_API_KEY = "test-key";
  });

  it("should send a generic email correctly", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      fromName: "Custom Store",
    });

    expect(result).toEqual({ sent: true, id: "mock-email-id" });
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

  it("should report when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Fail",
      html: "...",
    });
    expect(result).toEqual({ sent: false, reason: "missing_api_key" });
  });

  it("should report provider errors", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "Domain not verified" } });

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Fail",
      html: "...",
    });

    expect(result).toEqual({ sent: false, reason: "provider_error" });
  });

  it("should report welcome email delivery status", async () => {
    const result = await sendWelcomeEmail(
      "merchant@example.com",
      "My Boutique",
      "https://nour.example/store/my-boutique",
    );

    expect(result).toEqual({ sent: true, id: "mock-email-id" });
  });

  it("should escape user-controlled welcome email fields", async () => {
    await sendWelcomeEmail(
      "merchant@example.com",
      `<img src=x onerror="alert(1)">`,
      `https://nour.example/store/bad?x="><script>alert(1)</script>`,
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).not.toContain("<script>");
    expect(callArgs.html).not.toContain("<img src=x");
    expect(callArgs.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(callArgs.html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("should escape user-controlled admin notification fields", async () => {
    await sendNewMerchantNotification(
      ["admin@example.com"],
      `<script>alert(1)</script>`,
      `https://nour.example/store/bad?x="><img src=x onerror="alert(1)">`,
      `<owner@example.com>`,
      `<b>Cairo</b>`,
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).not.toContain("<script>");
    expect(callArgs.html).not.toContain("<img src=x");
    expect(callArgs.html).not.toContain("<owner@example.com>");
    expect(callArgs.html).not.toContain("<b>Cairo</b>");
    expect(callArgs.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(callArgs.html).toContain("&lt;owner@example.com&gt;");
    expect(callArgs.html).toContain("&lt;b&gt;Cairo&lt;/b&gt;");
  });

  it("should send subscription reminder email with plural days", async () => {
    await sendSubscriptionReminderEmail(
      "merchant@example.com",
      "My Boutique",
      3,
      "https://nour.example/renew"
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "merchant@example.com",
        subject: "⏰ اشتراكك في نور ينتهي خلال 3 أيام",
      })
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("My Boutique");
    expect(callArgs.html).toContain("3 أيام");
    expect(callArgs.html).toContain("https://nour.example/renew");
  });

  it("should send subscription reminder email with singular day", async () => {
    await sendSubscriptionReminderEmail(
      "merchant@example.com",
      "My Boutique",
      1,
      "https://nour.example/renew"
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "merchant@example.com",
        subject: "⏰ اشتراكك في نور ينتهي خلال 1 يوم",
      })
    );

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.html).toContain("My Boutique");
    expect(callArgs.html).toContain("1 يوم");
    expect(callArgs.html).toContain("https://nour.example/renew");
  });
});
