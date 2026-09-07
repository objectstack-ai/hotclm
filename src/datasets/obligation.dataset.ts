import { defineDataset } from '@objectstack/spec/ui';

/**
 * Obligations due and in arrears — DESIGN.md §09's third dataset ("到期 / 逾期，
 * 按 owner 与合同").
 *
 * `status: 'overdue'` has exactly one writer, the daily job of card 09
 * (`clm_obligation` object comment), so `overdue_count` reads a stamped fact
 * rather than a comparison this layer performs. That is the same division of
 * labour DESIGN.md §12 gap #7 prescribes: the job stamps, analytics counts.
 *
 * ## No §09 dashboard binds this dataset, and that is not an oversight
 *
 * §09 names four datasets and three dashboards, and its three dashboard rows —
 * 法务工作台, 管理层, 财务 — list no obligation tile. The dataset is delivered as
 * §09 specifies it, verified against a hand-written query over the same rows,
 * and left for the surface that asks for it (card 09's reminders, and the
 * reports of §05's 管理 row). It is NOT inert: `POST /analytics/dataset/query`
 * serves a registered dataset by name whether or not a widget selects it.
 */
export const ObligationDataset = defineDataset({
  name: 'obligation_metrics',
  label: 'Obligation Metrics',
  description: 'Post-signature commitments by status, kind, owner, contract and due month — including the arrears the daily job stamps.',
  object: 'clm_obligation',

  // `contract` is the master-detail parent; one hop to the contract, two to its
  // counterparty (ADR-0071 allows up to three).
  include: ['contract', 'contract.party'],

  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'kind', label: 'Kind', field: 'kind', type: 'string' },
    { name: 'owner', label: 'Owner', field: 'owner', type: 'lookup' },
    { name: 'contract_title', label: 'Contract', field: 'contract.title', type: 'string' },
    { name: 'contract_status', label: 'Contract Status', field: 'contract.status', type: 'string' },
    { name: 'counterparty', label: 'Counterparty', field: 'contract.party.name', type: 'string' },
    { name: 'due_month', label: 'Due Month', field: 'due_date', type: 'date', dateGranularity: 'month' },
  ],

  measures: [
    { name: 'obligation_count', label: 'Obligations', aggregate: 'count' },
    { name: 'overdue_count', label: 'Overdue', aggregate: 'count', filter: { status: 'overdue' } },
    { name: 'open_count', label: 'Open', aggregate: 'count', filter: { status: { $in: ['pending', 'in_progress'] } } },
    { name: 'done_count', label: 'Completed', aggregate: 'count', filter: { status: 'done' } },
  ],
});
