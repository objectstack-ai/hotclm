import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_clause` views — 法务工作台's 条款库 entry (the playbook).
 *
 * Grouped by category on the primary list because that is how a lawyer reaches
 * a clause: by the thing it governs, not alphabetically.
 */
export const ClauseViews = defineView({
  list: {
    type: 'grid',
    name: 'all_clauses',
    label: 'Clause Library',
    data: { provider: 'object', object: 'clm_clause' },
    columns: [
      { field: 'title', width: 280, link: true, pinned: 'left' },
      { field: 'category', width: 160 },
      { field: 'risk_level', width: 110 },
      { field: 'requires_legal_head', width: 160, align: 'center' },
      { field: 'applies_to', width: 220 },
      { field: 'position_note', width: 320 },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    grouping: { fields: [{ field: 'category', order: 'asc' }] },
    sort: [{ field: 'title', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },
});
