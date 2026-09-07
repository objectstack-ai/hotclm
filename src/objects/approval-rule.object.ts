import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * The approval matrix (DESIGN.md §02, Ironclad's conditional approvers) —
 * as data. The approval flow (F5) has a fixed five-rung ladder: direct
 * manager → head of legal → finance controller → executive → general manager.
 * A rule says which rungs a contract climbs, by category, direction, amount
 * band and whether it carries an accepted deviation. `contract_route` (F2)
 * evaluates the active rules on submit and stamps the `route_*` flags the
 * ladder's decision nodes read. Customers change thresholds here, never the
 * flow; a sixth rung is a customer overlay (DESIGN.md §13 Q3).
 */
export const ApprovalRule = ObjectSchema.create({
  name: 'clm_approval_rule',
  label: 'Approval Rule',
  pluralLabel: 'Approval Matrix',
  icon: 'route',
  description: 'One row of the approval matrix: which contracts it matches and which rungs of the approval ladder they climb.',

  sharingModel: 'public_read',
  nameField: 'name',
  highlightFields: ['name', 'direction', 'amount_min', 'amount_max', 'priority', 'is_active'],

  fieldGroups: [
    { key: 'match', label: 'Matches',        icon: 'filter' },
    { key: 'route', label: 'Routes Through', icon: 'route' },
  ],

  fields: {
    name: Field.text({
      label: 'Name',
      group: 'match',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 120,
    }),
    applies_to: Field.select({
      label: 'Contract Categories',
      group: 'match',
      multiple: true,
      description: 'Empty means every category.',
      options: [
        { label: 'NDA',       value: 'nda' },
        { label: 'Sales',     value: 'sales' },
        { label: 'Purchase',  value: 'purchase' },
        { label: 'Service',   value: 'service' },
        { label: 'Lease',     value: 'lease' },
        { label: 'Employment / Contractor', value: 'employment' },
        { label: 'Framework', value: 'framework' },
        { label: 'Data Processing (DPA)', value: 'dpa' },
        { label: 'Amendment', value: 'amendment' },
        { label: 'Other',     value: 'other' },
      ],
    }),
    direction: Field.select({
      label: 'Direction',
      group: 'match',
      options: [
        { label: 'Any',      value: 'any', default: true },
        { label: 'Sales',    value: 'sales' },
        { label: 'Purchase', value: 'purchase' },
        { label: 'Other',    value: 'other' },
      ],
    }),
    amount_min: Field.currency({
      label: 'Amount From',
      group: 'match',
      scale: 2,
      min: 0,
      description: 'Inclusive lower bound of the contract amount this rule matches. Empty means no lower bound.',
    }),
    amount_max: Field.currency({
      label: 'Amount To',
      group: 'match',
      scale: 2,
      min: 0,
      description: 'Exclusive upper bound. Empty means no upper bound.',
    }),
    only_with_deviation: Field.boolean({
      label: 'Only With Deviation',
      group: 'match',
      defaultValue: false,
      description: 'Match only contracts carrying at least one accepted clause deviation.',
    }),
    priority: Field.number({
      label: 'Priority',
      group: 'match',
      scale: 0,
      min: 0,
      max: 1000,
      defaultValue: 100,
      description: 'Lower runs first. Every matching rule contributes its rungs; the union is what the contract climbs.',
    }),

    route_legal_head: Field.boolean({ label: 'Head of Legal',      group: 'route', defaultValue: false }),
    route_finance:    Field.boolean({ label: 'Finance Controller', group: 'route', defaultValue: false }),
    route_executive:  Field.boolean({ label: 'Executive',          group: 'route', defaultValue: false }),
    route_gm:         Field.boolean({ label: 'General Manager',    group: 'route', defaultValue: false }),

    is_active: Field.boolean({
      label: 'Active',
      group: 'route',
      defaultValue: true,
    }),
  },

  validations: [
    {
      type: 'script' as const,
      name: 'approval_rule_amount_band',
      label: 'Amount band is ordered',
      description: 'When both bounds are set, the lower bound must be below the upper bound.',
      condition: 'record.amount_min != null && record.amount_max != null && record.amount_min >= record.amount_max',
      message: 'Amount From must be below Amount To.',
    },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
