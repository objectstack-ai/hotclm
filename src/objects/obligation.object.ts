import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * A post-signature commitment carried by one contract (DESIGN.md §03, the
 * signed domain): a deliverable, a report, a renewal notice, a compliance
 * step — anything someone has to DO once the ink is dry. Obligations are the
 * reason a CLM outlives signature: an active contract with nothing tracked
 * after execution is a filing cabinet, not a lifecycle.
 *
 * `status` is a state machine enforced in `contract.hook.ts`
 * (`pending → in_progress / done / waived / overdue`, `in_progress → done /
 * waived`, `overdue → done / waived`; `done` and `waived` are terminal).
 * `overdue` has exactly ONE writer — the daily obligation job of card 09 — so
 * a write to it from a person is refused on both write paths, not merely
 * hidden in the form: an obligation nobody has slipped on cannot be typed
 * into arrears, and one that has slipped cannot be typed out of them
 * (DESIGN.md §03 状态机; the card's "honest capabilities" rule).
 *
 * `display_name` is a STORED mirror of `title` stamped by `mirror.hook.ts`,
 * not a formula: `nameField` must be searchable, and a formula is not
 * (AGENTS.md 命名). It exists so the child carries the same title contract as
 * its four siblings even though `title` is already a plain field — the
 * platform reads one key for every child of `clm_contract`.
 */
export const Obligation = ObjectSchema.create({
  name: 'clm_obligation',
  label: 'Obligation',
  pluralLabel: 'Obligations',
  icon: 'list-checks',
  description: 'A commitment a signed contract carries: what has to be delivered, reported or renewed, by when, and by whom.',

  // Access derives from the contract (ADR-0055): whoever can read the
  // contract reads its obligations, whoever can edit it edits them.
  sharingModel: 'controlled_by_parent',
  nameField: 'display_name',
  highlightFields: ['display_name', 'kind', 'due_date', 'owner', 'status'],

  fieldGroups: [
    { key: 'obligation', label: 'Obligation', icon: 'list-checks' },
    { key: 'progress',   label: 'Progress',   icon: 'circle-check' },
  ],

  fields: {
    display_name: Field.text({
      label: 'Obligation',
      group: 'obligation',
      readonly: true,
      searchable: true,
      maxLength: 200,
      description: 'Stored mirror of title, stamped by mirror.hook.ts.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'obligation',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Obligations',
    }),
    title: Field.text({
      label: 'Title',
      group: 'obligation',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 200,
      description: 'What has to be done, in the words the owner will recognise on a reminder.',
    }),
    kind: Field.select({
      label: 'Kind',
      group: 'obligation',
      description: 'What class of commitment this is; the reminder job and the dashboards band on it.',
      options: [
        { label: 'Deliverable', value: 'deliverable', color: '#3B82F6', default: true },
        { label: 'Payment',     value: 'payment',     color: '#0B6E63' },
        { label: 'Report',      value: 'report',      color: '#8B5CF6' },
        { label: 'Renewal',     value: 'renewal',     color: '#F59E0B' },
        { label: 'Compliance',  value: 'compliance',  color: '#EF4444' },
        { label: 'Other',       value: 'other',       color: '#94A3B8' },
      ],
    }),
    due_date: Field.date({
      label: 'Due Date',
      group: 'obligation',
      required: true,
      storage: { notNull: true },
      description: 'The date the daily job (card 09) measures arrears against.',
    }),
    owner: Field.user({
      label: 'Owner',
      group: 'obligation',
      description: 'Who is accountable for performing it. Empty means unassigned, not the contract owner.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'progress',
      required: true,
      storage: { notNull: true },
      description: 'pending → in_progress / done / waived / overdue; in_progress → done / waived; overdue → done / waived. Enforced by contract.hook.ts; overdue is written only by the daily job (card 09).',
      options: [
        { label: 'Pending',     value: 'pending',     color: '#94A3B8', default: true },
        { label: 'In Progress', value: 'in_progress', color: '#3B82F6' },
        { label: 'Done',        value: 'done',        color: '#2F7D5B' },
        { label: 'Overdue',     value: 'overdue',     color: '#EF4444' },
        { label: 'Waived',      value: 'waived',      color: '#64748B' },
      ],
    }),
    completed_at: Field.datetime({
      label: 'Completed At',
      group: 'progress',
      description: 'Stamped when the obligation is marked done, unless set explicitly.',
    }),
    evidence: Field.file({
      label: 'Evidence',
      group: 'progress',
      accept: ['application/pdf', '.docx', 'image/*'],
      maxSize: 50 * 1024 * 1024,
      description: 'Proof of performance — the delivery note, the filed report, the countersigned notice.',
    }),
    notes: Field.textarea({
      label: 'Notes',
      group: 'progress',
    }),
  },

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
