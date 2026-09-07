# Post-signature domain: `clm_obligation`, `clm_payment_plan`, and the contract roll-ups

Milestone: M1 · Labels: `pm:queue` · Blocked-by: 02

## Scope
`src/objects/obligation.object.ts`, `payment-plan.object.ts`; the five `summary` roll-up fields on
`clm_contract`; state-machine guards for both children in `contract.hook.ts`.

## Spec — DESIGN.md §03
Both `controlled_by_parent`, masterDetail `clm_contract` cascade, `nameField: 'display_name'`
(mirror stamped by `mirror.hook.ts`: obligation = `title`; payment plan = `第<seq>期 · <planned_date>` in
the record's locale — if the mirror cannot be localized at stamp time, use `#<seq> · <planned_date>` and note it).
`clm_obligation` icon `list-checks`; `clm_payment_plan` icon `banknote`. Amounts currency scale 2 min 0.

Roll-ups on `clm_contract` (`Field.summary`): `version_count` count of versions · `open_deviation_count`
count of deviations where `status == 'open'` · `overdue_obligation_count` count where `status == 'overdue'` ·
`planned_amount` sum of `planned_amount` · `actual_amount` sum of `actual_amount`. Read the
`summaryOperations` shape in `@objectstack/spec/data` before authoring; filtered roll-ups use the
`filter` predicate form the schema documents.

State machines: obligation `pending→in_progress/done/waived/overdue; overdue→done/waived;
in_progress→done/waived`; payment plan `planned→due→partial/paid/overdue; overdue→partial/paid`.
`overdue` is entered only by the daily jobs (card 09) — a user write to `overdue` is refused.

## Acceptance
- Gates green; `pnpm validate` reports 11 objects.
- Creating two versions on a contract reads back `version_count == 2` through REST.

## Out of scope
The jobs that flip `overdue` (09), dashboards (10).
