import type { Flow, FlowEdge, FlowNode } from '@objectstack/spec/automation';
import { holdersPrelude, rowBody, sweepFlow } from './_daily-sweep.js';
import { ref } from './_values.js';

/**
 * F3 `legal_review_sla` — the daily nudge on contracts sitting in legal review
 * past their contract type's review SLA (DESIGN.md §06 F3: "`in_review` 超过类型
 * `review_sla_days`：提醒 `legal_owner`，超一倍抄送 `clm_legal_head`").
 *
 * ## One rule with the legal workbench
 *
 * "Over SLA" is the rule the workbench's `review_over_sla_count` measure counts
 * (contract.dataset.ts, #31): in review, and `review_started_at` earlier than
 * now shifted by the contract's own `review_sla_days_offset` — the type's
 * `review_sla_days` as a NEGATIVE number of days, a stored `expression` the
 * engine keeps on the contract (contract.object.ts). The comparand is the
 * platform's `$now` anchor (objectstack#25808), written literally in the
 * `get_record` filter: a literal operand is not a CEL envelope, so the flow
 * executor hands it to the query unchanged, and the ObjectQL read path pins
 * `$now` to the run's instant (`resolveFilterTokens`) before the SQL driver
 * adds the column's days in the target column's own form. The datetime target
 * keeps its time of day, as on the tile: a review started at 09:00 six days
 * ago is over a five-day SLA from 09:00 today.
 *
 * ## A NULL offset does not remind
 *
 * The driver reads a NULL `addDays` column as ZERO days (18.3.0,
 * driver-sql `cross-field-conformance-cases.ts`, the #25808 table, row 4), so
 * without a guard a contract whose offset was never stored would be "over" an
 * SLA of nothing on the day its review started. The column is NULL on an
 * upgraded database until the contract is next written — the platform does
 * not backfill a stored expression (objectstack#29961) — and a reminder that
 * claims a breach of an SLA the row does not carry would be false. Hence
 * `review_sla_days_offset: { $ne: null }`, the filter grammar's has-a-value
 * predicate, in the query.
 *
 * ## Two bands, one notification a row a day
 *
 * "超一倍" — double the SLA — cannot be a query: `addDays` takes one column,
 * and doubling it would need a second stored column holding `-2 × SLA`, which
 * this repo does not add. It is a per-row CEL decision instead, over the two
 * fields the query already projected: `datetime(review_started_at) <
 * addDays(now(), offset + offset)` — the same instant arithmetic, from the
 * same fields, one SLA further back. (`offset + offset` rather than
 * `2 * offset`: CEL does not mix `int` and `double`, and a number column
 * arrives as `double`.) Every row the query selects takes exactly one of the
 * two partitioned edges, so a contract gets exactly one notification a day —
 * the near one (legal owner) or the doubled one (legal owner + head of legal),
 * never both. That is F3's only de-duplication, as before: it is a daily
 * nudge, repeated each day the review stays over.
 */
/** What both bands fill their bundle's holes with (src/email-templates/legal-review-sla.email-template.ts). */
const REVIEW_DATA = {
  title: ref('review.title'),
  contract_number: ref('review.contract_number'),
  review_started_at: ref('review.review_started_at'),
};

/**
 * Over DOUBLE the type's SLA. `has()` first, a step at a time: an edge that
 * cannot be evaluated aborts the step instead of being skipped. The query
 * guarantees both fields, so the guards only keep the edge evaluable.
 */
const OVER_DOUBLE_SLA =
  'has(vars.review) && vars.review != null' +
  ' && has(vars.review.review_started_at) && vars.review.review_started_at != null' +
  ' && has(vars.review.review_sla_days_offset) && vars.review.review_sla_days_offset != null' +
  ' && datetime(vars.review.review_started_at)' +
  ' < addDays(now(), vars.review.review_sla_days_offset + vars.review.review_sla_days_offset)';
/** Its exact complement — the decision is partitioned, never defaulted (see `rowBody`). */
const NOT_OVER_DOUBLE_SLA = `!(${OVER_DOUBLE_SLA})`;

const near = rowBody({
  id: 'near',
  recipients: { primary: ref('review.legal_owner') },
  notice: {
    topic: 'clm_legal_review_over_sla',
    severity: 'warning',
    sourceObject: 'clm_contract',
    sourceId: ref('review.id'),
    template: 'clm.legal_review_over_sla',
    templateData: REVIEW_DATA,
  },
});

const doubled = rowBody({
  id: 'doubled',
  recipients: { primary: ref('review.legal_owner'), also: ref('legalHeads.userIds') },
  notice: {
    topic: 'clm_legal_review_over_double_sla',
    severity: 'critical',
    sourceObject: 'clm_contract',
    sourceId: ref('review.id'),
    template: 'clm.legal_review_over_double_sla',
    templateData: REVIEW_DATA,
  },
});

/** `band → (near | doubled) → row done`: the two bands as one per-row region. */
const bandBody = (): { nodes: FlowNode[]; edges: FlowEdge[] } => ({
  nodes: [
    { id: 'band', type: 'decision', label: 'Over Double The SLA?' },
    ...near.nodes,
    ...doubled.nodes,
    { id: 'band_done', type: 'assignment', label: 'Row Done' },
  ],
  edges: [
    { id: 'band_e1', source: 'band', target: near.nodes[0]!.id, type: 'default', condition: NOT_OVER_DOUBLE_SLA, label: 'Over SLA' },
    { id: 'band_e2', source: 'band', target: doubled.nodes[0]!.id, type: 'default', condition: OVER_DOUBLE_SLA, label: 'Over double the SLA' },
    ...near.edges,
    ...doubled.edges,
    { id: 'band_e3', source: 'near_done', target: 'band_done', type: 'default' },
    { id: 'band_e4', source: 'doubled_done', target: 'band_done', type: 'default' },
  ],
});

export const LegalReviewSlaFlow: Flow = sweepFlow({
  name: 'legal_review_sla',
  label: 'Legal Review Over SLA',
  description: 'Daily: remind the legal owner of a contract that has been in review longer than its contract type\'s review SLA, and copy the head of legal once it passes double that SLA. A contract with no stored SLA is not reminded.',
  prelude: holdersPrelude('clm_legal_head', 'legalHeads'),
  stages: [
    {
      id: 'over_sla',
      label: 'In Review Over SLA',
      objectName: 'clm_contract',
      filter: {
        status: 'in_review',
        review_sla_days_offset: { $ne: null },
        review_started_at: { $lt: { $now: true, addDays: { $field: 'review_sla_days_offset' } } },
      },
      fields: ['id', 'title', 'contract_number', 'legal_owner', 'review_started_at', 'review_sla_days_offset'],
      item: 'review',
      body: bandBody(),
    },
  ],
});
