import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, request, createTestMerchant, cleanupTenant } from "./helpers.js";

describe("Store settings", () => {
  let ctx: Awaited<ReturnType<typeof createTestMerchant>>;

  beforeAll(async () => {
    ctx = await createTestMerchant();
  });

  afterAll(async () => {
    await cleanupTenant(ctx.tenantId, ctx.merchantId);
  });

  it("persists theme, secondary color, media, SEO, social links, and tracking settings", async () => {
    const branding = await ctx.agent.put("/api/store-settings/branding").send({
      name: ctx.storeName,
      description: "Updated settings description",
      logoUrl: "/uploads/logo.webp",
      coverUrl: "/uploads/cover.webp",
      faviconUrl: "/uploads/favicon.png",
      primaryColor: "#123456",
      secondaryColor: "#abcdef",
      theme: "luxe",
      city: "Cairo",
    });
    expect(branding.status).toBe(200);
    expect(branding.body.secondaryColor).toBe("#abcdef");
    expect(branding.body.theme).toBe("luxe");

    const seo = await ctx.agent.put("/api/store-settings/seo").send({
      seoTitle: "Nour Test Store",
      seoDescription: "A focused SEO description",
    });
    expect(seo.status).toBe(200);

    const social = await ctx.agent.put("/api/store-settings/social").send({
      instagram: "https://instagram.com/nour",
      facebook: "https://facebook.com/nour",
      tiktok: "https://tiktok.com/@nour",
      whatsapp: "01012345678",
      email: "merchant@nour.test",
      phone: "01012345678",
    });
    expect(social.status).toBe(200);

    const tracking = await ctx.agent.put("/api/tracking/settings").send({
      ga4MeasurementId: "G-ABC123",
      ga4Enabled: true,
      metaPixelId: "1234567890",
      metaEnabled: true,
    });
    expect(tracking.status).toBe(200);

    const settings = await ctx.agent.get("/api/store-settings");
    expect(settings.status).toBe(200);
    expect(settings.body.secondaryColor).toBe("#abcdef");
    expect(settings.body.theme).toBe("luxe");
    expect(settings.body.faviconUrl).toBe("/uploads/favicon.png");
    expect(settings.body.seoTitle).toBe("Nour Test Store");
    expect(settings.body.socialLinks.whatsapp).toBe("01012345678");

    const storefront = await request(app).get(`/api/store/${ctx.slug}`);
    expect(storefront.status).toBe(200);
    expect(storefront.body.secondaryColor).toBe("#abcdef");
    expect(storefront.body.theme).toBe("luxe");
    expect(storefront.body.trackingSettings.ga4Enabled).toBe(true);
  });
});
