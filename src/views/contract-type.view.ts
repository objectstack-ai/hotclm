import { defineView } from '@objectstack/spec/ui';

/**
 * `clm_contract_type` views — 法务工作台's 合同类型 entry.
 *
 * The type is the workflow: which intake fields are asked, whether legal
 * reviews it, how it is executed, how long the review SLA is. The columns are
 * chosen so a lawyer can read the whole policy off one row.
 */
export const ContractTypeViews = defineView({
  list: {
    type: 'grid',
    name: 'all_contract_types',
    label: 'Contract Types',
    data: { provider: 'object', object: 'clm_contract_type' },
    columns: [
      { field: 'name', width: 240, link: true, pinned: 'left' },
      { field: 'code', width: 100 },
      { field: 'category', width: 150 },
      { field: 'direction', width: 110 },
      { field: 'requires_legal_review', width: 150, align: 'center' },
      { field: 'review_sla_days', width: 130, align: 'right' },
      { field: 'sign_method', width: 140 },
      { field: 'execution_formalities', width: 220 },
      { field: 'default_term_months', width: 150, align: 'right' },
      { field: 'retention_years', width: 130, align: 'right' },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    sort: [{ field: 'code', order: 'asc' }],
    pagination: { pageSize: 25 },
    showRecordCount: true,
  },
});
