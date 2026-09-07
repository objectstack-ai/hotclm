import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_payment_plan` views — the 财务 group's 收付款计划 and 收付款看板.
 *
 * §05 asks for "计划 grid ×3 listView（本月到期 / 逾期 / 已付）". The three cuts
 * are expressed on `status`, not on a date range, and that is the honest
 * spelling rather than a convenience: a list-view filter takes literal values
 * (`ViewFilterRuleSchema`), and the only interpolated token the data path
 * resolves is `{current_user_id}` — there is no `{this_month}`. `status` is
 * where the answer already lives: F11 (card 09) moves a row `planned` → `due`
 * → `overdue` on the same dates a range filter would have compared against, so
 * these three views read the stamp instead of recomputing it. The one thing
 * that changes is what "本月到期" means at the boundary — a row due next week is
 * `due`, a row due in three months is `planned` — which is recorded here
 * rather than left for a reader to discover from an off-by-a-month count.
 */
export const PaymentPlanViews = defineView({
  list: {
    type: 'grid',
    name: 'all_payment_plans',
    label: 'Payment Schedule',
    data: { provider: 'object', object: 'clm_payment_plan' },
    columns: [
      { field: 'display_name', width: 180, link: true, pinned: 'left' },
      { field: 'contract', width: 200 },
      { field: 'seq', width: 80, align: 'right' },
      { field: 'planned_date', width: 130, sortable: true },
      { field: 'planned_amount', width: 150, align: 'right', summary: 'sum' },
      { field: 'status', width: 120, sortable: true },
      { field: 'actual_date', width: 130 },
      { field: 'actual_amount', width: 150, align: 'right', summary: 'sum' },
      { field: 'invoice_no', width: 150 },
    ],
    sort: [{ field: 'planned_date', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },

  listViews: {
    /** 本月到期 — the instalments the daily job has called due. */
    payments_due: {
      name: 'payments_due',
      type: 'grid',
      label: 'Due Now',
      description: 'Instalments that have come due and are not settled.',
      data: { provider: 'object', object: 'clm_payment_plan' },
      filter: [{ field: 'status', operator: 'in', value: ['due', 'partial'] }],
      columns: [
        { field: 'display_name', width: 180, link: true },
        { field: 'contract', width: 200 },
        { field: 'planned_date', width: 130, sortable: true },
        { field: 'planned_amount', width: 150, align: 'right', summary: 'sum' },
        { field: 'actual_amount', width: 150, align: 'right', summary: 'sum' },
        { field: 'condition', width: 200 },
      ],
      sort: [{ field: 'planned_date', order: 'asc' }],
      showRecordCount: true,
    },

    /** 逾期 — past the planned date and still unpaid (F11 stamps it). */
    payments_overdue: {
      name: 'payments_overdue',
      type: 'grid',
      label: 'Overdue',
      description: 'Instalments past their planned date and still unpaid.',
      data: { provider: 'object', object: 'clm_payment_plan' },
      filter: [{ field: 'status', operator: 'equals', value: 'overdue' }],
      columns: [
        { field: 'display_name', width: 180, link: true },
        { field: 'contract', width: 200 },
        { field: 'planned_date', width: 130, sortable: true },
        { field: 'planned_amount', width: 150, align: 'right', summary: 'sum' },
        { field: 'invoice_no', width: 150 },
        { field: 'notes', width: 260 },
      ],
      sort: [{ field: 'planned_date', order: 'asc' }],
      showRecordCount: true,
    },

    /** 已付 — settled, newest first: this is the reconciliation tab. */
    payments_paid: {
      name: 'payments_paid',
      type: 'grid',
      label: 'Paid',
      description: 'Settled instalments, most recently paid first.',
      data: { provider: 'object', object: 'clm_payment_plan' },
      filter: [{ field: 'status', operator: 'equals', value: 'paid' }],
      columns: [
        { field: 'display_name', width: 180, link: true },
        { field: 'contract', width: 200 },
        { field: 'planned_date', width: 130 },
        { field: 'planned_amount', width: 150, align: 'right', summary: 'sum' },
        { field: 'actual_date', width: 130, sortable: true },
        { field: 'actual_amount', width: 150, align: 'right', summary: 'sum' },
        { field: 'invoice_no', width: 150 },
      ],
      sort: [{ field: 'actual_date', order: 'desc' }],
      showRecordCount: true,
    },

    /** 收付款看板 — the same book as columns, so a controller sees the shape of the month. */
    payment_kanban: {
      name: 'payment_kanban',
      type: 'kanban',
      label: 'Payment Board',
      description: 'Every instalment by settlement status.',
      data: { provider: 'object', object: 'clm_payment_plan' },
      columns: ['display_name', 'contract', 'planned_date', 'planned_amount'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'planned_amount',
        columns: ['display_name', 'contract', 'planned_date', 'planned_amount'],
      },
      sort: [{ field: 'planned_date', order: 'asc' }],
    },
  },
});
