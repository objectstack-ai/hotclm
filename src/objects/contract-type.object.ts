import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A contract type IS a workflow definition (DESIGN.md §02, Ironclad's
 * Workflow Designer): which optional intake fields the launch form shows,
 * whether legal reviews it, whether it must be sealed, how it is signed, and
 * the template the first version is drafted from. Adding a kind of contract
 * is adding a row here, not a flow.
 *
 * Industry-neutral by rule: the eight seeded types (NDA, sales, purchase,
 * service, lease, labor, framework, amendment) are data, not schema.
 */
export const ContractType = ObjectSchema.create({
  name: 'clm_contract_type',
  label: 'Contract Type',
  pluralLabel: 'Contract Types',
  icon: 'file-cog',
  description: 'A kind of contract and the workflow it runs: intake fields, review, sealing, signing method, template.',

  // A configuration dictionary is useless if it is not readable by everyone
  // who launches a contract. Write access is withheld from every non-admin
  // role by the permission sets instead (DESIGN.md §04).
  sharingModel: 'public_read',
  nameField: 'name',
  highlightFields: ['name', 'code', 'direction', 'category', 'is_active'],

  fieldGroups: [
    { key: 'identity', label: 'Identity',          icon: 'tag' },
    { key: 'workflow', label: 'Workflow',          icon: 'workflow' },
    { key: 'template', label: 'Template',          icon: 'file-text', defaultExpanded: false },
    { key: 'terms',    label: 'Defaults & Retention', icon: 'calendar', defaultExpanded: false },
  ],

  fields: {
    name: Field.text({
      label: 'Name',
      group: 'identity',
      required: true,
      searchable: true,
      maxLength: 120,
    }),
    code: Field.text({
      label: 'Code',
      group: 'identity',
      required: true,
      maxLength: 10,
      description: 'Short uppercase prefix used in contract numbering (e.g. NDA, PUR, SAL).',
    }),
    direction: Field.select({
      label: 'Direction',
      group: 'identity',
      required: true,
      options: [
        { label: 'Sales',    value: 'sales',    color: '#0B6E63' },
        { label: 'Purchase', value: 'purchase', color: '#3B82F6' },
        { label: 'Other',    value: 'other',    color: '#94A3B8', default: true },
      ],
    }),
    category: Field.select({
      label: 'Category',
      group: 'identity',
      required: true,
      description: 'Process category — drives the approval matrix and the clause playbook. Not the commercial type HotCRM uses.',
      options: [
        { label: 'NDA',                  value: 'nda' },
        { label: 'Sales',                value: 'sales' },
        { label: 'Purchase',             value: 'purchase' },
        { label: 'Service',              value: 'service' },
        { label: 'Lease',                value: 'lease' },
        { label: 'Labor',                value: 'labor' },
        { label: 'Framework',            value: 'framework' },
        { label: 'Amendment',            value: 'amendment' },
        { label: 'Other',                value: 'other', default: true },
      ],
    }),
    description: Field.textarea({
      label: 'Description',
      group: 'identity',
    }),

    intake_fields: Field.select({
      label: 'Intake Fields',
      group: 'workflow',
      multiple: true,
      description: 'Optional contract fields the launch form shows (and requires) for this type. Core fields are always asked.',
      options: [
        { label: 'Governing Law',            value: 'governing_law' },
        { label: 'Payment Terms',            value: 'payment_terms' },
        { label: 'Confidentiality Term',     value: 'confidentiality_term_months' },
        { label: 'Liability Cap',            value: 'liability_cap' },
        { label: 'Auto Renewal',             value: 'auto_renew' },
        { label: 'Parent Contract',          value: 'parent_contract' },
      ],
    }),
    requires_legal_review: Field.boolean({
      label: 'Requires Legal Review',
      group: 'workflow',
      defaultValue: true,
      description: 'When off, a submitted contract of this type goes straight to approval (DESIGN.md §03 状态机).',
    }),
    requires_seal: Field.boolean({
      label: 'Requires Seal',
      group: 'workflow',
      defaultValue: true,
      description: 'Activation waits for a completed seal request when on.',
    }),
    sign_method: Field.select({
      label: 'Signing Method',
      group: 'workflow',
      options: [
        { label: 'E-signature',       value: 'esign' },
        { label: 'Wet ink',           value: 'wet_ink' },
        { label: 'Either',            value: 'both', default: true },
      ],
    }),
    review_sla_days: Field.number({
      label: 'Review SLA (days)',
      group: 'workflow',
      scale: 0,
      min: 0,
      max: 90,
      defaultValue: 5,
      description: 'Working days legal has to finish review before the overdue reminder fires (F3).',
    }),

    template_file: Field.file({
      label: 'Template',
      group: 'template',
      accept: ['application/pdf', '.docx'],
      maxSize: 20 * 1024 * 1024,
      description: 'The document a first version is drafted from. No rendering engine exists on the platform yet — the launch form hands the template and its placeholder list to the drafter (DESIGN.md §12).',
    }),
    template_placeholders: Field.json({
      label: 'Template Placeholders',
      group: 'template',
      description: 'Array of { key, label, type, required } — the same shape as DocumentTemplate.placeholders in @objectstack/spec.',
    }),

    default_term_months: Field.number({
      label: 'Default Term (months)',
      group: 'terms',
      scale: 0,
      min: 0,
      max: 600,
      defaultValue: 12,
    }),
    retention_years: Field.number({
      label: 'Retention (years)',
      group: 'terms',
      scale: 0,
      min: 0,
      max: 100,
      defaultValue: 10,
      description: 'How long an archived contract of this type is kept before it may be disposed of.',
    }),
    is_active: Field.boolean({
      label: 'Active',
      group: 'terms',
      defaultValue: true,
      description: 'Inactive types are hidden from the launch form; existing contracts keep them.',
    }),
  },

  indexes: [
    { fields: ['code'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
  },
});
