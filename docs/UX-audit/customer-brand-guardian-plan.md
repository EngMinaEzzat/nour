# Fashion Store - Customer Flow Brand Guardian & Consistency Plan (Brand Guardian)

Establish brand consistency, localization structure, and dynamic SEO governance for the white-labeled fashion/cosmetics storefront customer flow. This plan ensures that regardless of the merchant's custom colors, logos, or domains, the shopper experiences a trustworthy, professional, and culturally appropriate interface in both Arabic and English.

---

## Proposed Changes

### Dynamic SEO & Social Media Metadata

Guard the store's search engine presence and share representations across platforms like WhatsApp and Facebook.

#### [MODIFY] [seo.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/components/seo.tsx)
- **OpenGraph Pricing & Availability**: Inject standard commerce OG metadata tags (`product:price:amount`, `product:price:currency`, and `og:availability`) when displaying product details.
- **Dynamic JSON-LD Product Schema**: Standardize structured product schema injection to support Google rich snippets, showing ratings, price, stock, and high-res imagery.

---

### Visual Fallbacks & Navigation Guarding

Maintain visual stability and brand structure when merchant assets are missing.

#### [MODIFY] [StoreHeader.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/components/storefront/StoreHeader.tsx)
- **Text-Logo Rendering Fallback**: Add code to check if `storeConfig.logoUrl` exists. If not, render a clean typographic brand logo using the store's name, customized using the dynamic primary color.
- **Language Switcher UI**: Restructure the LTR/RTL toggle in the header, ensuring it renders without breaking alignments across responsive headers.

---

### Localization Terminology & Layout Stability

Govern layout directions and currency formatting across shopping stages.

#### [MODIFY] [App.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/App.tsx)
- **RTL and Font Preloading**: Bind language changes (RTL for Arabic, LTR for English) to the HTML tag direction attribute and update dynamic class namespaces (e.g., standardizing typography alignments to prevent layout shifts).
- **Currency & Localized Copy Standards**: Add standard utility functions in `App.tsx` or utilities files to guarantee that:
  - English translations display "EGP" or "EGP {amount}".
  - Arabic translations consistently display "{amount} ج.م.".

#### [MODIFY] [StoreFooter.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/components/storefront/StoreFooter.tsx)
- **Structured Trust Information**: Standardize layout for merchant contacts, social channels, and return policy links, dynamically showing a professional layout even when the merchant has incomplete config profile entries.

---

## Verification Plan

### Automated Tests
- Run layout tests verifying text directions (`dir="rtl"` / `dir="ltr"`) apply correctly when toggling store language.
- Ensure the project builds correctly without validation errors:
  ```powershell
  npm run build
  ```

### Manual Verification
- Share storefront and product links using social debugging tools (such as Facebook Sharing Debugger or mock WhatsApp previews) to verify OpenGraph image URLs and text fields display clearly.
- Test missing logo scenarios in the preview browser to ensure text fallbacks keep headers aligned and looking professional.
