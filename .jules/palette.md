## 2025-05-15 - [Accessible Icon-Only Buttons and Localized Feedback]
**Learning:** In an RTL (Right-to-Left) and localized (Arabic) storefront, icon-only buttons (like Wishlist hearts or Star ratings) are frequently used for visual cleanliness, but they are completely invisible to screen readers without explicit `aria-label` attributes. Furthermore, silent state changes (like adding to a bag) need prominent, localized feedback (Success Toasts) to confirm the action, especially when the cart drawer is not automatically opened.
**Action:** Always provide `aria-label` for icon-only buttons and use success toasts for critical async actions like "Add to Bag" to ensure accessibility and clear user feedback.

## 2024-05-18 - [Avoid temporary script commit pollution]
**Learning:** During development, if one-off Node.js scripts (like `fix-aria.js`) are used within the workspace to bulk-replace strings or refactor code, they may be mistakenly staged and committed alongside the actual code changes, polluting the commit history.
**Action:** Always clean up temporary workspace files, scratchpad scripts, or testing artifacts (e.g., `rm fix-aria.js`) created via bash sessions before finalized code changes are submitted to prevent repository pollution.
