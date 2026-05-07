# Phase 1: Foundation Reality Check

## Goal

Produce an evidence-based blocker list for `C:\proj\nour`. Do not fix everything yet unless the fix is tiny and clearly safe. The output of this phase is a ranked foundation report.

## Why This Phase Exists

We need to know whether `nour` can become the production base without hidden blockers. The main risks are install/build stability, type errors, migrations, tenant isolation, checkout correctness, test coverage, and production mocks.

## Commands To Run

Prefer pnpm because this repo is pnpm-based.

```powershell
cd C:\proj\nour
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm -r --if-present run build
pnpm -r --if-present test
pnpm audit --prod
```

If Windows install fails because of Replit/Linux-only package overrides, document it clearly and decide whether to fix portability now or use WSL/Linux CI as the canonical build environment.

## Code Areas To Inspect

- Root package/workspace config: `package.json`, `pnpm-workspace.yaml`, `.npmrc`.
- Backend entrypoints: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts`.
- Route registry: `artifacts/api-server/src/routes/index.ts`.
- DB schema: `lib/db/src/schema`.
- Drizzle config: `lib/db/drizzle.config.ts`.
- Tests: `artifacts/api-server/src/**/*.test.ts` and workspace test scripts.
- Env/config validation paths.

## Required Checks

- Clean install status.
- Typecheck status.
- Build status.
- Test status.
- Dependency audit status.
- Whether real migrations exist and can be applied safely.
- Whether app starts without seed/demo assumptions.
- Whether production mode disables mock providers and demo behavior.

## Test Inventory To Produce

Do not only run existing tests. Also document whether tests exist for these risk areas:

| Area | Required Evidence |
| --- | --- |
| Auth/RBAC | Unauthenticated, wrong role, tenant admin, platform admin cases. |
| Tenant isolation | Tenant A cannot read or mutate Tenant B resources. |
| Checkout | Server-calculated totals, product tenant ownership, stock decrement, insufficient stock, order item creation. |
| Orders | Public tracking safety, merchant order read/update tenant scope, status transitions. |
| Products/variants | Variant ownership, stock limits, category ownership. |
| Webhooks/providers | Paymob or messaging mocks gated, HMAC/idempotency tests if provider code exists. |
| SEO/storefront | Public store/product pages expose metadata and active product data. |
| Arabic/mobile | Critical pages are Arabic/RTL and usable on mobile. |

## Deliverable

Create or update `docs/codex-roadmap/foundation-report.md` with:

- PASS/FAIL per command.
- Existing test inventory and missing test gaps.
- Blocking issues ranked Critical/High/Medium/Low.
- Exact files and line references.
- Recommended fix order.
- Decision: continue hardening `nour`, or start a new foundation.

## Exit Criteria

This phase is complete when we have a concrete blocker list and know whether `nour` is still the base.
