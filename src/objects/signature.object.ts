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
 * from draft) enforced in `contract.hook.ts`; which status a round may be
 * CREATED in is the `signature_initial_status` rule below. `display_name` is a stored
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
      description: 'Filled in automatically as "method · status".',
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
      // Regional packs append their own options (DESIGN.md §13 Q7).
      description: 'E-signature provider the envelope was sent through. Regional add-ons can add their own providers.',
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
      // Written and read by the e-signature dispatch and callback (DESIGN.md §06 F8).
      // That consumer is scheduled, not built: hotclm#83 (card 12, F8) on the
      // platform e-signature connector objectstack-ai/objectstack#25747. Kept
      // as declared on that schedule (issue #38, ruling group 1).
      description: 'The provider\'s envelope or agreement id, for status checks and audit.',
    }),
    signers: Field.json({
      label: 'Signers',
      group: 'round',
      // Seeded today; its consumer (the F8 dispatch that posts the signers with
      // the clean version, and the callback that writes each signer's status
      // back) is scheduled on hotclm#83 with objectstack-ai/objectstack#25747
      // (issue #38, ruling group 1).
      //
      // Row shape, for that consumer: `[{ side: our | counterparty, name,
      // email, order, status, signed_at }]`, one row per signer in signing
      // order (DESIGN.md §03).
      //
      // Not typed by hand (hotclm#138): on 18.1.0 a `json` field renders as a
      // raw JSON text box, and the platform's row editor belongs to the
      // `repeater` type, not to `json` (§03 declares this column `json`). So
      // it is `readonly` — the e-signature connector writes it. Measured on
      // 18.1.0: the create and edit forms then draw no signers control at
      // all, and the record page shows the stored rows as read-only text. A
      // field `visibleWhen` (method == esign) was tried and is not honoured on
      // the record page — a wet-ink round still drew the row — so it is not
      // declared.
      readonly: true,
      description: 'Who signs this round, on our side and the counterparty\'s, and in which order. Filled in by the e-signature service.',
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
      // Same value set as clm_contract_type.execution_formalities.
      description: 'Same values as the contract type\'s execution formalities. Activation waits until every formality the type requires is ticked here on a completed round.',
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
      // Stamped by `signature_state_machine` (contract.hook.ts) on create and
      // on update; an explicit value is kept.
      description: 'Filled in automatically when the round is saved as completed. For a wet-ink round signed earlier, enter the actual signing time instead.',
    }),
  },

  validations: [
    // The machine's ENTRY POINT (#147): which status a round may be created
    // in. Before this rule the insert path judged nothing, so a REST POST, a
    // `/api/v1/batch` create or an import could create a round already
    // declined or voided.
    //
    // The entry set is `draft`, plus the two statuses one edge out of draft
    // that a creating caller legitimately records in the same write:
    //  - `sent`: the e-signature dispatch (F8, hotclm#83 on the platform
    //    connector objectstack-ai/objectstack#25747) registers the round as it
    //    sends the envelope; a wet-ink counterpart sealed and posted is the
    //    same state (the demo seeds both).
    //  - `completed`: the wet-ink round a lawyer registers from the contract's
    //    signing tab, executed copy attached (§03: 湿签直接 completed). That it
    //    is wet ink is the hook's half — see `signature_state_machine`.
    // `declined` and `voided` are outcomes of a round that existed; a round is
    // never born in one. `draft → voided` stays an update edge (abandoning a
    // draft), and an insert has nothing to abandon.
    //
    // A declarative `state_machine` rule rather than the hook's insert leg,
    // measured on 18.1.0:
    //  - its message is translated per locale (`_validations` in both
    //    bundles); an Error thrown from a hook reaches every caller in English;
    //  - the engine skips a `state_machine` rule — and only that rule type — on
    //    seed replay and on a historical import (`treatAsHistorical`, system
    //    principal only), the platform's own exemption for established facts.
    //    The demo seed creates 24 rounds as e-signature `completed`, which no
    //    person may.
    //
    // `events: ['insert']`: this rule judges creation only. The update leg is
    // the hook's, because one edge depends on the method (an e-signature round
    // completes from `sent`, not from `draft`), which a `state_machine` rule
    // cannot express. `transitions` is that hook's table, verbatim — the
    // schema requires the key, and the platform's state introspection
    // (`GET /api/v1/meta/object/clm_signature/state/status?from=…`) answers
    // from it. Change one, change both.
    {
      type: 'state_machine' as const,
      name: 'signature_initial_status',
      label: 'Signature round entry status',
      description: 'A round is created as draft, sent, or (wet ink) completed; never declined or voided.',
      field: 'status',
      events: ['insert' as const],
      initialStates: ['draft', 'sent', 'completed'],
      transitions: {
        draft:     ['sent', 'completed', 'voided'],
        sent:      ['completed', 'declined', 'voided'],
        declined:  ['draft'],
        completed: [],
        voided:    [],
      },
      message: 'A signature round is created as Draft or Sent, or as Completed for a wet-ink round that is already signed. Declined and Voided record what happened to a round that was sent: create the round first, then change its status.',
    },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
