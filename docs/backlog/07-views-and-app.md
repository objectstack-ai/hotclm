# Views, contract detail page, the one App with five audience groups

Milestone: M2 · Labels: `pm:queue` · Blocked-by: 04

## Scope
`src/views/*.view.ts`, `src/pages/contract_detail.page.ts`, `src/apps/clm.app.ts`.

## Spec — DESIGN.md §05, verbatim
Five navigation groups gated by the §04 capabilities; the views listed per group; kanban by status;
calendar on `end_date`; the detail page as slotted: header actions by status and gate, highlights,
path component over the seven pre-terminal statuses, seven tabs including the platform discussion slot.
No anonymous public form. Navigation items must be `{ label: string }` objects, never bare strings
(translation namespace rule). `requiredPermissions` must name a capability card 04 registered —
an unknown capability only warns at validate and hides the group at runtime.

## Acceptance
- Gates green. Each of the six permission sets logs in and sees exactly its groups.
- Every `record:related_list` filter uses the rule-object shape the `ComponentPropsMap` declares
  (HotCRM AGENTS.md rule 2 — the AST array form is rejected at build).

## Out of scope
Dashboards (10), translations (11).
