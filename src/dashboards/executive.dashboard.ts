import type { Dashboard } from '@objectstack/spec/ui';

/**
 * 管理层 — DESIGN.md §09's second dashboard.
 *
 * §09's brick list is deliberately NOT copied here, for the reason PR #74 gave
 * when it took the sibling copy off `legal.dashboard.ts`: a copy drifts, a
 * pointer cannot. This one had already drifted. It advertised one brick this
 * file has never built — 审批瓶颈（各台阶平均停留）— and §09 stopped asking for
 * that brick on 2026-09-09 (维护者裁定, PR #40 `1127e52`), replacing it with the
 * per-rung routing volume the four `route_*` tiles below deliver. §09 as merged
 * (PR #70, `30fd863`) is the source; every widget below carries its own comment
 * for its own shape.
 *
 * Every widget binds `contract_metrics`, so the two global filters below reach
 * a column that exists on every one of them. See `legal.dashboard.ts` for the
 * measured list of widget keys the renderer reads and for why no dashboard
 * `dateRange` is declared.
 */
/**
 * ## Why the `globalFilters` copy below is inline `{ en, 'zh-CN' }` (card 11)
 *
 * The same reason as `src/pages/contract_detail.page.ts`, on a different
 * surface: the translation bundle has NO KEY for it. `TranslationData`'s
 * `dashboards.<name>` group is `label` · `description` · `actions.<url>.label` ·
 * `widgets.<id>.{title,description,subCaption}` and nothing else, so a filter
 * label and its option labels cannot be addressed from a bundle at all — while
 * the filter bar is drawn at the top of every board, above the widget titles the
 * bundle does translate. Measured in a zh-CN console before this change: the
 * board read `Category: 全部` / `Requesting Department: 全部` over six Chinese
 * widget titles.
 *
 * Both keys are `I18nLabelSchema` (`GlobalFilterSchema.label`,
 * `.options[].label`), so the inline locale map is the authorized second form,
 * not a workaround.
 *
 * ⚠️ The gate cannot see these — `os i18n check` counts bundle keys and an
 * inline map produces none. A filter added later with a plain-string label
 * ships English on a zh-CN board with `pnpm lint:i18n-gate` still green.
 *
 * ⚠️ These option labels DUPLICATE `objects.<object>.fields.<field>.options.*`
 * in the bundle, which is not ideal and is not avoidable here: the filter
 * declares its own option list (the schema requires it for a `select` filter),
 * and the two are separate authored strings that happen to say the same thing.
 * If they drift, the bundle's copy is the one the grid and the record page use.
 */
