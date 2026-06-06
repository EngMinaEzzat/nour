## 2025-05-15 - [Accessible Icon-Only Buttons and Localized Feedback]
**Learning:** In an RTL (Right-to-Left) and localized (Arabic) storefront, icon-only buttons (like Wishlist hearts or Star ratings) are frequently used for visual cleanliness, but they are completely invisible to screen readers without explicit `aria-label` attributes. Furthermore, silent state changes (like adding to a bag) need prominent, localized feedback (Success Toasts) to confirm the action, especially when the cart drawer is not automatically opened.
**Action:** Always provide `aria-label` for icon-only buttons and use success toasts for critical async actions like "Add to Bag" to ensure accessibility and clear user feedback.

## 2024-06-06 - Add ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only buttons (like scroll arrows, clear filter tags, and scroll-to-top buttons) that lacked accessible names (`aria-label`), making them invisible or confusing to screen reader users. The application also relies on `react-i18next` for translations.
**Action:** When adding or modifying icon-only buttons, always include an `aria-label` attribute. If the application uses `react-i18next` (`useTranslation`), use the `t()` function to provide a translated, accessible label.
