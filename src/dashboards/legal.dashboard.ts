import type { Dashboard } from '@objectstack/spec/ui';

/**
 * 法务工作台 — DESIGN.md §09's first dashboard: 待受理数 · 审查中 · 超 SLA ·
 * 谈判停滞 · 平均周转（本月 vs 上月）· 各阶段合同数漏斗.
 *
 * ## What a dataset widget actually reads (measured, not inherited)
 *
 * Read off `objectui@8f9d87a` `packages/plugin-dashboard/src/DatasetWidget.tsx`
 * rather than assumed: the renderer reads `type`, `dataset`, `dimensions`,
 * `values`, `filter`, `filterBindings`, `layout`, `compareTo`, `colorVariant`,
 * `chartConfig`, and — inside `options` — `dateGranularity`, `sortBy`,
 * `sortOrder`, `limit` and `stageOrder`. Nothing here declares a key outside
 * that set. (HotCRM's dashboards carry a comment saying `compareTo`,
 * `colorVariant`, `chartConfig` and `options` are never read; that was true of
 * the renderer it was measured against and is not true of this one — hence the
 * re-measurement rather than a copy.)
 *
 * ## No dashboard-level `dateRange`, deliberately
 *
 * `DashboardRenderer` merges the date-range filter into EVERY widget's query,
 * and `DatasetWidget` lowers each bounded `{ $gte, $lte }` window it finds into
 * a `timeDimensions` entry. `approval_throughput` below dates its own window on
 * `approved_at` so that `compareTo` has something to shift; a second dashboard
 * window on another field would make two dated dimensions, and the executor
 * refuses that with `compareTo.dimension is ambiguous` — a widget that renders
 * an error banner instead of a number. The filter bar is `globalFilters` on
 * persisted select columns instead, which is what §09 asks for
 * ("所有看板筛选字段都是持久化字段", gap #10).
 */
