import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * One document version of a contract — our draft, an internal redline, the
 * counterparty's redline, the clean copy, or the final signed copy. Versions
 * are how negotiation rounds are recorded (DESIGN.md §03): there is no
 * counterparty portal, so legal uploads the other side's markup as a
 * `counterparty_redline` version.
 *
 * Two versions gate the contract's state machine: `approved → signing` needs
 * a current `clean` version, and `signing → active` needs a `final_signed`
 * one (`contract.hook.ts`). `display_name` is a stored mirror ("v<n> · <kind>")
 * stamped by `mirror.hook.ts` — a stored title, never a formula, so the record
 * is searchable and pickable.
 */
export const ContractVersion = ObjectSchema.create({
  name: 'clm_contract_version',
  label: 'Contract Version',
  pluralLabel: 'Contract Versions',
  icon: 'file-stack',
  description: 'A document version of a contract: draft, redline (ours or theirs), clean copy or final signed copy.',

  // Access derives from the contract (ADR-0055): whoever can read the contract
  // reads its versions, whoever can edit it edits them.
  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'version_no', 'kind', 'turn', 'is_current'],

  fieldGroups: [
    { key: 'version',  label: 'Version',  icon: 'file-stack' },
    { key: 'document', label: 'Document', icon: 'file-text' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Version',
      group: 'version',
      readonly: true,
      searchable: true,
      maxLength: 80,
      description: 'Stored mirror "v<version_no> · <kind>", stamped by mirror.hook.ts.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'version',
      required: true,
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Versions',
    }),
    version_no: Field.number({
      label: 'Version No.',
      group: 'version',
      required: true,
      scale: 0,
      min: 1,
      max: 9999,
    }),
    kind: Field.select({
      label: 'Kind',
      group: 'version',
      required: true,
      options: [
        { label: 'Draft',                value: 'draft',                color: '#94A3B8', default: true },
        { label: 'Internal Redline',     value: 'internal_redline',     color: '#3B82F6' },
        { label: 'Counterparty Redline', value: 'counterparty_redline', color: '#F59E0B' },
        { label: 'Clean',                value: 'clean',                color: '#0B6E63' },
        { label: 'Final Signed',         value: 'final_signed',         color: '#2F7D5B' },
      ],
    }),
    turn: Field.select({
      label: 'Turn',
      group: 'version',
      description: 'Which side produced this version.',
      options: [
        { label: 'Internal',     value: 'internal',     color: '#3B82F6' },
        { label: 'Counterparty', value: 'counterparty', color: '#F59E0B' },
      ],
    }),
    is_current: Field.boolean({
      label: 'Current',
      group: 'version',
      defaultValue: false,
      description: 'The version negotiation is currently on. The clean-version guard before signing reads this flag.',
    }),

    file: Field.file({
      label: 'File',
      group: 'document',
      required: true,
      accept: ['application/pdf', '.docx'],
      maxSize: 50 * 1024 * 1024,
    }),
    submitted_by: Field.user({
      label: 'Submitted By',
      group: 'document',
    }),
    notes: Field.textarea({
      label: 'Notes',
      group: 'document',
      description: 'What changed in this version, for the reviewer.',
    }),
  },

  indexes: [
    { fields: ['contract', 'version_no'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
