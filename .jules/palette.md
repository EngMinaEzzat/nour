## 2025-05-15 - [Accessible Icon-Only Buttons and Localized Feedback]
**Learning:** In an RTL (Right-to-Left) and localized (Arabic) storefront, icon-only buttons (like Wishlist hearts or Star ratings) are frequently used for visual cleanliness, but they are completely invisible to screen readers without explicit `aria-label` attributes. Furthermore, silent state changes (like adding to a bag) need prominent, localized feedback (Success Toasts) to confirm the action, especially when the cart drawer is not automatically opened.
**Action:** Always provide `aria-label` for icon-only buttons and use success toasts for critical async actions like "Add to Bag" to ensure accessibility and clear user feedback.
## 2024-06-06 - Add ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only buttons (like scroll arrows, clear filter tags, and scroll-to-top buttons) that lacked accessible names (`aria-label`), making them invisible or confusing to screen reader users. The application also relies on `react-i18next` for translations.
**Action:** When adding or modifying icon-only buttons, always include an `aria-label` attribute. If the application uses `react-i18next` (`useTranslation`), use the `t()` function to provide a translated, accessible label.

## 2024-06-07 - Add missing ARIA labels to AiAssistant icon buttons
**Learning:** Found an accessibility issue pattern in custom UI components where `Button`s configured as icons (`size="icon"`) sometimes lack descriptive `aria-label`s. In the `AiAssistant` component, interactive elements like 'Open', 'Clear History', 'Close', and 'Send' relied purely on visual icons or surrounding context, which is insufficient for screen readers.
**Action:** Always ensure that `Button` components using `size="icon"` include a translated `aria-label` prop utilizing `t()`, mapping to an appropriate key in the internationalization files. If the exact term isn't there, fallback to a well-known `common.buttons.*` key or standard tooltip keys.

## 2024-06-08 - Password Visibility Toggles ARIA Labels
**Learning:** Found multiple instances where the "Toggle Password Visibility" buttons in authentication flows lacked accessibility labels, rendering them difficult to use for screen readers. Added a translated `aria-label` utilizing `react-i18next`.
**Action:** Always ensure that icon-only interactive elements in reusable or standalone components include translated `aria-label` attributes.
## 2024-06-13 - Add Cyberpunk Theme
**Learning:** Expanding types inside a union type configuration file requires updating functions that consume these types and conditionally return translations.
**Action:** When adding new configuration themes with completely localized specific copies, ensure the default factories (like `createDefaultSection`) check for the active style, apply the new translation keys (with fallbacks to default theme values), and verify via unit tests that the fallback and specific languages logic remain intact.

## 2026-06-15 - Palette: Introduce Boho Chic Theme
**Learning:** Added a new complete visual theme (boho-chic) to the `artifacts/fashion-store`. This required creating the design system config using Stitch MCP (with `stitch_upload_design_md` and `stitch_create_design_system_from_design_md`), managing UI translation state in `translation.json`, and downloading appropriately stylized fallback placeholder images.
**Action:** When adding new UI themes in the store config, ensure the theme maps correctly onto the existing Section configurations and `StyleType` / `PersonalityType` unions, add the corresponding default image fallbacks, and keep all textual copies heavily localized with `i18next`.
## 2026-06-15 - Dynamic Arbitrary Variant Sizes
**Learning:** For physical variants, standard sizes (S, M, L) are rarely comprehensive. Providing dynamic `size` strings combined with individual line items maps better to e-commerce reality.
**Action:** When asked to alter predefined selection grids (like variants or dimensions), prioritize moving to a list of dynamic row items to fully unlock the feature's capability.
