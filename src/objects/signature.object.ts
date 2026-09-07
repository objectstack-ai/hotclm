import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * One execution round of a contract: the e-signature envelope or the wet-ink
 * round, who signs in what order, and which execution formalities were done.
 * There is no `clm_signatory` object — signers are JSON rows on this record —
 * and no seal module: a company seal is one value of `formalities_done`,
 * next to notarization, witnessing and the countersigned copy (DESIGN.md §01,
 * §03 五个刻意的取舍).
 *
 * Activation reads this record: `signing → active` needs a `completed`
 * signature whose `formalities_done` covers the contract's
 * `execution_formalities` (stamped from the type). `status` is a state
 * machine (`draft` → `sent` / `completed` / `voided`, `sent` → `completed` /
 * `declined` / `voided`, `declined` → `draft`; wet ink may complete straight
 * from draft) enforced in `contract.hook.ts`. `display_name` is a stored
 * mirror ("<method> · <status>") stamped by `mirror.hook.ts`.
 */
export const Signature = ObjectSchema.create({
  name: 'clm_signature',
  label: 'Signature',
  pluralLabel: 'Signatures',
  icon: 'pen-line',
  description: 'One signing round of a contract: method, provider envelope, signers, status and the execution formalities completed.',

  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'method', 'provider', 'status', 'completed_at'],

  fieldGroups: [
    { key: 'round',     label: 'Signing Round', icon: 'pen-line' },
    { key: 'execution', label: 'Execution',     icon: 'stamp' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Signature',
      group: 'round',
      readonly: true,
      searchable: true,
      maxLength: 80,
      description: 'Stored mirror "<method> · <status>", stamped by mirror.hook.ts.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'round',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Signatures',
    }),
    method: Field.select({
      label: 'Method',
      group: 'round',
      required: true,
      storage: { notNull: true },
      options: [
        { label: 'E-signature', value: 'esign',   color: '#3B82F6', default: true },
        { label: 'Wet ink',     value: 'wet_ink', color: '#7C2D12' },
      ],
    }),
    provider: Field.select({
      label: 'Provider',
      group: 'round',
      description: 'E-signature provider the envelope was sent through. Regional packs append their own (DESIGN.md §13 Q7).',
      options: [
        { label: 'DocuSign',           value: 'docusign' },
        { label: 'Adobe Acrobat Sign', value: 'adobe_sign' },
        { label: 'Dropbox Sign',       value: 'dropbox_sign' },
      ],
    }),
    envelope_id: Field.text({
      label: 'Envelope ID',
      group: 'round',
      searchable: true,
      maxLength: 120,
      description: 'The provider\'s envelope or agreement id, for status polling and audit (F8).',
    }),
    signers: Field.json({
      label: 'Signers',
      group: 'round',
      description: 'Array of { side: our | counterparty, name, email, order, status, signed_at } — one row per signer, in signing order.',
    }),
    status: Field.select({
      label: 'Status',
      group: 'round',
      required: true,
      storage: { notNull: true },
      options: [
        { label: 'Draft',     value: 'draft',     color: '#94A3B8', default: true },
        { label: 'Sent',      value: 'sent',      color: '#3B82F6' },
        { label: 'Completed', value: 'completed', color: '#2F7D5B' },
        { label: 'Declined',  value: 'declined',  color: '#EF4444' },
        { label: 'Voided',    value: 'voided',    color: '#64748B' },
      ],
    }),

    formalities_done: Field.select({
      label: 'Formalities Done',
      group: 'execution',
      multiple: true,
      description: 'Same value set as clm_contract_type.execution_formalities. Activation waits until every formality the type requires is ticked here on a completed round.',
      options: [
        { label: 'Countersigned copy returned', value: 'countersigned_copy' },
        { label: 'Company seal',                value: 'company_seal' },
        { label: 'Notarized',                   value: 'notarized' },
        { label: 'Witnessed',                   value: 'witnessed' },
      ],
    }),
    executed_file: Field.file({
      label: 'Executed Copy',
      group: 'execution',
      accept: ['application/pdf'],
      maxSize: 50 * 1024 * 1024,
      description: 'The fully executed document — the provider\'s completed envelope, or the scanned wet-ink copy.',
    }),
    completed_at: Field.datetime({
      label: 'Completed At',
      group: 'execution',
      description: 'Stamped when the round completes, unless set explicitly (a wet-ink round records the actual signing date).',
    }),
    notes: Field.textarea({
      label: 'Notes',
      group: 'execution',
    }),
  },

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
