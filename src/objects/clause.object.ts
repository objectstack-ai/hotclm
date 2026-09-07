import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * The clause playbook (DESIGN.md §02, Ironclad's Playbook): for each clause
 * the company cares about, the standard wording, the fallback it will accept
 * under pressure, and the line it will not cross. A contract that departs
 * from the standard records a `clm_deviation` against the clause; a
 * high-risk clause's deviation pulls the head of legal into the approval
 * ladder (F6).
 */
export const Clause = ObjectSchema.create({
  name: 'clm_clause',
  label: 'Clause',
  pluralLabel: 'Clause Library',
  icon: 'book-open-text',
  description: 'A playbook clause: standard wording, fallback wording, risk level and the contract categories it applies to.',

  sharingModel: 'public_read',
  nameField: 'title',
  highlightFields: ['title', 'risk_level', 'is_active'],

  fieldGroups: [
    { key: 'identity', label: 'Clause',    icon: 'tag' },
    { key: 'wording',  label: 'Positions', icon: 'scale' },
    { key: 'scope',    label: 'Scope',     icon: 'target' },
  ],

  fields: {
    title: Field.text({
      label: 'Title',
      group: 'identity',
      required: true,
      searchable: true,
      maxLength: 160,
    }),
    category: Field.select({
      label: 'Category',
      group: 'identity',
      required: true,
      options: [
        { label: 'Liability',       value: 'liability' },
        { label: 'Payment',         value: 'payment' },
        { label: 'Termination',     value: 'termination' },
        { label: 'Confidentiality', value: 'confidentiality' },
        { label: 'IP',              value: 'ip' },
        { label: 'Warranty',        value: 'warranty' },
        { label: 'Dispute',         value: 'dispute' },
        { label: 'Other',           value: 'other', default: true },
      ],
    }),
    risk_level: Field.select({
      label: 'Risk Level',
      group: 'identity',
      required: true,
      options: [
        { label: 'Low',    value: 'low',    color: '#94A3B8', default: true },
        { label: 'Medium', value: 'medium', color: '#F59E0B' },
        { label: 'High',   value: 'high',   color: '#EF4444' },
      ],
    }),

    standard_text: Field.richtext({
      label: 'Standard Wording',
      group: 'wording',
      required: true,
      description: 'The position the company opens with.',
    }),
    fallback_text: Field.richtext({
      label: 'Fallback Wording',
      group: 'wording',
      description: 'The position legal will accept without escalation. Empty means the standard wording is the only acceptable one.',
    }),
    position_note: Field.textarea({
      label: 'Walk-away Note',
      group: 'wording',
      description: 'What the company will not accept on this clause, in plain words for the negotiator.',
    }),

    applies_to: Field.select({
      label: 'Applies To',
      group: 'scope',
      multiple: true,
      description: 'Contract categories this clause is expected in. Empty means every category.',
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
    requires_legal_head: Field.boolean({
      label: 'Deviation Needs Head of Legal',
      group: 'scope',
      defaultValue: false,
      description: 'An accepted deviation from this clause routes the contract through the head-of-legal rung (F6).',
    }),
    is_active: Field.boolean({
      label: 'Active',
      group: 'scope',
      defaultValue: true,
    }),
  },

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
