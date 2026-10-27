import type { Dashboard } from '@objectstack/spec/ui';

/**
 * 法务工作台 — DESIGN.md §09's first dashboard.
 *
 * §09's brick list is deliberately NOT copied here. The copy that used to sit
 * on these lines drifted three times in two days — two of its six items were
 * rewritten by PR #40 (`1127e52`, 2026-09-09) and the third by PR #70
 * (`30fd863`, 2026-09-10) — and by the end all three described bricks this file
 * does not implement. §09 is the source and a pointer to it cannot drift; the
 * widgets below each carry their own comment for their own shape.
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
 * a `timeDimensions` entry. `approval_turnaround` below dates its own window on
 * `approved_at` so that `compareTo` has something to shift; a second dashboard
 * window on another field would make two dated dimensions, and the executor
 * refuses that with `compareTo.dimension is ambiguous` — a widget that renders
 * an error banner instead of a number. The filter bar is `globalFilters` on
 * persisted select columns instead, which is what §09 asks for
 * ("所有看板筛选字段都是持久化字段", gap #10).
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
 * ⚠️ Superseded from 17.5, measured on 17.7.0 (#82): the group above now also
 * has `globalFilters.<filter>.{label,options.<value>}` (spec 4bbf766, #16772),
 * and 17.7.0 retired `widgets.<id>.subCaption`. The inline copy below still
 * renders; it is now a workaround that release made obsolete, and moving it
 * into the bundle is a card of its own.
 *
 * Both keys are `I18nLabelSchema` (`GlobalFilterSchema.label`,
 * `.options[].label`), so the inline locale map is the authorized second form,
 * not a workaround.
 *
 * ⚠️ The gate cannot see these — `os i18n check` counts bundle keys and an
 * inline map produces none. A filter added later with a plain-string label
 * ships English on a zh-CN board with `pnpm lint:i18n-gate` still green.
 *
 * ⚠️ The `category` filter's option labels DUPLICATE
 * `objects.<object>.fields.<field>.options.*` in the bundle, which is not
 * ideal and is not avoidable here: the filter declares its own option list
 * (the schema requires it for a `select` filter), and the two are separate
 * authored strings that happen to say the same thing. If they drift, the
 * bundle's copy is the one the grid and the record page use. The `department`
 * filter has no such copy since #109: its options are business-unit rows, and
 * a row's name is data, shown as written.
 */
