# Roadmap Status

Keep this file short. Update it at the end of each completed work session.

## Current Decision

Base project: `C:\proj\nour`.

Foundation decision: continue hardening `C:\proj\nour`; Phase 1 did not prove a rewrite or Next.js/NestJS migration is required.

Current phase: Phase 2, Production Hardening, Vercel Preview build-ready pending environment/runtime configuration.

## Phase Status

- Phase 1: Complete - foundation report written at `docs/codex-roadmap/foundation-report.md`.
- Phase 2: Preview build-ready - production hardening pass implemented, scoped runtime tests pass, root build passes locally, and `pnpm exec vercel build --yes` completes.
- Phase 3: Not started.
- Phase 4: Not started.
- Phase 5: Not started.
- Phase 6: Not started.
- Phase 7: Not started.

## Session Notes

- Initial handoff docs created.
- 2026-05-07: Ran Phase 1 foundation reality check. Current status is NEEDS WORK: Windows install/build/test are blocked, API typecheck fails, DB has no real migrations, checkout has tenant/stock correctness risks, Paymob still has demo/unsafe paths, and provider/checkout/mobile/SEO tests are incomplete.
- 2026-05-07: Phase 2 hardening pass scoped to checkout/orders, Paymob, storefront settings, sessions/rate limits, and Drizzle migrations. Implemented tenant-derived checkout validation, atomic stock decrement, cart session/store slug checks, authenticated tenant-scoped merchant order routes, public order tracking by `publicCode` + token, stock restore on cancel/return/failing Paymob payment, production env guardrails, Paymob production mock rejection/HMAC guard, persisted storefront theme/secondary color/tracking settings, and focused API tests for tenant/stock/tracking/settings/Paymob mock safety.
- 2026-05-07: Added Drizzle migration scripts and generated `lib/db/drizzle/0000_busy_mentallo.sql`; documented fresh-baseline vs existing-DB migration commands in `lib/db/MIGRATIONS.md`. Verification passed: `pnpm run typecheck:libs`, `$env:DATABASE_URL='postgres://user:pass@localhost:5432/nour'; pnpm --filter @workspace/db run check`, and the same env with `pnpm --filter @workspace/db run generate` reporting no schema changes.
- 2026-05-07: Added a dependency-free workspace env loader for the DB package so Drizzle commands and API tests can discover root `.env` automatically, prefer `.env.test` when `NODE_ENV=test`, and preserve explicitly-set shell variables. Verification passed with `$env:DATABASE_URL=$null; pnpm --filter @workspace/db run check` and `pnpm run typecheck:libs`.
- 2026-05-07: Ran Phase 2 scoped runtime verification against the configured database. Initial parallel run showed cross-file interference, so the stable command is `pnpm --filter @workspace/api-server exec vitest run src/test/orders.test.ts src/test/store-settings.test.ts src/test/paymob.test.ts --fileParallelism=false`. Result: 3 test files passed, 23 tests passed. Also fixed insufficient-stock checkout to return `409 Conflict` and updated test cleanup to delete `tenant_audit_events` before deleting merchants.
- 2026-05-07: Cleared the Vercel Preview build blocker from `pnpm run build`. API and fashion-store typechecks now pass, mockup-sandbox no longer requires `PORT`/`BASE_PATH` at build-time, and root build completed successfully. Re-verified Phase 2 scoped API tests: 3 files passed, 23 tests passed.
- 2026-05-07: Fixed the Vercel output directory failure by adding root `vercel.json` with `outputDirectory` set to `artifacts/fashion-store/dist/public`. Also made the root `preinstall` script cross-platform so local Vercel CLI builds work on Windows. Verification passed: `pnpm exec vercel build --yes` completed and generated `.vercel/output`.
- 2026-05-07: Diagnosed the deployed signup "store name used" issue as Vercel serving only static frontend output with no API function. Added a Vercel `/api/:path*` adapter for the existing Express app, SPA fallback rewrites, and production-safe Postgres session fallback when Redis is not configured. Verification passed: auth tests, API typecheck, and `pnpm exec vercel build --yes` generating `.vercel/output/functions/api/[...path].func`.
- 2026-05-07: Fixed live Production signup slug checks on Vercel. Production `DATABASE_URL` and `SESSION_SECRET` were added as sensitive Vercel env vars, Postgres uses SSL in production, Vercel upload paths now use `/tmp`, and signup shows a server-connection error instead of "link used" when slug checking fails. Deployed Production with `pnpm exec vercel deploy --prebuilt --prod --yes`; live verification passed: `GET /api/auth/check-slug` returned `200` and `available: true` for a random slug.

## Active Blockers

- Vercel Production is now wired to the configured Supabase database for main-branch testing. A separate staging/test database is still recommended before real merchants/users are onboarded.
