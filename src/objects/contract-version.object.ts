import { F } from '@objectstack/spec';
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
 * one (`contract.hook.ts`). At most one version of a contract is current
 * (`contract-version.hook.ts`). `display_name` is a formula ("v<n> · <kind>")
 * whose kind is `label(record.kind)`: the option label in the READER's locale
 * (`v2 · 清稿` to a zh-CN reader, `v2 · Clean` to an en-US one), on every
 * surface the server serves the name to (issue #157, objectstack#26608).
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
    display_name: Field.formula({
      label: 'Version',
      group: 'version',
      returnType: 'text',
      expression: F`'v' + string(record.version_no) + ' · ' + label(record.kind)`,
      description: 'Filled in automatically from the version number and kind, e.g. "v2 · Clean".',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'version',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Versions',
      // The columns the contract page's list shows (ADR-0085: the record page
      // derives the list from this relationship since @objectstack 18.3).
      relatedListColumns: ['display_name', 'version_no', 'kind', 'turn', 'is_current', 'file', 'submitted_by', 'created_at'],
    }),
    version_no: Field.number({
      label: 'Version No.',
      group: 'version',
      required: true,
      storage: { notNull: true },
      scale: 0,
      min: 1,
      max: 9999,
    }),
    kind: Field.select({
      label: 'Kind',
      group: 'version',
      required: true,
      storage: { notNull: true },
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
      // A new version is current by default; `contract-version.hook.ts` keeps
      // the flag to one row per contract and never moves it onto a
      // `final_signed` copy while other versions exist. The approved → signing
      // guard in contract.hook.ts reads this flag.
      defaultValue: true,
      description: 'The version negotiation is currently on. A contract can go to signing only once its current version is a clean copy.',
    }),

    file: Field.file({
      label: 'File',
      group: 'document',
      required: true,
      storage: { notNull: true },
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
