import { defineDataset } from '@objectstack/spec/ui';

/**
 * How long contracts take, stage by stage — DESIGN.md §09's second dataset,
 * by contract type and legal owner.
 *
 * ## The durations are `duration` measures (platform 18.2.0)
 *
 * Each stage measure is the platform's duration primitive
 * (`objectstack-ai/objectstack#25778`, shipped in `@objectstack/spec` 18.2.0):
 * `aggregate: 'avg'` over `duration: { from, to, unit: 'days' }`, two
 * `datetime` stamps of the same contract. The analytics service computes
 * `to - from` per row in the database (`julianday` on SQLite, `EXTRACT(EPOCH …)`
 * on PostgreSQL), divides by the unit, then averages. No expression and no SQL
 * enter this file (ADR-0021).
 *
 * What a reader of these numbers needs to know, all of it platform behaviour:
 *
 *   - **Unit: days, fractional.** `1.5` is a day and a half. The result field
 *     carries no unit on the wire, so every title that shows one of these says
 *     "days" itself.
 *   - **Each average has its own population.** A contract contributes to a
 *     stage only when BOTH of its stamps are set, so the four stage averages are
 *     taken over four different sets of contracts and do NOT add up to the
 *     submitted → approved turnaround. The demo shows it plainly: the in-force
 *     book was backfilled with signature and activation dates and mostly no
 *     intake, so signed → active is averaged over 72 contracts and
 *     submitted → review over 35.
 *   - **No monthly trend.** A duration measure under a time dimension bucketed
 *     by `granularity` is refused (`400 INVALID_FIELD`, naming the measure), as
 *     is one under a field-to-field filter. A bounded date window is fine —
 *     that is what `compareTo` shifts on the legal workbench.
 *
 * ## ⛔ The trap this file used to document, and why it stays closed
 *
 * Until 17.7.0 the "obvious" spelling — `avg` over each stamp, then
 * `derived: { op: 'difference' }` — parsed, ran and rendered `-0.85`: SQLite
 * stores `Field.datetime` as ISO text, so `AVG()` coerced each stamp to its
 * leading YEAR and the tile showed the difference of two average years.
 * 17.7.0 refuses `avg` over a datetime (`measure-aggregate-field-type-refused`),
 * and a `duration` measure never averages a stamp at all — it averages the
 * per-row difference. ⛔ Do not reintroduce a `derived` difference of two
 * stamp aggregates.
 *
 * ## What it does NOT carry: the per-type「超 SLA」
 *
 * The review SLA is per contract TYPE (`clm_contract_type.review_sla_days`).
 * Comparing `review_started_at` against "now minus that type's SLA" needs the
 * `$now` anchor's offset to read a column across the `contract_type` lookup,
 * and 18.2.0's anchor (`objectstack-ai/objectstack#25808`, ruling A) reads a
 * numeric column of the SAME record only — a dotted path is refused. The one
 * remaining route, a per-contract SLA column the app stamps, is the route
 * DESIGN.md §09 forbids. The legal workbench therefore keeps its fixed 30-day
 * tile, threshold in the title.
 */
export const CycleTimeDataset = defineDataset({
  name: 'contract_cycle_time',
  label: 'Contract Cycle',
  description:
    'How long contracts spend in each lifecycle stage, in days, by contract type and legal owner. Each average covers the contracts that have both of its stage dates.',
  object: 'clm_contract',
  include: ['contract_type'],

  dimensions: [
    { name: 'contract_type_name', label: 'Contract Type', field: 'contract_type.name', type: 'string' },
    // The §09 axis 法务经办. `legal_owner` is `Field.user` — a stored id, which
    // the executor resolves to a display label.
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

    // The four stages of DESIGN.md §09's chain
    // submitted_at → review_started_at → approved_at → signed_at → activated_at.
    { name: 'avg_days_to_review', label: 'Avg Days: Submitted → Review Started', aggregate: 'avg', duration: { from: 'submitted_at', to: 'review_started_at', unit: 'days' }, format: '0.0' },
    { name: 'avg_days_in_review', label: 'Avg Days: Review Started → Approved', aggregate: 'avg', duration: { from: 'review_started_at', to: 'approved_at', unit: 'days' }, format: '0.0' },
    { name: 'avg_days_to_signature', label: 'Avg Days: Approved → Signed', aggregate: 'avg', duration: { from: 'approved_at', to: 'signed_at', unit: 'days' }, format: '0.0' },
    { name: 'avg_days_to_activation', label: 'Avg Days: Signed → Active', aggregate: 'avg', duration: { from: 'signed_at', to: 'activated_at', unit: 'days' }, format: '0.0' },

    // §09's 平均周转 on the legal workbench: the part of the cycle legal owns,
    // from submission to approval. Its own population — see the module comment.
    { name: 'avg_days_to_approval', label: 'Avg Days: Submitted → Approved', aggregate: 'avg', duration: { from: 'submitted_at', to: 'approved_at', unit: 'days' }, format: '0.0' },
  ],
});
