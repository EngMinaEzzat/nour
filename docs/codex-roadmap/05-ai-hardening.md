# Phase 5: AI Hardening

## Goal

Keep Nour's strong AI product advantage while making it safe, tenant-scoped, measurable, and billable.

## Existing AI Ideas To Preserve

- AI assistant.
- AI pricing advice.
- Facebook/Instagram import.
- AI product descriptions.
- AI reply drafts for WhatsApp/customer messages.

## Required Architecture

- AI routes are server-only.
- No AI provider keys in frontend/client bundles.
- Every generation is tenant-scoped.
- Store prompt type, input summary, result, model, tenant, merchant, token/cost estimate, and timestamps.
- Add plan-based and tenant-based rate limits.
- Add provider abstraction so Anthropic/Gemini/OpenAI can be switched.
- Add abuse protection and input length limits.
- Never let AI mutate catalog/order data without explicit merchant confirmation.

## Files To Inspect First

- `artifacts/api-server/src/routes/ai-assistant.ts`
- `artifacts/api-server/src/routes/ai-import.ts`
- `artifacts/api-server/src/lib/ai-rate-limit.ts`
- `lib/integrations-anthropic-ai`
- `lib/integrations-gemini-ai`
- `lib/db/src/schema/conversations.ts`
- `lib/db/src/schema/messages.ts`

## Tests

- AI endpoint requires auth.
- AI result belongs to correct tenant.
- Cross-tenant conversation access is rejected.
- Rate limits work.
- Oversized input is rejected or truncated.
- Production has no mock/fallback that pretends to be real AI.
- AI provider keys are never exposed to frontend bundles.
- AI generation records include tenant, merchant, model, prompt type, and timestamp.
- AI import/description/reply draft cannot mutate products or orders without explicit merchant action.

## Exit Criteria

This phase is complete when AI is safe enough to ship as a paid feature and has clear usage/accounting records.
