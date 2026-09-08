import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_contract` views — the primary list plus one named view per DESIGN.md
 * §05 navigation entry that lands on this object.
 *
 * ## Why the audience views live here and not in five files
 *
 * §05 gives five audiences their own entry points, but four of them are the
 * SAME object under a different filter. The console's view switcher builds its
 * tab strip from this object's `list` plus every `listViews` entry, so each
 * one is reachable from any contract list page; the app's navigation names the
 * one each audience starts on (`viewName`). Splitting them per audience would
 * mean five files that all declare `object: 'clm_contract'` and no additional
 * reachability.
 *
 * ## Filter shape
 *
 * Every `filter` here is the rule-object form `ViewFilterRuleSchema` declares —
 * `{ field, operator, value }`, `operator` drawn from `VIEW_FILTER_OPERATORS`.
 * The AST array form (`[['status', '=', 'active']]`) parses nowhere on this
 * surface. `{current_user_id}` is the one interpolated token the list-view data
 * path resolves; it is what makes "mine" mean the signed-in person rather than
 * a literal string that matches no row.
 */
/**
 * ## Why every `description` here carries an inline `{ en, 'zh-CN' }` map (card 11)
 *
 * A view's `description` has a bundle key — `objects.<object>._views.<view>.description`
 * — the bundle authors it, and `pnpm lint:i18n-gate` counts it as covered. The
 * console does not render it. Measured on 17.3.0 against a zh-CN console, both
 * legs in the same session:
 *
 *   - bundle only:  the tab strip reads 我发起的 (the LABEL resolves from the
 *     same group, one key over) while the line under the header reads
 *     "Contracts I launched, grouped by where each one has got to.";
 *   - inline map:   the same line reads 我发起的合同，按各自进行到哪一步分组。
 *
 * So this is a declared, enumerated, authored key that no resolver applies —
 * and it is invisible to the gate BY BEING COVERED, which is the sharpest form
 * of the trap card 11 was written around: the coverage report says 100% and the
 * screen is still half English.
 *
 * The bundle entries are kept as well as these maps, deliberately. They are
 * what the gate counts, and if the resolver is fixed the bundle wins — the
 * duplication resolves itself rather than having to be unpicked. Reported
 * upstream; not patched here (AGENTS.md "Platform gaps").
 */
export const ContractViews = defineView({
  /**
   * The whole book, in the order a lawyer scans it: the ones that moved most
   * recently first. This is 法务工作台's 全部合同 entry AND the default any
   * `clm_contract` list page opens on, so it is deliberately unfiltered — the
   * narrower audience views are one tab away.
   */
  list: {
    type: 'grid',
    name: 'all_contracts',
    label: 'All Contracts',
    data: { provider: 'object', object: 'clm_contract' },
    columns: [
      { field: 'contract_number', width: 150, link: true, pinned: 'left' },
      { field: 'title', width: 240 },
      { field: 'party', width: 200 },
      { field: 'contract_type', width: 160 },
      { field: 'status', width: 130, sortable: true },
      { field: 'amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'currency_code', width: 90 },
      { field: 'end_date', width: 120, sortable: true },
      { field: 'legal_owner', width: 140 },
      { field: 'owner_id', width: 140 },
    ],
    sort: [{ field: 'updated_at', order: 'desc' }],
    pagination: { pageSize: 25 },
    selection: { type: 'multiple' },
    showRecordCount: true,
  },

  listViews: {
    /**
     * 我发起的 — the requester's own book, grouped by status so the answer to
     * "where has mine got to" is the shape of the page rather than a column to
     * scan (§05: 我发起的 grid（按 status 分组）).
     */
    my_contracts: {
      name: 'my_contracts',
      type: 'grid',
      label: 'My Contracts',
      description: { en: 'Contracts I launched, grouped by where each one has got to.', 'zh-CN': '我发起的合同，按各自进行到哪一步分组。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [{ field: 'owner_id', operator: 'equals', value: '{current_user_id}' }],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 260 },
        { field: 'party', width: 200 },
        { field: 'status', width: 130 },
        { field: 'amount', width: 140, align: 'right' },
        { field: 'end_date', width: 120 },
      ],
      grouping: { fields: [{ field: 'status', order: 'asc' }] },
      sort: [{ field: 'updated_at', order: 'desc' }],
      showRecordCount: true,
    },

    /**
     * 待受理 — submitted and nobody has picked it up. `legal_owner` is stamped
     * by F2's round-robin when the type requires review, so an empty one is a
     * contract waiting on a human decision rather than one mid-assignment.
     */
    legal_intake: {
      name: 'legal_intake',
      type: 'grid',
      label: 'Awaiting Intake',
      description: { en: 'Submitted contracts no lawyer has taken yet.', 'zh-CN': '已提交但还没有法务接手的合同。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [
        { field: 'status', operator: 'equals', value: 'submitted' },
        { field: 'legal_owner', operator: 'is_empty' },
      ],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 260 },
        { field: 'party', width: 200 },
        { field: 'contract_type', width: 160 },
        { field: 'risk_level', width: 110 },
        { field: 'amount', width: 140, align: 'right' },
        { field: 'submitted_at', width: 160, sortable: true },
      ],
      sort: [{ field: 'submitted_at', order: 'asc' }],
      showRecordCount: true,
    },

    /** 审查中 — the lawyer's own desk (§05: `legal_owner == me`). */
    legal_in_review: {
      name: 'legal_in_review',
      type: 'grid',
      label: 'My Reviews',
      description: { en: 'Contracts assigned to me for legal review.', 'zh-CN': '指派给我做法务审查的合同。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [{ field: 'legal_owner', operator: 'equals', value: '{current_user_id}' }],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 260 },
        { field: 'party', width: 200 },
        { field: 'status', width: 130 },
        { field: 'open_deviation_count', width: 130, align: 'right' },
        { field: 'risk_level', width: 110 },
        { field: 'review_started_at', width: 160, sortable: true },
      ],
      sort: [{ field: 'review_started_at', order: 'asc' }],
      showRecordCount: true,
    },

    /**
     * 谈判中 — the ball is with the counterparty, oldest turn first, which is
     * the order F4 chases them in.
     */
    negotiating: {
      name: 'negotiating',
      type: 'grid',
      label: 'In Negotiation',
      description: { en: 'Waiting on the counterparty — oldest turn first.', 'zh-CN': '球在对方手上，本轮开始最久的排在前面。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [{ field: 'current_turn', operator: 'equals', value: 'counterparty' }],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 240 },
        { field: 'party', width: 200 },
        { field: 'turn_since', width: 160, sortable: true },
        { field: 'version_count', width: 110, align: 'right' },
        { field: 'legal_owner', width: 140 },
        { field: 'status', width: 130 },
      ],
      sort: [{ field: 'turn_since', order: 'asc' }],
      showRecordCount: true,
    },

    /**
     * 状态看板 — §05's kanban, grouped by `status`. Unfiltered on purpose: the
     * board IS the status spread, so hiding the terminal columns would hide
     * the half of the picture a legal head opens it for.
     */
    status_kanban: {
      name: 'status_kanban',
      type: 'kanban',
      label: 'Status Board',
      description: { en: 'Every contract by lifecycle status.', 'zh-CN': '全部合同按生命周期状态排列。' },
      data: { provider: 'object', object: 'clm_contract' },
      columns: ['contract_number', 'title', 'party', 'amount', 'end_date'],
      kanban: {
        groupByField: 'status',
        summarizeField: 'amount',
        columns: ['contract_number', 'party', 'amount', 'end_date'],
      },
      sort: [{ field: 'updated_at', order: 'desc' }],
    },

    /**
     * 到期日历 — §05's calendar on `end_date`. A contract with no end date (a
     * perpetual NDA, a draft that has not been dated) simply has no event;
     * that is the calendar's own semantics, not a filter.
     */
    expiry_calendar: {
      name: 'expiry_calendar',
      type: 'calendar',
      label: 'Expiry Calendar',
      description: { en: 'When contracts run out.', 'zh-CN': '合同分别在哪天到期。' },
      data: { provider: 'object', object: 'clm_contract' },
      columns: ['contract_number', 'title', 'party', 'status'],
      calendar: {
        startDateField: 'end_date',
        titleField: 'contract_number',
        colorField: 'status',
      },
    },

    /** 生效合同 — finance's book: what is actually running. */
    active_contracts: {
      name: 'active_contracts',
      type: 'grid',
      label: 'Active Contracts',
      description: { en: 'Contracts in force.', 'zh-CN': '正在生效中的合同。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [{ field: 'status', operator: 'equals', value: 'active' }],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 240 },
        { field: 'party', width: 200 },
        { field: 'amount', width: 140, align: 'right', summary: 'sum' },
        { field: 'planned_amount', width: 140, align: 'right', summary: 'sum' },
        { field: 'actual_amount', width: 140, align: 'right', summary: 'sum' },
        { field: 'start_date', width: 120 },
        { field: 'end_date', width: 120, sortable: true },
        { field: 'auto_renew', width: 100, align: 'center' },
      ],
      sort: [{ field: 'end_date', order: 'asc' }],
      showRecordCount: true,
    },

    /**
     * 待执行 — §05 defines this as `signing` AND (the signature record is not
     * `completed` OR the execution formalities are short). Those two disjuncts
     * live on `clm_signature`, and a list-view filter cannot reach another
     * object (one `data.object`, no join) — so this view carries the half it
     * can express and F7 owns the half it cannot: the hook stamps `executed_at`
     * only when the formalities are complete, which is what moves a contract
     * out of `signing`. A row sitting here whose signature IS complete is
     * therefore a row whose formalities are not, which is the same working
     * queue by a different road. Recorded rather than silently narrowed.
     */
    pending_execution: {
      name: 'pending_execution',
      type: 'grid',
      label: 'Awaiting Execution',
      description: { en: 'Signed or signing — waiting on signatures and execution formalities.', 'zh-CN': '已签署或签署中，正等签字与执行形式做齐。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [{ field: 'status', operator: 'equals', value: 'signing' }],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 240 },
        { field: 'party', width: 200 },
        { field: 'execution_formalities', width: 200 },
        { field: 'signed_at', width: 160 },
        { field: 'executed_at', width: 160 },
        { field: 'approved_at', width: 160, sortable: true },
      ],
      sort: [{ field: 'approved_at', order: 'asc' }],
      showRecordCount: true,
    },

    /** 待归档 — terminal but unfiled (§05: 终态且 `archive_no` 空). */
    pending_archive: {
      name: 'pending_archive',
      type: 'grid',
      label: 'Awaiting Archive',
      description: { en: 'Closed contracts with no archive number yet.', 'zh-CN': '已结束但还没有档案号的合同。' },
      data: { provider: 'object', object: 'clm_contract' },
      filter: [
        { field: 'status', operator: 'in', value: ['expired', 'terminated', 'cancelled'] },
        { field: 'archive_no', operator: 'is_empty' },
      ],
      columns: [
        { field: 'contract_number', width: 150, link: true },
        { field: 'title', width: 240 },
        { field: 'party', width: 200 },
        { field: 'status', width: 130 },
        { field: 'closed_at', width: 160, sortable: true },
        { field: 'end_date', width: 120 },
      ],
      sort: [{ field: 'closed_at', order: 'asc' }],
      showRecordCount: true,
    },

    /**
     * 合同台账 — the records desk's register: §05 asks for 全字段, 可导出. Every
     * stored field a person can read, in one exportable sheet.
     */
    contract_register: {
      name: 'contract_register',
      type: 'grid',
      label: 'Contract Register',
      description: { en: 'The full register — every field, exportable.', 'zh-CN': '完整台账，全部字段，可导出。' },
      data: { provider: 'object', object: 'clm_contract' },
      columns: [
        { field: 'contract_number', width: 150, link: true, pinned: 'left' },
        { field: 'title', width: 240 },
        { field: 'archive_no', width: 130 },
        { field: 'contract_type', width: 160 },
        { field: 'category', width: 130 },
        { field: 'direction', width: 110 },
        { field: 'status', width: 130 },
        { field: 'party', width: 200 },
        { field: 'our_entity', width: 140 },
        { field: 'department', width: 140 },
        { field: 'owner_id', width: 140 },
        { field: 'legal_owner', width: 140 },
        { field: 'amount', width: 140, align: 'right', summary: 'sum' },
        { field: 'currency_code', width: 90 },
        { field: 'payment_terms', width: 140 },
        { field: 'start_date', width: 120 },
        { field: 'end_date', width: 120 },
        { field: 'term_months', width: 110, align: 'right' },
        { field: 'auto_renew', width: 100, align: 'center' },
        { field: 'governing_law', width: 160 },
        { field: 'jurisdiction', width: 160 },
        { field: 'execution_formalities', width: 200 },
        { field: 'risk_level', width: 110 },
        { field: 'signed_at', width: 160 },
        { field: 'executed_at', width: 160 },
        { field: 'activated_at', width: 160 },
        { field: 'closed_at', width: 160 },
        { field: 'archived_at', width: 160 },
      ],
      sort: [{ field: 'contract_number', order: 'asc' }],
      exportOptions: { formats: ['csv', 'xlsx'] },
      showRecordCount: true,
    },
  },
});
