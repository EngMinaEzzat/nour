# Fashion Store - Customer Flow UI Design System Plan (UI Designer)

Introduce a premium, responsive visual design system and dynamic theming framework for the Nour customer storefront. This plan establishes robust design tokens (colors, typography, spacing, shadows, micro-animations), enhances critical shopper-facing components, and ensures WCAG AA compliance (4.5:1 text contrast and 44px minimum touch targets) for Egyptian mobile shoppers.

---

## User Context & Inputs
- **Visual Direction**: Approved modern aesthetics package containing glassmorphic card elements, subtle hover zooms (transitions/transforms), and high-contrast typography (using Google Fonts like *Inter* for English and *Cairo* or *Tajawal* for Arabic).
- **Merchant Palette Compatibility**: Dynamic CSS variables (e.g. `--color-primary-500`) with built-in contrast guardrails to prevent low-contrast text.
- **Theming**: Light mode focus for now. No dark mode required for this phase.
- **Icon Packs**: Allowed to use Lucide React icons for richer visual cues and accessibility representation.

---

## Proposed Changes

### Core Design Foundations & Tokens

Establish unified styling tokens in the global CSS to drive consistent layouts, spacing, shadows, and interactive transitions.

#### [MODIFY] [index.css](file:///c:/proj/nour/artifacts/fashion-store/src/index.css)
- **Design Tokens**: Define HSL-based color palettes (Primary, Neutral, Success, Warning, Error) allowing runtime customization while retaining readable contrast.
- **Glassmorphism & Shadows**: Add reusable CSS classes for glassmorphic elements (`.glass-panel`) and tiered shadows (`--shadow-sm`, `--shadow-md`, `--shadow-lg`).
- **Standard Outlines & Focus States**: Implement standard, visible focus outlines (`focus-visible`) for all interactive elements to support keyboard accessibility.
- **Typography Integration**: Standardize font hierarchy, custom leading, and optimal line-heights for both Arabic and English text blocks.

---

### Storefront Layouts & Cards

Redesign product cards to engage shoppers immediately, featuring clean spacing, discount tags, and mobile-friendly CTAs.

#### [MODIFY] [StorefrontProductCard.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/components/storefront/StorefrontProductCard.tsx)
- **Visual Enhancements**: Implement a card wrapper with subtle borders, border-radius, and hover scale transforms.
- **Add to Cart CTA**: Add a prominent, mobile-friendly Add-to-Cart or Variant-Choice button directly on the card without relying on desktop hover behaviors.
- **Badges & Out-of-Stock States**: Design clear labels for active discounts (e.g., `-25%` or `خصم ٢٥٪`), new arrivals, and a visually distinct grayscale/faded design for out-of-stock items.

---

### Product Detail & Interactive Triggers

Revamp variant options and purchase CTAs to minimize confusion during selection.

#### [MODIFY] [product-detail.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/pages/product-detail.tsx)
- **Variant Selector Redesign**:
  - Convert size and color selections into easy-to-tap pills or circular color swatches (min 44px touch targets).
  - Add interactive hover/active states with bounding borders.
- **Low-Stock Alert**: Design a sleek, high-visibility warning banner (`.bg-warning-100` / `.text-warning-800`) when items have fewer than 3 left in stock.
- **Primary & Secondary CTAs**: Style the primary "Add to Cart" button (full width on mobile, smooth click animation) and secondary "Ask on WhatsApp" button with appropriate green brand styling.
- **Trust Badges**: Add high-quality SVG icons and micro-copy for Return & Exchange guarantees and Cash on Delivery (COD) confirmation near the checkout CTAs.

---

### Cart Drawer Experience

Redesign the shopping cart overlay to present a clean summary of items and shipping conditions before the shopper transitions to checkout.

#### [MODIFY] [cart-drawer.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/components/cart-drawer.tsx)
- **Drawer Animation**: Ensure smooth entry slide-in transitions.
- **Pricing Breakdown**: Format subtotal, delivery fees, applied discounts, and final total using readable, large typography.
- **Egyptian COD Reassurance**: Display structured text in Arabic ("الدفع عند الاستلام") to reassure Egyptian consumers about the safety of their order.
- **Empty Cart State**: Style the empty cart illustration, providing a direct button leading back to the collections.

---

### Checkout & Forms UI

Rework form inputs, error validation messages, and summaries to prevent cart abandonment.

#### [MODIFY] [checkout.tsx](file:///c:/proj/nour/artifacts/fashion-store/src/pages/checkout.tsx)
- **Structured Form Inputs**: Redesign standard input fields with spacious padding, clear labels, and subtle shadows.
- **Governorate & Area Selectors**: Redesign custom dropdown menus to make finding and selecting Egyptian locations effortless on mobile screens.
- **Interactive Step Indicator**: Build a visual step indicator (e.g., 1. Customer Details -> 2. Delivery Info -> 3. Place Order) at the top of the form.
- **Validation Feeds**: Implement clean, semantic validation messages underneath input fields (red for errors, green for valid entries) to minimize user input frustration.

---

## Verification Plan

### Automated Tests
- Validate components render with accessible contrast ratios using standard axe-core tools or Chrome Lighthouse.
- Ensure Vite builds successfully without TypeScript or CSS compile-time issues:
  ```powershell
  npm run build
  ```

### Manual Verification
- View layout responsiveness across standard device sizes using the developer emulator tools (Mobile S/M/L, Tablet, Desktop).
- Manually click through buttons, dropdowns, and form inputs to ensure focus-visible boundaries are clean, touch target heights are adequate (>= 44px), and error messaging triggers instantly upon invalid inputs.
