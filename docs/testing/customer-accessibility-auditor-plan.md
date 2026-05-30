# Fashion Store - Customer Flow Accessibility Audit Plan (Accessibility Auditor)

Formulate a comprehensive strategy to audit the storefront, cart, product details, and checkout pages against WCAG 2.2 AA standards. This plan details automated testing scripts (using `axe-core`), keyboard-only navigation protocols, focus-trapping validation (for overlays), and screen-reader compatibility tests to ensure an inclusive shopping experience for all consumers.

---

## User Context & Inputs
- **Automated Scanning Hook**: Confirmed to integrate `@axe-core/playwright` as an E2E testing dependency to catch regressions automatically.
- **Focus Indicator Visibility**: Style a global standard focus indicator outline (2px solid offset border using the merchant's dynamic primary color).
- **Target Screen Readers**: NVDA/Chrome for Windows users and VoiceOver/Safari for iOS/macOS users.
- **Cognitive Accessibility**: Yes, verify bilingual error announcements (Arabic/English) and clear, legible confirmation timeouts.

---

## Proposed Changes

### Accessibility Auditing Framework

Establish the testing protocols and manual verification checklist.

#### [NEW] [accessibility-audit-protocol.md](file:///c:/proj/nour/docs/testing/accessibility-audit-protocol.md)
- **Keyboard Navigation Audit Sheets**: Document checklists for checking:
  - **Tab Focus Orders**: Ensuring interactive elements are structured logically from top-to-bottom.
  - **Focus Trap Actions**: Testing focus traps inside the cart drawer (`cart-drawer.tsx`) and search overlay (`SearchOverlay.tsx`). Focus must not escape until they are closed, and focus must return to the trigger button.
  - **Focus Indicators**: Auditing contrast and visibility of outlines.
- **Screen Reader Interaction Protocols**: Guidelines for verifying:
  - Form input labels and custom Egyptian governorate dropdowns.
  - Dynamic live region alerts (`aria-live="polite"`) when adding items to the cart.
  - Validation error readouts on the checkout form in both Arabic and English.

---

### Playwright Automated A11y Integration

Integrate accessibility tests into E2E verification files.

#### [MODIFY] [playwright.config.ts](file:///c:/proj/nour/artifacts/fashion-store/playwright.config.ts)
- **Axe-core Test Runner Hook**: Add configurations to integrate `@axe-core/playwright` as a dependency. Write E2E test stubs to automatically crawl and scan:
  - The storefront home page (`/`)
  - The product detail page (`/product/:slug`)
  - The checkout layout (`/checkout`)
- Set thresholds to fail tests when elements violate Critical or Serious WCAG success criteria (such as missing `alt` attributes or low-contrast text).

---

## Verification Plan

### Automated Tests
- Install dependencies and ensure E2E builds pass successfully without compiler exceptions:
  ```powershell
  npm run build
  ```
- Trigger automated scan scripts locally (once written):
  ```powershell
  npx playwright test
  ```

### Manual Verification
- Navigate the full user path (Home -> Select Product -> Add to Cart -> Checkout Form -> Place Order) utilizing ONLY the `Tab`, `Shift+Tab`, `Space`, `Enter`, and `Escape` keys. Ensure the visual outline is distinct on every step.
- Verify screen reader output using VoiceOver or NVDA, confirming cart contents and field validation errors are announced instantly in both languages.
