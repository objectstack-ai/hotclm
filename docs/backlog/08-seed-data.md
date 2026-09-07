# Seed data: `demo-zh` (default) and `demo-en`

Milestone: M2 · Labels: `pm:queue` · Blocked-by: 03

## Scope
`src/data/demo-zh/`, `src/data/demo-en/`, `src/data/index.ts` selecting by `OS_SEED_LOCALE`
(default `zh`), `pnpm demo` / `pnpm demo:en` scripts as Duly does.

## Spec — DESIGN.md §10
One fictional company, six months of history, the counts in the §10 table, the status spread for
`clm_contract`, 10 contracts expiring within 30 days, obligations and payment plans due in the next 30
days and some overdue. `externalId` prefixed `clm:`. Users are not seeds; the README states which
positions to assign after creating users. Dynamic dates relative to boot (`daysFromNow`) so the demo
never ages. Industry-neutral schema: the company's industry shows only in names and descriptions.

## Acceptance
- `pnpm demo` on a clean checkout boots with every list non-empty; `pnpm demo:en` is row-for-row identical.
- No seeded value that looks computed (roll-ups are recomputed by the engine, not seeded).

## Out of scope
Dashboards reading the seeds (10).