export const LegalDashboard: Dashboard = {
  name: 'legal_workbench',
  label: 'Legal Workbench',
  description: 'Intake queue, review load, negotiation stalls, pipeline shape and stage durations for the legal team.',

  columns: 12,
  gap: 4,

  // Both are persisted columns on `clm_contract` (`category` a select,
  // `department` a lookup), and every widget on this dashboard is bound to
  // `contract_metrics` or `contract_cycle_time` — both on base object
  // `clm_contract` — so neither filter can reach a widget whose object lacks
  // the column. Both apply a literal value, which a duration measure accepts
  // (it refuses only a field-to-field comparison).
  globalFilters: [
    {
      name: 'category',
      field: 'category',
      object: 'clm_contract',
      label: { en: 'Category', 'zh-CN': '类别' },
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'nda', label: { en: 'NDA', 'zh-CN': '保密协议' } },
        { value: 'sales', label: { en: 'Sales', 'zh-CN': '销售' } },
        { value: 'purchase', label: { en: 'Purchase', 'zh-CN': '采购' } },
        { value: 'service', label: { en: 'Service', 'zh-CN': '服务' } },
        { value: 'lease', label: { en: 'Lease', 'zh-CN': '租赁' } },
        { value: 'employment', label: { en: 'Employment / Contractor', 'zh-CN': '劳动 / 承揽' } },
        { value: 'framework', label: { en: 'Framework', 'zh-CN': '框架协议' } },
        { value: 'dpa', label: { en: 'Data Processing (DPA)', 'zh-CN': '数据处理协议' } },
        { value: 'amendment', label: { en: 'Amendment', 'zh-CN': '补充协议' } },
        { value: 'other', label: { en: 'Other', 'zh-CN': '其他' } },
      ],
    },
    // `department` is a lookup to `sys_business_unit` since #109, so the
    // filter's options are the department-kind units themselves, read at run
    // time, and the value it applies is the unit's id, which is what the
    // column holds. Retired departments stay in the list on purpose: their
    // contracts are still on the board.
    {
      name: 'department',
      field: 'department',
      object: 'clm_contract',
      label: { en: 'Requesting Department', 'zh-CN': '发起部门' },
      type: 'lookup',
      scope: 'dashboard',
      optionsFrom: {
        object: 'sys_business_unit',
        valueField: 'id',
        labelField: 'name',
        filter: { kind: 'department' },
      },
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
       * The review-ageing tile, at a FIXED 30-day threshold written into its
       * own title — which is the brick §09 prescribes here, not a degraded
       * stand-in for one. §09 places the per-type「超 SLA」 outside the V1.0
       * delivery surface (维护者裁定 2026-09-09, PR #40 `1127e52`; §09 as
       * merged, PR #70 `30fd863`) and asks in its place for exactly this: a
       * fixed threshold, self-declared in the brick's title.
       *
       * The SLA is PER TYPE (`clm_contract_type.review_sla_days`: 2, 3, 5 or
       * 10 days across the nine seeded types), and a breach is a row-wise
       * comparison of `review_started_at` against "now minus that type's SLA".
       * 18.2.0 added the now-anchored comparand
       * (`{ $now: true, addDays: { $field } }`, objectstack#25808), but its
       * offset reads a numeric column of the SAME record only. Measured on
       * 18.2.0 as the head of legal, `addDays: { $field:
       * 'contract_type.review_sla_days' }` answers `400 INVALID_FILTER` — as a
       * runtime filter "the addDays offset … is a dotted path, and SQL
       * push-down compiles same-table column references only", and as a
       * measure filter the same code with the reason withheld — while
       * `os validate` passes it. The same anchor with a literal `-30` answers
       * 200. So the per-type breach is still not expressible, and this tile
       * stays.
       *
       * ⛔ The remaining route — a persisted `review_due_at` stamped by a daily
       * job, the §12 gap-#7 shape — is closed for this metric, and not merely
       * unbuilt: §09 forbids filling the per-type breach from an
       * application-side job because that replicates a platform rule inside the
       * application, and decision #31 ruled the same way on the notification
       * side (1C + 2B, 2026-09-09 — see `legal-review-sla.flow.ts`, whose F3
       * reminder fires on this same fixed 30 days so the tile and the reminder
       * cannot tell two stories).
       *
       * So the threshold is FIXED, stated in the title, and above every seeded
       * SLA: a review older than 30 days is late under any of the nine. The
       * title says "Over 30 Days" and not "Over SLA" precisely so the tile
       * cannot be read as the per-type breach it is not.
       */
      id: 'review_ageing',
      title: 'In Review Over 30 Days',
      description: 'A fixed 30-day threshold, not each contract type\'s own review SLA.',
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
      description: 'The ball is in their court — the queue to chase',
      type: 'metric',
      dataset: 'contract_metrics',
      values: ['contract_count'],
      filter: { current_turn: 'counterparty' },
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },

    // ─── Row 2: turnaround, period over period ───────────────────────────
    {
      /**
       * §09's 平均周转 brick: the average number of days from submission to
       * approval for the contracts approved in the window, against the
       * previous period. The comparison is the platform's `compareTo`, not a
       * hardcoded delta.
       *
       * The measure is `avg_days_to_approval` on `contract_cycle_time`, a
       * `duration` measure (platform 18.2.0, objectstack#25778): the average of
       * `approved_at - submitted_at` per contract, in days. It replaces the
       * 审批吞吐 count this slot carried while a duration could not be written
       * (decision #31, 1C: the stand-in held until the platform shipped the
       * measure). Submission → approval is the part of the cycle legal owns;
       * signing and activation are the next four tiles' business.
       *
       * Contracts approved in the window with no `submitted_at` (the demo's
       * backfilled in-force book) do not enter the average — a duration needs
       * both stamps. The tile is an average of the contracts that have them.
       *
       * The window is stated HERE, on the widget, and it is bounded on both
       * ends on purpose: `DatasetWidget` lowers only a `{ $gte, $lte }` pair
       * into the `timeDimensions` entry the executor shifts. An open-ended
       * `$gte` alone comes back "compareTo needs a dated window to shift". A
       * bounded window is not a `granularity` bucket, so the duration measure
       * is served by the native-SQL strategy (a bucketed one would be refused).
       *
       * `previousPeriod` is the EQUAL-LENGTH window immediately before, as the
       * platform documents it — not the previous calendar month. Measured on
       * 2026-10-27: the October window [10-01, 10-31] was compared with
       * [08-31, 09-30], so August 31st's approval was in the comparison. The
       * description says "the equal-length period", not "last month", for
       * that reason.
       */
      id: 'approval_turnaround',
      title: 'Avg Days to Approval (This Month)',
      description: 'Average days from submission to approval, for contracts approved this month, compared with the equal-length period just before it.',
      type: 'metric',
      dataset: 'contract_cycle_time',
      values: ['avg_days_to_approval'],
      filter: { approved_at: { $gte: '{current_month_start}', $lte: '{current_month_end}' } },
      compareTo: { kind: 'previousPeriod' },
      // No `colorVariant`: for a duration, a bigger number is the WORSE one,
      // so the success green the throughput count carried would praise a
      // slowdown. ⚠️ The delta beside it is still drawn green when it rises:
      // the renderer colours "up" emerald for every measure and the platform
      // has no key to say lower-is-better (measured: "↑ 23%" in green for a
      // turnaround that got 23% longer).
      layout: { x: 0, y: 2, w: 4, h: 4 },
    },
    {
      /**
       * 各阶段合同数, drawn as a RANKED BAR over the SIX IN-FLIGHT stages —
       * the ones legal still has work to do on.
       *
       * ## The admission rule, restated (issue #59)
       *
       * This widget used to admit seven statuses and justify excluding
       * `rejected`, `expired`, `terminated` and `cancelled` as "terminal
       * outcomes, not rungs a contract climbs". #59 was right that `active`
       * did not belong, and wrong about why: a contract IS meant to reach
       * `active`, which is precisely what separates it from the four excluded
       * outcomes, so "terminal" is not the criterion doing the work. Nor is it
       * terminality in the state machine — `contract.hook.ts` gives `rejected`
       * an edge back to `draft` and `active` two edges out, and both are
       * excluded here all the same.
       *
       * The criterion that does discriminate, and the one this filter now
       * states: WHETHER LEGAL HAS WORK TO DO ON THE STAGE. This is a work-queue
       * board — its first five widgets are `awaiting_intake`, `in_review`,
       * `review_ageing`, `negotiation_stalled` and `approval_turnaround`, each
       * one a queue or a turnaround. `draft` … `signing` are contracts legal is
       * moving; `active`, `expired`, `terminated`, `cancelled` and `rejected`
       * are contracts legal has finished moving. Legal's work on an in-force
       * book is renewal and expiry, and that is a DATED slice of it (the 到期日历
       * view in this app's Legal Desk, `expiring_90_days` on 管理层), never its
       * size.
       *
       * ## What admitting `active` cost, measured
       *
       * Bar length is proportional to the measure and the axis maximum is set
       * by the largest bar, so one stage of 60 was setting the scale for six
       * stages of 4 to 12. Measured in Chromium at 1440px, en and zh-CN
       * identically, before #59's change: `active` 615px — the WHOLE 615px plot
       * area, x 771→1386 — against In Review 123 · Draft 102.5 · In Approval
       * 82 · Submitted 61.5 · Signing 61.5 · Approved 41. The six stages legal
       * works were confined to at most a fifth of the axis, where a 3×
       * difference (4 against 12) reads as a barely-visible one.
       *
       * Counted out of the running database rather than inherited (`POST
       * /api/v1/analytics/dataset/query` on `contract_metrics`, dimension
       * `status`, no filter): draft 10 · submitted 6 · in_review 12 ·
       * in_approval 8 · approved 4 · signing 6 · active 60 · expired 8 ·
       * terminated 4 · cancelled 2, and `rejected` absent at 0 — 120 contracts,
       * DESIGN.md §10's spread exactly. This widget now plots 46 of them;
       * `active` was 60 of the 106 it used to admit.
       *
       * ⛔ The answer is not to reshape the book. A book that is 60/120 in force
       * is correct (§10, pinned by `assertSpread` in `src/data/plan-contracts.ts`);
       * the chart serves the data, not the other way round.
       *
       * ## Why no contracts-in-force METRIC replaces it (#59 recommendation 2)
       *
       * #59 offered to add the in-force count back as a `metric` tile, the
       * shape the other five use, and asked for a reading of the legal
       * audience rather than an argument from symmetry. The reading: legal
       * never acts on the SIZE of the in-force book. Every job §06 gives them
       * over a live contract — renewal, obligations, amendment, termination
       * formalities, archive — is a dated or event-driven slice of it, and each
       * of those already has its own destination. A tile reading "60" would not
       * change on any day legal works, would name no queue, and would put back
       * on this board the one thing this card is removing 615px of: a number
       * with nothing to do about it.
       *
       * It is also not missing from what legal can SEE. §09 assigns the
       * in-force sense to 管理层 and it is there — `active_contract_value` by
       * currency, plus `expiring_90_days` — and all three boards sit in one nav
       * group gated on `clm_requester.access`, the single capability every CLM
       * audience holds (measured in `src/apps/clm.app.ts`). It is one click
       * away, in the richer form (value, not count), on the board that owns it.
       *
       * ## Why not a funnel (issue #48) — the mark was making a false claim
       *
       * A funnel encodes MONOTONIC DECLINE: each stage narrower than the one
       * before, because contracts drop out between them. This book does not
       * decline. DESIGN.md §10's spread, pinned by `assertSpread` in
       * `src/data/plan-contracts.ts` and re-counted out of the running
       * database for the card: draft 10 · submitted 6 · in_review 12 ·
       * in_approval 8 · approved 4 · signing 6 · active 60. Rendered as a
       * funnel that is a BOWTIE — narrow, wide, narrow, then eleven times
       * wider at the end. Measured in Chromium on the widget before #48's
       * change, band widths in px: 115 · 138 · 138 · 92 · 69 · 692 · 692.
       *
       * The cost is not that it looked broken. It is that the mark ASSERTED
       * something the numbers do not say — that contracts fall out at each
       * stage. They do not: this is a snapshot of where a live book currently
       * sits, and `active` holds sixty contracts because sixty contracts are
       * in force. A real conversion funnel is a DIFFERENT widget over a
       * DIFFERENT measure (contracts entering vs leaving each stage over a
       * window); the stage DURATIONS are the row of tiles below, not a
       * funnel.
       *
       * A bar over the stage dimension says exactly what the data says and
       * cannot bowtie at ANY distribution — which is the requirement, not a
       * preference: the corpus is dealt by a fixture and re-dealt by other
       * cards, so a mark that merely happens to suit today's counts would
       * break again quietly.
       *
       * ## Why the order is the MEASURE and not the lifecycle
       *
       * `options.stageOrder` (which this widget used to carry) is lowered by
       * the dashboard renderer onto EVERY chart type as `categoryOrder`, and
       * only the funnel branch reads it. Measured twice on
       * `@objectstack/console` 17.4.0 — in its code, where `categoryOrder` is
       * consumed inside the `chartType === 'funnel'` branch and nowhere else,
       * and in the browser, where this widget as a bar with `stageOrder` still
       * authored came out Active · Approved · Draft · In Approval · In Review ·
       * Signing · Submitted, i.e. alphabetically. Lifecycle order is therefore
       * NOT authorable for a bar on this platform version, and keeping
       * `stageOrder` here would be metadata that does nothing. Reported
       * upstream rather than patched (AGENTS.md 平台缺口).
       *
       * What IS authorable is an order that cannot depend on a LABEL, and that
       * is the robustness this card was really after. Measured in a zh-CN
       * console BEFORE this change: the category labels fell back to English
       * and the funnel lost stage order entirely — Active · Approved · Draft ·
       * In Approval · In Review · Signing · Submitted — with `stageOrder`
       * authored and silently ignored, because the rows carry the API's
       * English labels while the client's order map carries the bundle's
       * Chinese ones and nothing matches. `sortBy` on the MEASURE cannot be
       * reordered by any label in any locale: it lowers to
       * `order: { contract_count: 'desc' }` on the dataset query (measured in
       * the request body), so the biggest queue is first, in both locales and
       * at every distribution.
       *
       * The widget id stays `stage_funnel`: it is the key both translation
       * bundles address this widget by, it is not user-visible, and `type`
       * one line below is what states the mark.
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
      description: 'The six stages a contract is still moving through — a snapshot of what legal has in hand, largest queue first, not a conversion sequence. Contracts already in force are not plotted.',
      type: 'horizontal-bar',
      dataset: 'contract_metrics',
      dimensions: ['status'],
      values: ['contract_count'],
      filter: { status: { $in: ['draft', 'submitted', 'in_review', 'in_approval', 'approved', 'signing'] } },
      options: {
        sortBy: 'contract_count',
        sortOrder: 'desc',
      },
      suppressWarnings: ['chart-config-missing'],
      layout: { x: 4, y: 2, w: 8, h: 4 },
    },

    // ─── Row 3: 各段时长 — average days per stage ────────────────────────
    //
    // DESIGN.md §09's chain submitted → review started → approved → signed →
    // active, one tile per stage, each a `duration` measure on
    // `contract_cycle_time` (average days between the two stamps, over every
    // contract that has both). FOUR TILES, not one four-measure chart, for the
    // reason measured on the executive board's routing row: a zero-dimension
    // dataset widget renders as a KPI card showing its FIRST measure only, so
    // one chart over four measures would silently show one stage.
    //
    // Not windowed: these read the whole book the viewer can see, and the
    // dashboard's two filters narrow them like every other tile. Each title
    // says "days" because the result field carries no unit.
    {
      id: 'days_to_review',
      title: 'Submitted → Review Started (Avg Days)',
      description: 'Average days from submission to a lawyer accepting the contract for review.',
      type: 'metric',
      dataset: 'contract_cycle_time',
      values: ['avg_days_to_review'],
      layout: { x: 0, y: 6, w: 3, h: 2 },
    },
    {
      id: 'days_in_review',
      title: 'Review Started → Approved (Avg Days)',
      description: 'Average days from the start of legal review to approval.',
      type: 'metric',
      dataset: 'contract_cycle_time',
      values: ['avg_days_in_review'],
      layout: { x: 3, y: 6, w: 3, h: 2 },
    },
    {
      id: 'days_to_signature',
      title: 'Approved → Signed (Avg Days)',
      description: 'Average days from approval to the contract being signed.',
      type: 'metric',
      dataset: 'contract_cycle_time',
      values: ['avg_days_to_signature'],
      layout: { x: 6, y: 6, w: 3, h: 2 },
    },
    {
      id: 'days_to_activation',
      title: 'Signed → Active (Avg Days)',
      description: 'Average days from signature to the contract coming into force.',
      type: 'metric',
      dataset: 'contract_cycle_time',
      values: ['avg_days_to_activation'],
      layout: { x: 9, y: 6, w: 3, h: 2 },
    },
  ],
};
