import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_approval_rule` views — 管理's 审批矩阵 entry.
 *
 * The matrix is read top-to-bottom by `priority`, which is the order F2
 * evaluates it in, so the list sorts by it rather than by name: a reader who
 * scans this page is asking "which rule wins", and the answer is the row order.
 */
export const ApprovalRuleViews = defineView({
  list: {
    type: 'grid',
    name: 'all_approval_rules',
    label: 'Approval Matrix',
    data: { provider: 'object', object: 'clm_approval_rule' },
    columns: [
      { field: 'priority', width: 90, align: 'right', sortable: true, pinned: 'left' },
      { field: 'name', width: 240, link: true },
      { field: 'applies_to', width: 200 },
      { field: 'direction', width: 110 },
      { field: 'amount_min', width: 150, align: 'right' },
      { field: 'amount_max', width: 150, align: 'right' },
      { field: 'only_with_deviation', width: 160, align: 'center' },
      { field: 'route_legal_head', width: 140, align: 'center' },
      { field: 'route_finance', width: 130, align: 'center' },
      { field: 'route_executive', width: 140, align: 'center' },
      { field: 'route_gm', width: 120, align: 'center' },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    sort: [{ field: 'priority', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },
});
