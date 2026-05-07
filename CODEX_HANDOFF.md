# Codex Handoff

This file is the starting point for future Codex chats. Read this file first, then open only the phase file you are working on under `docs/codex-roadmap/`.

## Decision

Use `C:\proj\nour` as the base project.

Do not overwrite it with `C:\Users\hp\Downloads\ecommerce-replit-most-updated.zip`. We compared the extracted zip against `C:\proj\nour`; the local `nour` folder contains all zip files plus extra hardening work.

Use the other projects only as references:

- `C:\proj\e-commerce`: engineering reference for Next.js, Prisma, tests, transactional checkout, tenant isolation, and production discipline.
- `C:\proj\remix_-glamouregypt-saas`: inspiration for visual builder, app-like dashboard flow, and SEO/app-shell ideas.

## Product Goal

Build a real Arabic-first Egyptian fashion/cosmetics SaaS platform where merchants can launch fast mobile storefronts, customize branding, use AI to create/import/manage products, handle COD orders, recover abandoned carts, run growth tools, and operate safely at multi-tenant scale.

## Current Architecture

Current `nour` stack:

- Monorepo with pnpm workspaces.
- Frontend: Vite + React storefront/admin app under `artifacts/fashion-store`.
- Backend: Express API server under `artifacts/api-server`.
- Database: PostgreSQL with Drizzle schema under `lib/db`.
- AI integrations: Anthropic and Gemini workspace packages.

Long-term ideal architecture if starting from scratch would be Next.js + PostgreSQL + Prisma or controlled SQL layer + Redis + storage/CDN + tests. But we are not starting over unless the foundation sprint proves `nour` cannot be stabilized.

## Main Rule

Do not add more product features before stabilizing the foundation.

Priority order:

1. Trust and correctness: tenant isolation, checkout integrity, stock, secure admin access.
2. Merchant revenue path: onboarding, product setup, COD checkout, orders, WhatsApp/contact workflow.
3. Arabic-first UX: RTL, mobile, Egyptian phone/governorate/shipping behavior.
4. SEO and app-like speed: SSR storefront pages, metadata, JSON-LD, sitemap, optimized images.
5. Growth and automation: abandoned carts, discounts, reviews, affiliates, AI, integrations.

## Working Protocol For Future Codex Chats

- Start with the current phase file only.
- Inspect only the files needed for that phase.
- Keep changes scoped to the current phase unless a blocker requires touching adjacent code.
- Do not overwrite user changes or replace `nour` with the zip.
- Do not migrate to Next.js/NestJS unless Phase 1 proves `nour` cannot be stabilized.
- Prefer evidence over claims: commands, tests, file references, and browser/API smoke results.
- At the end of each session, update `docs/codex-roadmap/00-status.md`.
- If implementation is done, run the narrowest useful verification first, then broader checks if risk is high.

## Phase Files

1. `docs/codex-roadmap/01-foundation-reality-check.md`
2. `docs/codex-roadmap/02-production-hardening.md`
3. `docs/codex-roadmap/03-seo-app-speed.md`
4. `docs/codex-roadmap/04-core-merchant-workflow.md`
5. `docs/codex-roadmap/05-ai-hardening.md`
6. `docs/codex-roadmap/06-integrations.md`
7. `docs/codex-roadmap/07-scale-compliance.md`

## How To Save Tokens

For a reusable prompt template, open:

`docs/codex-roadmap/START_NEW_PHASE_PROMPT.md`

In a new chat, you can also tell Codex:

```text
We are continuing the Nour SaaS project. Start by reading C:\proj\nour\CODEX_HANDOFF.md, then read only the current phase file: C:\proj\nour\docs\codex-roadmap\01-foundation-reality-check.md. Do not read the whole repo until needed.
```

When a phase is completed, update its checklist and add a short note to `docs/codex-roadmap/00-status.md`.

Avoid pasting long chat history into new sessions. Point Codex to these files instead.

## Definition Of Done

A phase is not done because code was written. It is done when:

- The requested behavior is implemented or the blocker is documented.
- Relevant tests exist or a clear reason is written for why they cannot yet exist.
- Relevant commands have been run, or the inability to run them is documented.
- Any remaining risks are listed in `00-status.md`.
