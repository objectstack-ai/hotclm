import { defineDataset } from '@objectstack/spec/ui';

/**
 * Contract counts and value — the semantic layer for DESIGN.md §09's first
 * dataset ("数量与金额，按类型 / 方向 / 状态 / 部门 / 月").
 *
 * ADR-0021: every dashboard that shows "how many contracts" or "how much
 * contract value" binds HERE and selects by name, so the two numbers cannot
 * drift between the legal workbench and the executive board.
 *
 * ## Money carries NO currency symbol, and that is not a style choice
 *
 * `DatasetMeasure.currency` exists to carry an ISO code onto the result field
 * "when the aggregated field is a fixed-currency amount". This fixture is not:
 * measured on the 820-row demo, `clm_contract.currency_code` is USD 42 / EUR 41
 * / GBP 37, so a baked `$` would mislabel 78 of 120 contracts. The measures
 * therefore declare `format: '0,0'` and no `currency`.
 *
 * That leaves one honest consequence, stated rather than hidden: `total_amount`
 * over a mixed-currency set is a sum of unlike units. No FX rate exists in this
 * app (DESIGN.md §01 keeps commercial terms in HotCRM), so the executive
 * dashboard renders contract value SPLIT BY `currency_code` rather than as one
 * headline number. A single cross-currency total would be a number that looks
 * computed and is not (AGENTS.md 命名: honest capabilities).
 */
export const ContractDataset = defineDataset({
  name: 'contract_metrics',
  label: 'Contract Metrics',
  description:
    'Contract counts and value by type, direction, status, department, counterparty and month. Amounts are each contract\'s own currency and are not FX-converted — group by currency before totalling.',
  object: 'clm_contract',

  // Joins are COMPILED from these names; no ON clause is ever written
  // (ADR-0021). Both are to-one lookups on `clm_contract`, so both are legal
  // one-hop paths.
  include: ['contract_type', 'party'],

  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'category', label: 'Category', field: 'category', type: 'string' },
    { name: 'direction', label: 'Direction', field: 'direction', type: 'string' },
    { name: 'department', label: 'Requesting Department', field: 'department', type: 'string' },
    { name: 'currency_code', label: 'Currency', field: 'currency_code', type: 'string' },
    { name: 'governing_law', label: 'Governing Law', field: 'governing_law', type: 'string' },
    { name: 'risk_level', label: 'Risk Level', field: 'risk_level', type: 'string' },
    { name: 'current_turn', label: 'Ball In Court', field: 'current_turn', type: 'string' },
    { name: 'approval_status', label: 'Approval Status', field: 'approval_status', type: 'string' },
    // Cross-object, one hop each. Compiled to a LEFT JOIN — measured on the
    // demo fixture, both resolve (`"contract_type"."name"`, `"party"."name"`).
    { name: 'contract_type_name', label: 'Contract Type', field: 'contract_type.name', type: 'string' },
    { name: 'counterparty', label: 'Counterparty', field: 'party.name', type: 'string' },

    // Date axes. Each stamp gets its OWN dimension rather than one shared
    // "date": a widget picks the axis its question is about, and the executor
    // shifts the one the widget's filter dated (`compareTo`).
    { name: 'submitted_month', label: 'Submitted Month', field: 'submitted_at', type: 'date', dateGranularity: 'month' },
    { name: 'approved_month', label: 'Approved Month', field: 'approved_at', type: 'date', dateGranularity: 'month' },
    { name: 'signed_month', label: 'Signed Month', field: 'signed_at', type: 'date', dateGranularity: 'month' },
    { name: 'activated_month', label: 'Activated Month', field: 'activated_at', type: 'date', dateGranularity: 'month' },
    { name: 'end_month', label: 'Expiry Month', field: 'end_date', type: 'date', dateGranularity: 'month' },
  ],

  measures: [
    { name: 'contract_count', label: 'Contracts', aggregate: 'count' },
    { name: 'total_amount', label: 'Contract Value', aggregate: 'sum', field: 'amount', format: '0,0' },
    { name: 'avg_amount', label: 'Average Value', aggregate: 'avg', field: 'amount', format: '0,0' },

    // The four approval rungs of DESIGN.md §04 are four persisted BOOLEANS on
    // the contract (`route_*`, stamped by F2), not one column, so "contracts
    // per rung" is four measure-scoped counts rather than one dimension. A
    // widget selects all four with no dimension and gets one row of four
    // numbers.
    { name: 'route_legal_head_count', label: 'Routes: Head of Legal', aggregate: 'count', filter: { route_legal_head: true } },
    { name: 'route_finance_count', label: 'Routes: Finance Controller', aggregate: 'count', filter: { route_finance: true } },
    { name: 'route_executive_count', label: 'Routes: Executive', aggregate: 'count', filter: { route_executive: true } },
    { name: 'route_gm_count', label: 'Routes: General Manager', aggregate: 'count', filter: { route_gm: true } },
  ],
});
