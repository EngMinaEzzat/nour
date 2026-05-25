import { describe, it, expect } from "vitest";
import {
  buildOrderConfirmationMessage,
  buildDispatchedMessage,
  buildShippingUpdateMessage,
  buildCancelledMessage,
  buildDeliveryFollowUpMessage,
  buildReturnExchangeMessage,
} from "../lib/whatsapp.js";

describe("WhatsApp Template Builders", () => {
  describe("buildOrderConfirmationMessage", () => {
    it("should build correct message without tracking number", () => {
      const msg = buildOrderConfirmationMessage({
        customerName: "Ahmed",
        orderId: 1024,
        storeName: "Test Store",
        totalAmount: 1500,
        items: [
          { name: "Product A", quantity: 2 },
          { name: "Product B", quantity: 1 }
        ]
      });

      expect(msg).toContain("مرحباً Ahmed 👋");
      expect(msg).toContain("✅ تم تأكيد طلبك من *Test Store*");
      expect(msg).toContain("🔢 رقم الطلب: *#1024*");
      expect(msg).toContain("• Product A (2×)");
      expect(msg).toContain("• Product B (1×)");
      expect(msg).toContain("💰 الإجمالي: *١٬٥٠٠ ج.م*");
      expect(msg).not.toContain("رقم التتبع");
      expect(msg).toContain("سيتم التواصل معك قريباً لتحديد موعد التوصيل.");
    });

    it("should build correct message with tracking number", () => {
      const msg = buildOrderConfirmationMessage({
        customerName: "Sara",
        orderId: 2048,
        storeName: "Fashion Hub",
        totalAmount: 300,
        items: [],
        trackingNumber: "TRK-987654321"
      });

      expect(msg).toContain("📦 رقم التتبع: *TRK-987654321*");
    });
  });

  describe("buildDispatchedMessage", () => {
    it("should build correct message without tracking number", () => {
      const msg = buildDispatchedMessage({
        customerName: "Ali",
        orderId: 500,
        storeName: "Tech Gadgets"
      });

      expect(msg).toContain("مرحباً Ali 👋");
      expect(msg).toContain("🚚 طلبك من *Tech Gadgets* في الطريق إليك!");
      expect(msg).toContain("🔢 رقم الطلب: *#500*");
      expect(msg).not.toContain("رقم التتبع");
    });

    it("should build correct message with tracking number", () => {
      const msg = buildDispatchedMessage({
        customerName: "Ali",
        orderId: 500,
        storeName: "Tech Gadgets",
        trackingNumber: "123456789"
      });

      expect(msg).toContain("📦 رقم التتبع: *123456789*");
    });
  });

  describe("buildShippingUpdateMessage", () => {
    it("should build correct message without tracking number", () => {
      const msg = buildShippingUpdateMessage({
        customerName: "Mona",
        orderId: 800,
        storeName: "Beauty Store",
        statusAr: "جاري التوصيل"
      });

      expect(msg).toContain("مرحباً Mona 👋");
      expect(msg).toContain("📦 تحديث على طلبك من *Beauty Store*");
      expect(msg).toContain("🔢 رقم الطلب: *#800*");
      expect(msg).toContain("📌 الحالة: *جاري التوصيل*");
      expect(msg).not.toContain("رقم التتبع");
    });

    it("should build correct message with tracking number", () => {
      const msg = buildShippingUpdateMessage({
        customerName: "Mona",
        orderId: 800,
        storeName: "Beauty Store",
        statusAr: "جاري التوصيل",
        trackingNumber: "FAST-TRACK-1"
      });

      expect(msg).toContain("🔍 رقم التتبع: *FAST-TRACK-1*");
    });
  });

  describe("buildCancelledMessage", () => {
    it("should build correct message without reason", () => {
      const msg = buildCancelledMessage({
        customerName: "Omar",
        orderId: 900,
        storeName: "Books Online"
      });

      expect(msg).toContain("مرحباً Omar 👋");
      expect(msg).toContain("❌ تم إلغاء طلبك #900 من *Books Online*");
      expect(msg).not.toContain("السبب:");
    });

    it("should build correct message with reason", () => {
      const msg = buildCancelledMessage({
        customerName: "Omar",
        orderId: 900,
        storeName: "Books Online",
        reason: "المنتج غير متوفر حالياً"
      });

      expect(msg).toContain("السبب: المنتج غير متوفر حالياً");
    });
  });

  describe("buildDeliveryFollowUpMessage", () => {
    it("should build correct follow-up message", () => {
      const msg = buildDeliveryFollowUpMessage({
        customerName: "Nour",
        orderId: 100,
        storeName: "Home Decor"
      });

      expect(msg).toContain("مرحباً Nour 👋");
      expect(msg).toContain("🌟 آملين إن طلبك #100 من *Home Decor* وصلك بخير!");
      expect(msg).toContain("نتمنى تكون راضي عن المنتج");
    });
  });

  describe("buildReturnExchangeMessage", () => {
    it("should build correct return/exchange message", () => {
      const msg = buildReturnExchangeMessage({
        customerName: "Youssef",
        orderId: 200,
        storeName: "Sports Gear"
      });

      expect(msg).toContain("مرحباً Youssef 👋");
      expect(msg).toContain("🔄 بخصوص طلب الإرجاع/الاستبدال لطلب #200 من *Sports Gear*");
      expect(msg).toContain("سيتواصل معك فريقنا خلال 24-48 ساعة لإتمام الإجراءات.");
    });
  });
});