export const ExecutiveDashboard: Dashboard = {
  name: 'executive_overview',
  label: 'Executive Overview',
  description: 'Contract value in force, expiries, risk concentration and approval load for management.',

  columns: 12,
  gap: 4,

  globalFilters: [
    {
      name: 'direction',
      field: 'direction',
      object: 'clm_contract',
      label: { en: 'Direction', 'zh-CN': '方向' },
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'sales', label: { en: 'Sales', 'zh-CN': '销售' } },
        { value: 'purchase', label: { en: 'Purchase', 'zh-CN': '采购' } },
        { value: 'other', label: { en: 'Other', 'zh-CN': '其他' } },
      ],
    },
    {
      name: 'risk_level',
      field: 'risk_level',
      object: 'clm_contract',
      label: { en: 'Risk Level', 'zh-CN': '风险等级' },
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'low', label: { en: 'Low', 'zh-CN': '低' } },
        { value: 'medium', label: { en: 'Medium', 'zh-CN': '中' } },
        { value: 'high', label: { en: 'High', 'zh-CN': '高' } },
      ],
    },
  ],

  widgets: [
    // ─── Row 1 ───────────────────────────────────────────────────────────
    {
      /**
       * §09's 生效合同额, rendered SPLIT BY CURRENCY rather than as one KPI
       * number, and the split is the honest form rather than a decoration.
       *
       * The fixture holds three currencies (USD 42 / EUR 41 / GBP 37 across 120
       * contracts) and this app carries no FX rate — DESIGN.md §01 leaves
       * commercial terms with HotCRM. A single "active contract value" tile
       * would therefore add dollars to euro to sterling and print the result as
       * though it meant something. Three bars each say what they are.
       *
       * This is the same rule that keeps `format: '0,0'` free of a baked `$`
       * (the HotCRM changelog lesson); a cross-currency SUM is the same mistake
       * one level up from the symbol.
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
      id: 'active_contract_value',
      title: 'Active Contract Value by Currency',
      description: 'Contracts in force. Each bar is its own currency — no FX conversion exists in this app.',
      type: 'bar',
      dataset: 'contract_metrics',
      dimensions: ['currency_code'],
      values: ['total_amount'],
      filter: { status: 'active' },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 0, y: 0, w: 6, h: 4 },
    },
    {
      id: 'expiring_90_days',
      title: 'Expiring Within 90 Days',
      description: 'Active contracts whose end date falls in the next 90 days',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      // `end_date` is a persisted `Field.date`; the bounds are date macros the
      // renderer resolves before the query leaves the browser. This widget
      // carries no `compareTo`, so the bounded window it states is simply a
      // filter.
      filter: { status: 'active', end_date: { $gte: '{today}', $lte: '{90_days_from_now}' } },
      colorVariant: 'warning',
      layout: { x: 6, y: 0, w: 3, h: 2 },
    },
    {
      id: 'high_risk_contracts',
      title: 'High-Risk Contracts',
      description: 'Assessed high by legal during review',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { risk_level: 'high' },
      colorVariant: 'danger',
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },
    // ─── The four rungs of DESIGN.md §04's ladder, read as ROUTING VOLUME ───
    //
    // These four tiles are the brick §09 puts at this position, and they build
    // it in full: one tile per rung, reading the four `route_*` flags F2 stamps
    // on the contract. §09 says of this position that it carries traffic and
    // not dwell — the board and the design agree here, and §09 (PR #70,
    // `30fd863`) is where that wording lives rather than a copy of it here.
    //
    // The average DWELL per rung that §09 listed BEFORE 2026-09-09 is not
    // deliverable, and §09 no longer asks for it: the maintainer ruling in
    // PR #40 (`1127e52`) placed it outside the V1.0 surface, and §09 now gives
    // these two measurements — both taken on this board — as the reasons it
    // declines:
    //
    //   1. There is no dwell to read. `sys_approval_request` holds 0 rows on a
    //      stock `pnpm demo` — the seed stamps `approval_status` directly and
    //      the ladder (F5) never ran — so no rung has a start or an end.
    //   2. Even with rows, a duration is not expressible in the semantic layer:
    //      see the measurement in `cycle-time.dataset.ts`.
    //
    // ⚠️ Neither reads as a TODO. Fact 1 is independent of the platform and
    // survives any upgrade; and the in-flight platform work
    // (`objectstack-ai/objectstack#16737`) makes the wrong path ERROR rather
    // than adding date arithmetic, so the dwell does not arrive when it closes
    // either. ⛔ Do not re-promise the metric on the strength of that issue, and
    // ⛔ do not stamp it from an application-side daily job — §09 forbids that
    // route in as many words, as replicating a platform rule in the app.
    //
    // What IS persisted is the routing: F2 stamps four booleans on the contract,
    // one per rung. These four tiles read them — how much traffic each rung
    // carries. Each tile is titled `Routes: <rung>`; no title or description on
    // this board — here or in either translation bundle — says "bottleneck" or
    // "dwell", because volume is neither.
    //
    // FOUR TILES, not one four-measure chart, and the shape was forced by a
    // measurement. The rungs are four COLUMNS, not four values of one column, so
    // a single widget would have to select four measures with no dimension —
    // and `DatasetWidget.tsx:423` reads `METRIC_TYPES.has(widgetType) ||
    // dimensions.length === 0`, so ANY zero-dimension widget renders as a KPI
    // card whatever its `type`. Authored as one `bar`, and then as one `table`,
    // this tile printed "11 · Routes: Head of Legal" and nothing else: three of
    // the four rungs silently absent from a card that looked finished. One tile
    // per rung is the shape that shows all four numbers.
    {
      id: 'route_legal_head',
      title: 'Routes: Head of Legal',
      description: 'Contracts whose matrix row reaches the head of legal',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['route_legal_head_count'],
      layout: { x: 0, y: 4, w: 3, h: 2 },
    },
    {
      id: 'route_finance',
      title: 'Routes: Finance Controller',
      description: 'Contracts whose matrix row reaches finance',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['route_finance_count'],
      layout: { x: 3, y: 4, w: 3, h: 2 },
    },
    {
      id: 'route_executive',
      title: 'Routes: Executive',
      description: 'Contracts whose matrix row reaches the executive sponsor',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['route_executive_count'],
      layout: { x: 6, y: 4, w: 3, h: 2 },
    },
    {
      id: 'route_gm',
      title: 'Routes: General Manager',
      description: 'Contracts whose matrix row reaches the general manager',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['route_gm_count'],
      layout: { x: 9, y: 4, w: 3, h: 2 },
    },

    // ─── Row 2 ───────────────────────────────────────────────────────────
    {
      /**
       * 按方向的合同额趋势, on the signature month — the point a contract's
       * value becomes real.
       *
       * `other` is excluded: NDAs and DPAs carry no `amount` by construction
       * (`clm_contract_type.amountBand` is null for both), so the series would
       * be a flat zero line claiming a trend that has no values in it. The
       * filter names the two directions that carry money, both persisted select
       * values.
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
      id: 'value_trend_by_direction',
      title: 'Contract Value Signed, by Direction',
      description: 'Signed value over the last 12 months. Sales and purchase only — NDA/DPA types carry no amount.',
      type: 'line',
      dataset: 'contract_metrics',
      dimensions: ['signed_month', 'direction'],
      values: ['total_amount'],
      filter: { direction: { $in: ['sales', 'purchase'] }, signed_at: { $gte: '{12_months_ago}' } },
      options: { sortBy: 'signed_month', sortOrder: 'asc' },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 0, y: 6, w: 12, h: 4 },
    },
  ],
};
