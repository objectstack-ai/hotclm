import type { Dashboard } from '@objectstack/spec/ui';

/**
 * 财务 — DESIGN.md §09's third dashboard: 本月应收 / 应付 · 逾期金额 ·
 * 按相对方的未付 top 10.
 *
 * Every widget binds `payment_metrics`, whose base object is
 * `clm_payment_plan`. The one global filter is that object's own persisted
 * `status` column, so it reaches every widget here without a `filterBindings`
 * opt-out. See `legal.dashboard.ts` for the measured list of keys the renderer
 * reads and for why no dashboard `dateRange` is declared.
 */
export const FinanceDashboard: Dashboard = {
  name: 'finance_overview',
  label: 'Finance Overview',
  description: 'Instalments falling due, arrears, and who owes what.',

  columns: 12,
  gap: 4,

  globalFilters: [
    {
      name: 'status',
      field: 'status',
      object: 'clm_payment_plan',
      label: 'Instalment Status',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'planned', label: 'Planned' },
        { value: 'due', label: 'Due' },
        { value: 'partial', label: 'Partial' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' },
      ],
    },
  ],

  widgets: [
    {
      /**
       * §09's 本月应收 / 应付 as one widget, because receivable and payable are
       * one question asked of two directions.
       *
       * `direction` is `contract.direction` — a cross-object DIMENSION, which
       * compiles to a LEFT JOIN and is served on both analytics strategies. It
       * is deliberately not a filter: a cross-object FILTER is refused on the
       * ObjectQL strategy, which is the one every date-bucketed query lands on
       * (measured; see `payment.dataset.ts`).
       */
      // `chart-config-missing` suppressed — MEASURED, not waved away. The rule's
      // message asserts "the renderer cannot determine which measure to plot,
      // so the series renders empty"; on a dataset-bound widget that is not
      // what happens. objectui's `buildChartSeries(rows, dimensions, values,
      // fields)` DERIVES the bindings from the selection, and `chartConfig` is
      // merged onto that derivation as PRESENTATION only
      // (`mergeAuthoredPresentation`). Observed in Chromium against this branch:
      // this widget draws its marks with no `chartConfig` at all. The rule's own
      // hint prescribes this suppression for exactly that case.
      id: 'due_this_month',
      title: 'Falling Due This Month',
      description: 'Instalments scheduled this month — sales is receivable, purchase is payable. Each contract\'s own currency.',
      type: 'bar',
      dataset: 'payment_metrics',
      dimensions: ['direction'],
      // `planned_total` ALONE. Authored with `instalment_count` beside it, the
      // count series rendered as a zero-height bar: two measures share one
      // y-axis, and a count of 10 against an axis that has to reach 1.8M is
      // invisible. A series that draws nothing is the empty-tile failure at
      // series scale, so the count moved to its own tile rather than riding an
      // axis three orders of magnitude away from it.
      values: ['planned_total'],
      filter: { planned_date: { $gte: '{current_month_start}', $lte: '{current_month_end}' } },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 0, y: 0, w: 6, h: 4 },
    },
    {
      id: 'overdue_amount',
      title: 'Overdue Amount',
      description: 'Scheduled value of instalments the daily job has stamped overdue',
      type: 'metric',
      dataset: 'payment_metrics',
      values: ['overdue_amount'],
      colorVariant: 'danger',
      layout: { x: 6, y: 0, w: 3, h: 2 },
    },
    {
      id: 'overdue_count',
      title: 'Overdue Instalments',
      description: 'How many instalments are in arrears',
      type: 'metric',
      dataset: 'payment_metrics',
      values: ['instalment_count'],
      filter: { status: 'overdue' },
      colorVariant: 'warning',
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },
    {
      /**
       * 按相对方的未付 top 10. "Top 10" is `options.sortBy` + `options.limit`,
       * which the renderer lowers into `DatasetSelection.order` + `limit` —
       * the executor applies the limit AFTER the ordering, so the window really
       * is the ten largest and not an arbitrary ten.
       *
       * A `table` rather than a bar on purpose: a dataset-bound table's rows
       * drill through the semantic layer, so a controller can click a
       * counterparty and land on its instalments. `open_instalments` rides
       * beside `open_amount` so a large total that is one instalment reads
       * differently from a large total that is five.
       */
      id: 'unpaid_by_counterparty',
      title: 'Unsettled by Counterparty — Top 10',
      description: 'Scheduled value of instalments that are due, part-paid or overdue. Each contract\'s own currency.',
      type: 'table',
      dataset: 'payment_metrics',
      dimensions: ['counterparty'],
      values: ['open_amount', 'open_instalments'],
      options: { sortBy: 'open_amount', sortOrder: 'desc', limit: 10 },
      layout: { x: 6, y: 2, w: 6, h: 6 },
    },
    {
      /**
       * §09's "计划与实际，按月" read as a trend. Planned against settled on one
       * axis is the finance question the schedule exists to answer: the gap
       * between the two lines is what has not arrived.
       */
      // `chart-config-missing` suppressed — MEASURED, not waved away. The rule's
      // message asserts "the renderer cannot determine which measure to plot,
      // so the series renders empty"; on a dataset-bound widget that is not
      // what happens. objectui's `buildChartSeries(rows, dimensions, values,
      // fields)` DERIVES the bindings from the selection, and `chartConfig` is
      // merged onto that derivation as PRESENTATION only
      // (`mergeAuthoredPresentation`). Observed in Chromium against this branch:
      // this widget draws its marks with no `chartConfig` at all. The rule's own
      // hint prescribes this suppression for exactly that case.
      id: 'planned_vs_settled',
      title: 'Planned vs Settled by Month',
      description: 'Scheduled instalment value against what actually arrived, by planned month',
      type: 'line',
      dataset: 'payment_metrics',
      dimensions: ['planned_month'],
      values: ['planned_total', 'actual_total'],
      // Windowed to the trailing twelve months. Unwindowed the schedule runs to
      // 2028, and every month past today carries planned value against a
      // settled line pinned at zero — a two-year flat run that reads as a
      // collapse in collections rather than as "not due yet". A comparison of
      // planned against actual is only meaningful where both could exist.
      filter: { planned_date: { $gte: '{12_months_ago}', $lte: '{current_month_end}' } },
      options: { sortBy: 'planned_month', sortOrder: 'asc' },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 0, y: 4, w: 6, h: 4 },
    },
  ],
};
