## 2024-05-18 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Across the frontend, particularly in standard UI and storefront components (e.g. `image-upload.tsx`, `StorefrontProductCard.tsx`, `GuideCard.tsx`), icon-only buttons `<button><Icon /></button>` are frequently created without `aria-label` attributes, leading to accessibility issues for screen reader users.
**Action:** Always review buttons during feature development to ensure those without readable text content include an explicit `aria-label` describing their action.
