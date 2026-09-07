# Four datasets, three dashboards

Milestone: M3 · Labels: `pm:queue` · Blocked-by: 08

## Scope
`src/datasets/*.dataset.ts` (contract_metrics, contract_cycle_time, obligation_metrics, payment_metrics),
`src/dashboards/{legal,executive,finance}.dashboard.ts`. Adds `requires: ['analytics']`.

## Spec — DESIGN.md §09
Datasets are the semantic layer (ADR-0021) — no hand-written cubes. Every dashboard filter field is a
persisted field (analytics cannot filter on formulas, gap #10). Period-over-period on the legal
workbench's cycle-time tile uses the platform's comparison primitive; no hardcoded deltas. Money formats
are plain `'0,0'`, never a baked currency symbol (HotCRM changelog lesson). Widgets declare only the keys
the dataset renderer reads.

## Acceptance
- Gates green. With `pnpm demo`, no widget on any of the three dashboards renders empty.

## Out of scope
Translations of dashboard labels (11).
