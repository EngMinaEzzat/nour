# Start New Phase Prompt

Use this prompt when starting a new Codex chat. Change only the phase number.

```text
We are continuing the Nour SaaS project.

Current phase: PHASE_NUMBER

Start by reading:
C:\proj\nour\CODEX_HANDOFF.md

Then read:
C:\proj\nour\docs\codex-roadmap\00-status.md

Then find the matching phase file for PHASE_NUMBER from the "Phase Files" list in CODEX_HANDOFF.md and read only that phase file.

Work only on this phase.
Do not read the whole repo unless the phase file requires specific files.
Do not overwrite C:\proj\nour with the ecommerce Replit zip.
Do not migrate to Next.js/NestJS unless the current phase explicitly proves Nour cannot be stabilized.
Do not start later phases unless I explicitly ask.

Follow the phase file exactly:
- inspect the files it lists,
- run or document the commands/tests it asks for,
- implement only the scoped work for this phase,
- verify with the narrowest useful tests first,
- update C:\proj\nour\docs\codex-roadmap\00-status.md before finishing.

If you hit a blocker, document:
- what failed,
- exact command/output or file reference,
- why it blocks this phase,
- the smallest recommended next action.
```

## Phase Number Map

- Phase 1: Foundation Reality Check.
- Phase 2: Production Hardening.
- Phase 3: SEO And App-Like Speed.
- Phase 4: Core Merchant Workflow.
- Phase 5: AI Hardening.
- Phase 6: Integrations.
- Phase 7: Scale And Compliance.

## Example

For Phase 1, paste the same prompt and replace:

```text
Current phase: PHASE_NUMBER
```

with:

```text
Current phase: Phase 1
```

