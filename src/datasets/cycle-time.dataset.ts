import { defineDataset } from '@objectstack/spec/ui';

/**
 * How far contracts get, and when — DESIGN.md §09's second dataset, by
 * contract type and legal owner.
 *
 * ## ⚠️ §09 asks for 各段时长 (per-stage DURATIONS). This dataset does not carry
 * one, because on this platform version none can be computed honestly.
 *
 * Measured on `@objectstack/spec` 17.3.0 + `@objectstack/service-analytics`
 * 17.3.0 + better-sqlite3 13.0.3, against the 820-row demo:
 *
 *   - `Field.datetime` persists an ISO **string**: `typeof(submitted_at)` is
 *     `'text'`, value `'2026-05-19T00:00:00.000Z'`.
 *   - So `AVG(submitted_at)` is SQLite's text→numeric coercion of that string:
 *     it answers `2025.9166666666667` — the average YEAR, to four decimals.
 *   - The dataset layer takes no SQL and no expressions (ADR-0021: a measure is
 *     `aggregate` + `field`, and the only computed form is
 *     `derived: { op, of }` over OTHER measures), so there is nowhere to write
 *     the subtraction.
 *   - `derived: { op: 'difference', of: ['avg_activated', 'avg_submitted'] }`
 *     PARSES, RUNS, and returns `-0.849999999999909`. That number is the
 *     difference of two average years. It is not a duration, it is not in days,
 *     and nothing about the tile it lands on would say so.
 *
 * That last one is the reason this is a comment and not a measure: the broken
 * form is the one that renders a clean, plausible number. Shipping it would be
 * exactly the "seeded number that looks computed" AGENTS.md forbids.
 *
 * A duration needs a PERSISTED numeric — the same shape DESIGN.md §12 already
 * prescribes for the other date-arithmetic gap (#7: "到期、逾期由日任务盖戳字段"),
 * i.e. a daily job stamping `clm_contract`. That field does not exist and
 * creating it is a schema change, not an analytics one. Raised on the PR.
 *
 * ## What it DOES carry
 *
 * Stage-reached counts. Each measure counts the contracts whose stage stamp is
 * set, so a widget can read the shape of the pipeline by type and by lawyer,
 * and window any one stage by its own date dimension. Measured on the fixture:
 * submitted 60 · review started 41 · approved 34 · signed 72 · activated 72.
 *
 * Those five are deliberately NOT read as a monotone funnel: `signed_at` (72)
 * exceeds `submitted_at` (60) because the demo's in-force book was backfilled
 * with signature dates and no intake. The status funnel on the legal workbench
 * is the honest funnel; these are per-stage coverage counts.
 */
export const CycleTimeDataset = defineDataset({
  name: 'contract_cycle_time',
  label: 'Contract Cycle',
  description:
    'Stage coverage by contract type and legal owner: how many contracts have reached each lifecycle stamp, and when. Carries no duration measure — see the module comment for the measurement that rules one out.',
  object: 'clm_contract',
  include: ['contract_type'],

  dimensions: [
    { name: 'contract_type_name', label: 'Contract Type', field: 'contract_type.name', type: 'string' },
    // The §09 axis 法务经办. `legal_owner` is `Field.user` — a stored id, which
    // the executor resolves to a display label. On a stock `pnpm demo` only the
    // dev admin account exists (DESIGN.md §10 forbids seeding users), so this
    // axis has one populated bucket and one null bucket today.
    { name: 'legal_owner', label: 'Legal Owner', field: 'legal_owner', type: 'lookup' },
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'review_sla_days', label: 'Type Review SLA (days)', field: 'contract_type.review_sla_days', type: 'number' },

    { name: 'submitted_month', label: 'Submitted Month', field: 'submitted_at', type: 'date', dateGranularity: 'month' },
    { name: 'review_started_month', label: 'Review Started Month', field: 'review_started_at', type: 'date', dateGranularity: 'month' },
    { name: 'approved_month', label: 'Approved Month', field: 'approved_at', type: 'date', dateGranularity: 'month' },
    { name: 'signed_month', label: 'Signed Month', field: 'signed_at', type: 'date', dateGranularity: 'month' },
    { name: 'activated_month', label: 'Activated Month', field: 'activated_at', type: 'date', dateGranularity: 'month' },
  ],

  measures: [
    { name: 'contract_count', label: 'Contracts', aggregate: 'count' },
    { name: 'submitted_count', label: 'Reached Submitted', aggregate: 'count', filter: { submitted_at: { $ne: null } } },
    { name: 'review_started_count', label: 'Reached Review', aggregate: 'count', filter: { review_started_at: { $ne: null } } },
    { name: 'approved_count', label: 'Reached Approved', aggregate: 'count', filter: { approved_at: { $ne: null } } },
    { name: 'signed_count', label: 'Reached Signed', aggregate: 'count', filter: { signed_at: { $ne: null } } },
    { name: 'activated_count', label: 'Reached Active', aggregate: 'count', filter: { activated_at: { $ne: null } } },
  ],
});
