import { defineDataset } from '@objectstack/spec/ui';

/**
 * The payment schedule, planned against actual — DESIGN.md §09's fourth dataset
 * ("计划与实际，按月；逾期金额").
 *
 * ## Receivable vs payable is the CONTRACT's direction, not the instalment's
 *
 * `clm_payment_plan` carries no `direction` column — the instalment belongs to
 * a contract and inherits its side of the deal. So 应收 / 应付 is the
 * cross-object dimension `contract.direction`, one hop through the
 * master-detail parent.
 *
 * That distinction is load-bearing rather than cosmetic. Measured on 17.3.0:
 * a cross-object DIMENSION compiles to a LEFT JOIN and is served on both
 * strategies; a cross-object FILTER is refused outright on the ObjectQL path
 * ("cannot evaluate a cross-object filter — the engine cannot join in an
 * aggregate"), which is the path every date-bucketed query lands on. Every
 * widget below therefore GROUPS by direction and never filters on it.
 *
 * ## Amounts carry no currency symbol
 *
 * `planned_amount` is denominated in the parent contract's currency
 * (`clm_payment_plan.planned_amount` description), and the fixture holds three.
 * `format: '0,0'`, no `currency` — see `contract.dataset.ts` for the full
 * reasoning and the measurement behind it.
 */
export const PaymentDataset = defineDataset({
  name: 'payment_metrics',
  label: 'Payment Metrics',
  description:
    'Instalments planned against actual, by month, counterparty and contract direction — plus the arrears the daily job stamps. Amounts are each contract\'s own currency and are not FX-converted.',
  object: 'clm_payment_plan',
  include: ['contract', 'contract.party'],

  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'direction', label: 'Direction', field: 'contract.direction', type: 'string' },
    { name: 'counterparty', label: 'Counterparty', field: 'contract.party.name', type: 'string' },
    { name: 'currency_code', label: 'Currency', field: 'contract.currency_code', type: 'string' },
    { name: 'contract_title', label: 'Contract', field: 'contract.title', type: 'string' },
    { name: 'planned_month', label: 'Planned Month', field: 'planned_date', type: 'date', dateGranularity: 'month' },
    { name: 'actual_month', label: 'Settled Month', field: 'actual_date', type: 'date', dateGranularity: 'month' },
  ],

  measures: [
    { name: 'instalment_count', label: 'Instalments', aggregate: 'count' },
    { name: 'planned_total', label: 'Planned', aggregate: 'sum', field: 'planned_amount', format: '0,0' },
    { name: 'actual_total', label: 'Settled', aggregate: 'sum', field: 'actual_amount', format: '0,0' },
    { name: 'overdue_amount', label: 'Overdue', aggregate: 'sum', field: 'planned_amount', filter: { status: 'overdue' }, format: '0,0' },

    // The scheduled value of every instalment not yet settled in full. It is
    // the PLANNED amount of those instalments, not planned-minus-actual: a
    // `derived: { op: 'difference' }` over two measure-scoped sums evaluates to
    // null for any group one of its inputs selects no row in (a filtered
    // measure contributes no row rather than a zero), which would blank exactly
    // the counterparties that owe everything and have paid nothing. The label
    // says which of the two this is.
    {
      name: 'open_amount',
      label: 'Unsettled Value',
      aggregate: 'sum',
      field: 'planned_amount',
      filter: { status: { $in: ['due', 'overdue', 'partial'] } },
      format: '0,0',
    },
    { name: 'open_instalments', label: 'Unsettled Instalments', aggregate: 'count', filter: { status: { $in: ['due', 'overdue', 'partial'] } } },
  ],
});
