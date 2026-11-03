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
  // ...with one exception: the row's platform owner may update it while only
  // READING the contract (ADR-0055 §3 amendment, platform 18.2). An
  // obligation exists only under a signed contract, which a requester can no
  // longer edit, so without this nobody without contract edit could ever act
  // on one. Only a by-id update is opened: creating, deleting, and moving an
  // obligation to another contract still need edit on the contract.
  //
  // The accountable person IS that platform owner, `owner_id` (issue #64,
  // ruled A): one owner concept, the one the platform's gate, the
  // `obligation_requester_own` policy, 我负责的履约 and F10's reminder all
  // read. Handing an obligation to someone else is a change of `owner_id`,
  // which needs the transfer grant (`allowTransfer`), held by legal and the
  // administrator only — the owner cannot give their own obligation away.
  sharing: { controlledByParent: { ownerMayEdit: true } },
  nameField: 'display_name',
  highlightFields: ['display_name', 'kind', 'due_date', 'owner_id', 'status'],

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
      description: 'Filled in automatically from the title.',
    }),
    contract: Field.masterDetail('clm_contract', {
      label: 'Contract',
      group: 'obligation',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      inlineEdit: 'grid',
      inlineTitle: 'Obligations',
      // The columns the contract page's list shows (ADR-0085: the record page
      // derives the list from this relationship since @objectstack 18.3).
      relatedListColumns: ['display_name', 'title', 'kind', 'due_date', 'owner_id', 'status'],
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
      description: 'What class of commitment this is; reminders and dashboards group by it.',
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
      description: 'The date the daily check measures arrears against.',
    }),
    // `owner_id` is the platform ownership anchor, and here it is also the
    // person accountable for performing the obligation (see `sharing` above).
    // Declared (rather than left to injection) so validate resolves it, the
    // label says what it means on this object and it sits in the obligation
    // group; `system: true` keeps the injected marker, the same declaration
    // `clm_contract.owner_id` makes. No defaultValue: the security middleware
    // stamps the acting user on an insert that leaves it empty, and a system
    // write (the seed, F9) names the person explicitly.
    owner_id: Field.lookup('sys_user', {
      label: 'Owner',
      group: 'obligation',
      system: true,
      readonly: false,
      description: 'Who is accountable for performing it. Legal or a CLM administrator can hand it to someone else.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'progress',
      required: true,
      storage: { notNull: true },
      // The full table, including in_progress → overdue (decision #10, 1A), is the
      // state machine in contract.hook.ts.
      description: 'Pending moves to In Progress, Done, Waived or Overdue; In Progress to Done, Waived or Overdue; Overdue to Done or Waived. Done and Waived are final. Only the daily check sets Overdue.',
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
