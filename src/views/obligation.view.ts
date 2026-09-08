import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_obligation` views — 我的合同's fourth entry, 我负责的履约.
 *
 * §05 asks for one grid sorted by due date ascending. The primary list is the
 * whole book (a records or legal reader lands there from the record page's
 * related list); `my_obligations` is the personal queue the navigation names.
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
export const ObligationViews = defineView({
  list: {
    type: 'grid',
    name: 'all_obligations',
    label: 'All Obligations',
    data: { provider: 'object', object: 'clm_obligation' },
    columns: [
      { field: 'display_name', width: 200, link: true, pinned: 'left' },
      { field: 'contract', width: 200 },
      { field: 'title', width: 260 },
      { field: 'kind', width: 130 },
      { field: 'due_date', width: 120, sortable: true },
      { field: 'owner', width: 140 },
      { field: 'status', width: 120, sortable: true },
    ],
    sort: [{ field: 'due_date', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },

  listViews: {
    /**
     * 我负责的履约 — mine, soonest first (§05: 履约 grid（due_date 升序）).
     *
     * Unfinished only. An obligation the person already closed is history, and
     * `clm_requester` holds edit on exactly the rows it owns — so this list is
     * both what they must do and what they may act on. The full book, closed
     * rows included, is the `all_obligations` tab beside it.
     */
    my_obligations: {
      name: 'my_obligations',
      type: 'grid',
      label: 'My Obligations',
      description: { en: 'Obligations assigned to me that are not finished, soonest due first.', 'zh-CN': '指派给我且尚未完成的义务，快到期的排在前面。' },
      data: { provider: 'object', object: 'clm_obligation' },
      filter: [
        { field: 'owner', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'in', value: ['pending', 'in_progress', 'overdue'] },
      ],
      columns: [
        { field: 'display_name', width: 200, link: true },
        { field: 'contract', width: 200 },
        { field: 'title', width: 280 },
        { field: 'kind', width: 130 },
        { field: 'due_date', width: 120, sortable: true },
        { field: 'status', width: 120 },
      ],
      sort: [{ field: 'due_date', order: 'asc' }],
      showRecordCount: true,
    },
  },
});
