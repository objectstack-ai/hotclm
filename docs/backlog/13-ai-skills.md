# S1–S4 skills with honest degradation

Milestone: M4 · Labels: `pm:queue` · Blocked-by: 05

## Scope
`src/skills/{extract-terms,review-summary,deviation-check,contract-qa}.skill.ts`; the actions they call;
UI affordances gated on the `ai` capability being present at runtime.

## Spec — DESIGN.md §07
Skills-only surface attached to the platform `ask` assistant by `surface` (ADR-0063); no app agents.
Every skill proposes and the user confirms; every write goes through an `ai.exposed` action with a
`description`. `ai` is **not** declared in `requires` (fail-fast on open edition — see HotCRM's config
note); the skills validate and build regardless. When the runtime has no AI tier, every AI button and
field is hidden — there is no placeholder output, ever.

## Acceptance
- Gates green with and without `@objectstack/service-ai` present.
- On the cloud runtime, uploading a seeded PDF through S1 proposes party, amount and dates and writes
  them only after confirmation, with an audit row naming the contract.

## Out of scope
Embedding-based clause recall (v2).