export const LegalDashboard: Dashboard = {
  name: 'legal_workbench',
  label: 'Legal Workbench',
  description: 'Intake queue, review load, negotiation stalls and pipeline shape for the legal team.',

  columns: 12,
  gap: 4,

  // Both are persisted `Field.select` columns on `clm_contract`, and every
  // widget on this dashboard is bound to `contract_metrics` (base object
  // `clm_contract`), so neither filter can reach a widget whose object lacks
  // the column.
  globalFilters: [
    {
      name: 'category',
      field: 'category',
      object: 'clm_contract',
      label: 'Category',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'nda', label: 'NDA' },
        { value: 'sales', label: 'Sales' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'service', label: 'Service' },
        { value: 'lease', label: 'Lease' },
        { value: 'employment', label: 'Employment / Contractor' },
        { value: 'framework', label: 'Framework' },
        { value: 'dpa', label: 'Data Processing (DPA)' },
        { value: 'amendment', label: 'Amendment' },
        { value: 'other', label: 'Other' },
      ],
    },
    {
      name: 'department',
      field: 'department',
      object: 'clm_contract',
      label: 'Requesting Department',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'sales', label: 'Sales' },
        { value: 'procurement', label: 'Procurement' },
        { value: 'legal', label: 'Legal' },
        { value: 'finance', label: 'Finance' },
        { value: 'operations', label: 'Operations' },
        { value: 'people', label: 'People / HR' },
        { value: 'it', label: 'IT' },
        { value: 'other', label: 'Other' },
      ],
    },
  ],

  widgets: [
    // ─── Row 1: the queue ────────────────────────────────────────────────
    {
      id: 'awaiting_intake',
      title: 'Awaiting Intake',
      description: 'Submitted and not yet accepted for review',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { status: 'submitted' },
      colorVariant: 'blue',
      layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
      id: 'in_review',
      title: 'In Review',
      description: 'Contracts a lawyer has accepted and not yet routed',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { status: 'in_review' },
      colorVariant: 'orange',
      layout: { x: 3, y: 0, w: 3, h: 2 },
    },
    {
      /**
       * §09's 超 SLA tile, with the one honest change its threshold had to
       * take. The SLA is PER TYPE (`clm_contract_type.review_sla_days`: 2, 3, 5
       * or 10 days across the nine seeded types), and a breach is a row-wise
       * comparison of `review_started_at` against another object's column.
       * Analytics cannot express that: there is no formula filter (§12 gap
       * #10), and a cross-object filter is refused outright on the strategy
       * every bucketed query lands on. The alternative — a persisted
       * `review_due_at` stamped by the daily job — is the §12 gap-#7 shape and
       * belongs to card 09, not here.
       *
       * So the threshold is FIXED, stated in the title, and above every seeded
       * SLA: a review older than 30 days is late under any of the nine. The
       * title says "Over 30 Days" and not "Over SLA" precisely so the tile
       * cannot be read as the per-type breach it is not.
       */
      id: 'review_ageing',
      title: 'In Review Over 30 Days',
      description: 'Older than every seeded type SLA (longest is 10 days) — a fixed threshold, not the per-type breach',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { status: 'in_review', review_started_at: { $lt: '{30_days_ago}' } },
      colorVariant: 'danger',
      layout: { x: 6, y: 0, w: 3, h: 2 },
    },
    {
      id: 'negotiation_stalled',
      title: 'Waiting on Counterparty',
      description: 'The ball is in their court — the queue F4 chases',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { current_turn: 'counterparty' },
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },

    // ─── Row 2: throughput, period over period ───────────────────────────
    {
      /**
       * §09 asks for 平均周转（本月 vs 上月） — an AVERAGE TURNAROUND compared
       * with the previous period. The comparison half is delivered exactly as
       * the card requires, with the platform primitive (`compareTo`, the one
       * shape `DatasetSelection.compareTo` implements) rather than a hardcoded
       * delta. The average-duration half is NOT delivered, and this tile
       * measures THROUGHPUT instead: how many contracts legal got to `approved`
       * in the window.
       *
       * Why: a duration cannot be computed in the semantic layer on this
       * platform version — `Field.datetime` persists ISO text, so `AVG()` over
       * a stage stamp answers the average YEAR (2025.9166…), and the dataset
       * layer has no expression in which to subtract two dates. The full
       * measurement is in `cycle-time.dataset.ts`. Substituting a number that
       * is honest and saying so beats rendering a plausible one that is not.
       *
       * The window is stated HERE, on the widget, and it is bounded on both
       * ends on purpose: `DatasetWidget` lowers only a `{ $gte, $lte }` pair
       * into the `timeDimensions` entry the executor shifts. An open-ended
       * `$gte` alone comes back "compareTo needs a dated window to shift".
       */
      id: 'approval_throughput',
      title: 'Approved This Month',
      description: 'Contracts reaching approved this month, against the previous period. Not an average duration — see the PR.',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { approved_at: { $gte: '{current_month_start}', $lte: '{current_month_end}' } },
      compareTo: { kind: 'previousPeriod' },
      colorVariant: 'success',
      layout: { x: 0, y: 2, w: 4, h: 4 },
    },
    {
      /**
       * 各阶段合同数漏斗. Scoped to the seven PIPELINE stages: `rejected`,
       * `expired`, `terminated` and `cancelled` are terminal outcomes, not
       * rungs a contract climbs, and a funnel that lists them reads as if a
       * contract were meant to reach them.
       *
       * `options.stageOrder` carries the STORED values in lifecycle order.
       * Without it the renderer falls back to the dimension's picklist order,
       * which is already correct on `clm_contract.status` — it is declared
       * anyway because the funnel's meaning depends on the order, and a field
       * re-ordered for a form should not silently re-order a funnel.
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
      id: 'stage_funnel',
      title: 'Pipeline by Stage',
      description: 'Contracts at each lifecycle stage, intake through activation',
      type: 'funnel',
      dataset: 'contract_metrics',
      dimensions: ['status'],
      values: ['contract_count'],
      filter: { status: { $in: ['draft', 'submitted', 'in_review', 'in_approval', 'approved', 'signing', 'active'] } },
      options: {
        stageOrder: ['draft', 'submitted', 'in_review', 'in_approval', 'approved', 'signing', 'active'],
      },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 4, y: 2, w: 8, h: 4 },
    },
  ],
};
