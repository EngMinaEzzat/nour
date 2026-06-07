## 2024-06-07 - Vitest Configuration
**Learning:** Initializing vitest in a library without workspace awareness using `pnpm install` might cause package conflicts and errors due to peer dependencies.
**Action:** When adding tests to an isolated package, explicitly filter for the package while adding vitest dependencies `pnpm add -D vitest @vitest/runner --filter @workspace/api-client-react`, ensure node environment is set, and confirm the workspace `typecheck` validates the overall integration.
