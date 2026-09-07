import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A contract type IS a workflow definition (DESIGN.md §02, Ironclad's
 * Workflow Designer): which optional intake fields the launch form shows,
 * whether legal reviews it, how it is executed and which execution
 * formalities activation waits for, and the template the first version is
 * drafted from. Adding a kind of contract is adding a row here, not a flow.
 *
 * Industry- and region-neutral by rule: the seeded types (NDA, MSA, SOW,
 * order form, supplier agreement, DPA, lease, contractor, amendment) are
 * data, not schema; a company seal is one execution formality among
 * notarization, witnessing and countersignature, not a module.
 */
export const ContractType = ObjectSchema.create({
  name: 'clm_contract_type',
  label: 'Contract Type',
  pluralLabel: 'Contract Types',
  icon: 'file-cog',
  description: 'A kind of contract and the workflow it runs: intake fields, review, execution method and formalities, template.',

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
      storage: { notNull: true },
      searchable: true,
      maxLength: 120,
    }),
    code: Field.text({
      label: 'Code',
      group: 'identity',
      required: true,
      storage: { notNull: true },
      maxLength: 10,
      description: 'Short uppercase prefix used in contract numbering (e.g. NDA, PUR, SAL).',
    }),
    direction: Field.select({
      label: 'Direction',
      group: 'identity',
      required: true,
      storage: { notNull: true },
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
      storage: { notNull: true },
      description: 'Process category — drives the approval matrix and the clause playbook. Not the commercial type HotCRM uses.',
      options: [
        { label: 'NDA',                  value: 'nda' },
        { label: 'Sales',                value: 'sales' },
        { label: 'Purchase',             value: 'purchase' },
        { label: 'Service',              value: 'service' },
        { label: 'Lease',                value: 'lease' },
        { label: 'Employment / Contractor', value: 'employment' },
        { label: 'Framework',            value: 'framework' },
        { label: 'Data Processing (DPA)', value: 'dpa' },
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
      // The list is exactly the optional fields a LAUNCHING user may write.
      // `liability_cap` is not among them and must not be re-added: DESIGN.md
      // §04 makes it read-only for `clm_requester` ("由法务评定"), so a type
      // that asked for it deadlocked its own contracts — measured on 17.3.0,
      // a requester's write of the key is refused `PERMISSION_DENIED`, while
      // `contract_state_machine` refuses the submission without it
      // ("Intake fields required by the contract type are missing:
      // liability_cap."). Legal sets the cap during review.
      description: 'Optional contract fields the launch form shows (and requires) for this type. Core fields are always asked. Only fields a launching requester may write belong here.',
      options: [
        { label: 'Governing Law',            value: 'governing_law' },
        { label: 'Payment Terms',            value: 'payment_terms' },
        { label: 'Confidentiality Term',     value: 'confidentiality_term_months' },
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
    execution_formalities: Field.select({
      label: 'Execution Formalities',
      group: 'workflow',
      multiple: true,
      description: 'Formalities activation waits for, recorded on the signature record. Company seal, notarization and witnessing are regional or deed-type requirements; most types need none.',
      options: [
        { label: 'Countersigned copy returned', value: 'countersigned_copy' },
        { label: 'Company seal',                value: 'company_seal' },
        { label: 'Notarized',                   value: 'notarized' },
        { label: 'Witnessed',                   value: 'witnessed' },
      ],
    }),
    sign_method: Field.select({
      label: 'Signing Method',
      group: 'workflow',
      description: 'How this type is normally executed. E-signature goes through the configured provider (DocuSign, Adobe Acrobat Sign, Dropbox Sign, or a regional provider); wet ink records an uploaded executed copy.',
      options: [
        { label: 'E-signature',       value: 'esign', default: true },
        { label: 'Wet ink',           value: 'wet_ink' },
        { label: 'Either',            value: 'either' },
      ],
    }),
    review_sla_days: Field.number({
      label: 'Review SLA (days)',
      group: 'workflow',
      scale: 0,
      min: 0,
      max: 90,
      defaultValue: 5,
      description: 'Calendar days legal has to finish review before the overdue reminder fires (F3).',
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
