# Consent and Tracking Notice

*LEGAL REVIEW REQUIRED: This documentation outlines the technical controls for tracking and marketing consent.*

## 1. What the Shopper Sees
- **Cookie Banner**: Before tracking pixels fire, the storefront must present a cookie/tracking notice. If the shopper declines, Google Analytics, Meta Pixel, and TikTok Pixel events will not be emitted.
- **Checkout Marketing Opt-in**: The checkout form includes an explicit checkbox (e.g., "أوافق على تلقي العروض الترويجية والرسائل التسويقية"). This defaults to unchecked.

## 2. What Merchants Control
- **Tracking Setup**: Merchants can enter Pixel IDs (GA4, Meta, TikTok) in their dashboard settings.
- **Pixel Toggles**: Even if a Pixel ID is entered, it must be explicitly enabled via `ga4Enabled`, `metaEnabled`, etc., before it renders on the storefront.
- **Marketing Automation**: Merchants can create automation rules to send WhatsApp messages. Transactional messages (order confirmation, shipping updates) are sent regardless of marketing consent. Marketing follow-ups (e.g., abandoned carts, promotional blasts) will check `customers.marketing_consent` before sending.

## 3. What Platform Operators Configure
- **Platform-Level Pixels**: Platform analytics (if any) tracking merchant behavior must also comply with B2B consent rules.
- **Enforcement**: Operators provide the API tools (`marketingConsent` flag on checkout) to ensure merchants cannot force opt-ins. Operators must periodically audit `marketingConsentSource` to ensure valid collection.
