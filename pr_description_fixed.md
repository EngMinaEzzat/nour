## 🧹 Code Health: replace any[] with Order[] in cod-score.tsx

🎯 **What:** Replaced the `any[]` type with the explicit `Order[]` type for the `orders` variable in `artifacts/fashion-store/src/pages/cod-score.tsx`. Imported `Order` from `@workspace/api-client-react`.
💡 **Why:** Using explicit typing prevents accidental type errors and improves the readability and maintainability of the component's codebase. Removing the `any` keyword aligns with stricter TypeScript usage.
✅ **Verification:** Ran typecheck for all libs and the fashion-store workspace (`pnpm run typecheck`), which passed successfully. Verified that UI tests for the fashion store didn't have regressions.
✨ **Result:** Improved type safety in `cod-score.tsx` when mapping over incoming order data, without changing the behavior or introducing regressions.
