import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_obligation` views — 我的合同's fourth entry, 我负责的履约.
 *
 * §05 asks for one grid sorted by due date ascending. The primary list is the
 * whole book (a records or legal reader lands there from the record page's
 * related list); `my_obligations` is the personal queue the navigation names.
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
      description: 'Obligations assigned to me that are not finished, soonest due first.',
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
