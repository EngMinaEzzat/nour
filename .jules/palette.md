## 2025-05-15 - [Accessible Icon-Only Buttons and Localized Feedback]
**Learning:** In an RTL (Right-to-Left) and localized (Arabic) storefront, icon-only buttons (like Wishlist hearts or Star ratings) are frequently used for visual cleanliness, but they are completely invisible to screen readers without explicit `aria-label` attributes. Furthermore, silent state changes (like adding to a bag) need prominent, localized feedback (Success Toasts) to confirm the action, especially when the cart drawer is not automatically opened.
**Action:** Always provide `aria-label` for icon-only buttons and use success toasts for critical async actions like "Add to Bag" to ensure accessibility and clear user feedback.
## 2024-06-08 - Password Visibility Toggles ARIA Labels
**Learning:** Found multiple instances where the "Toggle Password Visibility" buttons in authentication flows lacked accessibility labels, rendering them difficult to use for screen readers. Added a translated `aria-label` utilizing `react-i18next`.
**Action:** Always ensure that icon-only interactive elements in reusable or standalone components include translated `aria-label` attributes.
