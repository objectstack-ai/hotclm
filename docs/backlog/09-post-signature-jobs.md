# F9 activation · F10–F14 scheduled jobs

Milestone: M3 · Labels: `pm:queue` · Blocked-by: 04

## Scope
`src/objects/contract.hook.ts` (F9, F14), `src/flows/obligation-due.flow.ts` (F10),
`payment-overdue.flow.ts` (F11), `renewal-notice.flow.ts` (F12), `expiration-sweep.flow.ts` (F13),
`legal-review-sla.flow.ts` (F3), `turn-stalled.flow.ts` (F4).

## Spec — DESIGN.md §06
Exactly the behaviors in the table. All scheduled flows `runAs: 'system'` with the reason stated;
`os lint` must show no `flow-runas-unscoped`. Dates: the platform CEL has no `daysBetween` (gap #7) —
compute windows in the job's `script`/query filters, never in formula fields. `overdue` is written by
these jobs only. F12's "发起续签" is an action that pre-fills a new draft with `renewed_from`.
F9 writes back to `crm_contract` **only** when the record carries a `crm_contract` link (the field exists
only if card 02 could declare it).

## Acceptance
- Gates green. With the seeds, one run of each job produces the expected inbox notifications for the
  seeded due/overdue records and flips exactly those statuses.

## Out of scope
E-signature callback (12).
