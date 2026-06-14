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

## 2024-06-14 - Palette: Avant-Garde Editorial Theme Implementation
**Learning:** Successfully expanded `StoreConfig` types and `PERSONALITY_PRESETS`/`STYLE_PRESETS` to support a new `"avant-garde-editorial"` visual theme with localized i18n copy.
**Action:** When conditionally injecting distinct strings/assets for a specific style, ensure it scales cleanly within factory components like `createDefaultSection` by extending their signature (e.g., adding `style?: StyleType`), preventing duplication of boilerplate. Ensure the default fallback translation logic correctly handles conditional checks without destroying existing nested logic.
