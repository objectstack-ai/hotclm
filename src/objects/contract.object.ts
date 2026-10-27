import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';

/**
 * The contract — legal state only (DESIGN.md §01: commercial terms are the
 * CRM's `crm_contract`, legal state is ours). One record from intake to
 * archive; the `status` state machine in `contract.hook.ts` is the write-layer
 * truth, never a UI convention (DESIGN.md §03 状态机).
 *
 * Three families of fields are `readonly` on purpose, each with exactly one
 * writer that is NOT the form:
 *   - type-derived stamps (`contract_number`, `category`, `direction`,
 *     `execution_formalities`) — `contract.hook.ts`, on insert and when the
 *     type changes (DESIGN.md §13 Q5: the number is `<type.code>-<YYYY>-<0000>`,
 *     which `autonumber` cannot express);
 *   - stage timestamps and routing flags (`submitted_at` … `closed_at`,
 *     `route_*`, `approval_status`, `is_expiring`, `executed_at`,
 *     `archived_at`) — the state machine and the F2/F5/F9–F14 flows;
 *   - the four `ai_*` fields — the "adopt suggestion" action only (DESIGN.md
 *     §07: AI proposes, a person adopts, the field is written on adoption);
 *   - `is_backfilled` — the F16 `executed_upload` action only (§13 Q8).
 *
 * The eight roll-ups (`version_count`, `open_deviation_count`,
 * `approved_legal_review_count`, `current_clean_version_count`,
 * `final_signed_version_count`, `overdue_obligation_count`,
 * `planned_amount`, `actual_amount`) are a sixth
 * such family: `summary` fields the ENGINE recomputes on every child insert,
 * update and delete (`ObjectQL.recomputeSummaries`, under an elevated system
 * context, which is why `readonly: true` does not lock the engine out).
 * Deliberately NOT `formula`: a formula is derived per read and cannot be
 * filtered, sorted or listed on; `open_deviation_count` and
 * `overdue_obligation_count` exist to be filtered and sorted on, and the
 * three precondition counts are read by the header actions' `disabled`
 * predicates (contract-lifecycle.actions.ts).
 */
export const Contract = ObjectSchema.create({
  name: 'clm_contract',
  label: 'Contract',
  pluralLabel: 'Contracts',
  icon: 'file-signature',
  description: 'A contract from intake to archive: parties, commercial and legal terms, lifecycle status and the stamps each stage leaves.',

  // Legal documents are owner-only by default; legal, finance and management
  // reach them through positions and sharing rules (DESIGN.md §04, card 04).
  sharingModel: 'private',
  nameField: 'title',
  highlightFields: ['contract_number', 'title', 'party', 'status', 'amount', 'end_date'],

  fieldGroups: [
    { key: 'identity',   label: 'Contract',            icon: 'file-signature' },
    { key: 'parties',    label: 'Parties & Owners',    icon: 'users' },
    { key: 'commercial', label: 'Commercial Terms',    icon: 'dollar-sign' },
    { key: 'term',       label: 'Term & Renewal',      icon: 'calendar' },
    { key: 'legal',      label: 'Legal',               icon: 'scale' },
    { key: 'routing',    label: 'Routing & Approval',  icon: 'route',    defaultExpanded: false },
    { key: 'lifecycle',  label: 'Lifecycle',           icon: 'history',  defaultExpanded: false },
    { key: 'ai',         label: 'AI Review',           icon: 'sparkles', defaultExpanded: false },
    { key: 'rollup',     label: 'Roll-ups',            icon: 'sigma',    defaultExpanded: false },
  ],

  fields: {
    // ─── Identity ───────────────────────────────────────────────────────
    contract_number: Field.text({
      label: 'Contract Number',
      group: 'identity',
      readonly: true,
      searchable: true,
      maxLength: 32,
      description: 'Generated when the contract is created: the type code, the year and a four-digit sequence (e.g. NDA-2026-0001), one sequence per type per year. Regenerated only if the type changes while the contract is still a draft.',
    }),
    title: Field.text({
      label: 'Title',
      group: 'identity',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 200,
    }),
    contract_type: Field.lookup('clm_contract_type', {
      label: 'Contract Type',
      group: 'identity',
      required: true,
      storage: { notNull: true },
      // Inactive types are hidden from the picker; existing contracts keep
      // them (clm_contract_type.is_active).
      lookupFilters: [{ field: 'is_active', operator: 'eq', value: true }],
      // The type IS the workflow definition (DESIGN.md §02).
      description: 'The workflow this contract runs: intake fields, review, execution method and formalities.',
    }),
    category: Field.select({
      label: 'Category',
      group: 'identity',
      readonly: true,
      description: 'Stamped from the contract type; drives the approval matrix and the clause playbook.',
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
        { label: 'Other',                value: 'other' },
      ],
    }),
    direction: Field.select({
      label: 'Direction',
      group: 'identity',
      readonly: true,
      description: 'Stamped from the contract type.',
      options: [
        { label: 'Sales',    value: 'sales',    color: '#0B6E63' },
        { label: 'Purchase', value: 'purchase', color: '#3B82F6' },
        { label: 'Other',    value: 'other',    color: '#94A3B8' },
      ],
    }),
    status: Field.select({
      label: 'Status',
      group: 'identity',
      required: true,
      storage: { notNull: true },
      // Transitions and their guards: the state machine in contract.hook.ts
      // (DESIGN.md §03 状态机), on every write path.
      description: 'Where the contract is in its lifecycle. Status changes follow fixed rules; Expired, Terminated and Cancelled are final.',
      options: [
        { label: 'Draft',       value: 'draft',       color: '#94A3B8', default: true },
        { label: 'Submitted',   value: 'submitted',   color: '#3B82F6' },
        { label: 'In Review',   value: 'in_review',   color: '#F59E0B' },
        { label: 'In Approval', value: 'in_approval', color: '#8B5CF6' },
        { label: 'Approved',    value: 'approved',    color: '#0B6E63' },
        { label: 'Rejected',    value: 'rejected',    color: '#EF4444' },
        { label: 'Signing',     value: 'signing',     color: '#0EA5E9' },
        { label: 'Active',      value: 'active',      color: '#2F7D5B' },
        { label: 'Expired',     value: 'expired',     color: '#64748B' },
        { label: 'Terminated',  value: 'terminated',  color: '#7C2D12' },
        { label: 'Cancelled',   value: 'cancelled',   color: '#475569' },
      ],
    }),
    risk_level: Field.select({
      label: 'Risk Level',
      group: 'identity',
      description: 'Assessed by legal during review; empty until assessed.',
      options: [
        { label: 'Low',    value: 'low',    color: '#94A3B8' },
        { label: 'Medium', value: 'medium', color: '#F59E0B' },
        { label: 'High',   value: 'high',   color: '#EF4444' },
      ],
    }),
    is_backfilled: Field.boolean({
      label: 'Backfilled',
      group: 'identity',
      readonly: true,
      defaultValue: false,
      // Only writer: the F16 executed_upload action (DESIGN.md §13 Q8).
      description: 'An already-signed contract recorded after the fact with Backfill Executed Contract. It starts active, without review or approval.',
    }),
    archive_no: Field.text({
      label: 'Archive Number',
      group: 'identity',
      searchable: true,
      maxLength: 40,
      // Assigned by the archive step (DESIGN.md §06 F14).
      description: 'Physical or records-management archive reference, assigned at archive time.',
    }),

    // ─── Parties & owners ───────────────────────────────────────────────
    party: Field.lookup('clm_party', {
      label: 'Counterparty',
      group: 'parties',
      required: true,
      storage: { notNull: true },
      // The picker hides blocked parties; the state machine refuses submission
      // with one regardless (the picker is convenience, the hook is the rule).
      lookupFilters: [{ field: 'risk_flag', operator: 'ne', value: 'blocked' }],
    }),
    // DESIGN.md §01: signing entities are data, not schema. They are the
    // platform's own organisation records — `sys_business_unit` rows of kind
    // `company` (#20, ruling C) — so a group adds an entity by adding a row in
    // Setup → Business Units, and the demo seeds its three (src/data/).
    // The field keeps its name: `business_unit` is a platform reserved word.
    our_entity: Field.lookup('sys_business_unit', {
      label: 'Our Signing Entity',
      group: 'parties',
      required: true,
      storage: { notNull: true },
      description: 'Which of our legal entities signs. The choices are the company-kind business units in Setup → Business Units.',
      // The picker offers legal entities only, never a division, department,
      // office or cost centre, and only those still active. The picker is
      // convenience; the rule is `contract_entity_is_active_company` below,
      // which refuses the same choice on every write path.
      lookupFilters: [
        { field: 'kind', operator: 'eq', value: 'company' },
        { field: 'active', operator: 'eq', value: true },
      ],
    }),
    // Departments are organisation structure, so they are data too: the
    // platform's `sys_business_unit` rows of kind `department` (#109, under
    // #20's ruling C), maintained in Setup → Business Units next to the
    // signing entities. The field keeps its name: `business_unit` is a
    // platform reserved word.
    //
    // Still a redundant scalar on the contract, because RLS cannot cross
    // objects (DESIGN.md §04); department-level sharing is a customer overlay
    // (§13 Q2). It now stores the unit's id rather than an option value.
    //
    // Optional, as it always was. A fresh install has no department until an
    // admin adds one, and a contract must not wait for the org chart to be
    // written; a backfilled or renewed contract may have none either.
    // `storage.notNull` is therefore absent on purpose.
    department: Field.lookup('sys_business_unit', {
      label: 'Requesting Department',
      group: 'parties',
      description: 'The department that launched the contract. The choices are the department-kind business units in Setup → Business Units. Sharing contracts by department is a customer-specific extension, not part of the standard product.',
      // The picker offers active departments only, never a company, division,
      // office or cost centre. The picker is convenience; the rule on kind is
      // `contract_department_is_department` below, which refuses a unit of
      // another kind on every write path that sets or changes the department
      // (#129). An id that names no unit is refused by the engine
      // (`reference_not_found`). Unlike `our_entity`'s rule it does not judge
      // `active`: a department retired since must not block the renewal that
      // copies it, so only the picker hides retired units.
      lookupFilters: [
        { field: 'kind', operator: 'eq', value: 'department' },
        { field: 'active', operator: 'eq', value: true },
      ],
    }),
    // `owner_id` is the platform ownership anchor — the one column the private
    // OWD, sharing rules and owner-scope widening read. Declared (rather than
    // left to injection) so validate resolves it, the label survives and it
    // can be grouped; `system: true` keeps the injected marker the clone path
    // reads. No defaultValue: the security middleware stamps the acting user
    // on any insert that leaves it empty (the HotCRM account.object.ts note).
    owner_id: Field.lookup('sys_user', {
      label: 'Business Owner',
      group: 'parties',
      system: true,
      readonly: false,
      description: 'The requester who owns the contract on the business side.',
    }),
    // `legal_owner` is the contract's custodian in legal for its whole life,
    // not only the lawyer of one review (#53, ruled B). F2 assigns it on
    // submission for a type that needs legal review, and the state machine
    // still refuses `submitted -> in_review` without it. F16's backfill does
    // NOT assign one, and `clm_records` cannot write it (`editableOnly` locks
    // every contract field but `status` and `archive_no`): on a backfilled
    // contract it is set by legal (or an admin) editing the record -- hence
    // "legal names" in the help text, not "records assigns".
    legal_owner: Field.user({
      label: 'Legal Owner',
      group: 'parties',
      description: 'The lawyer in legal who owns this contract\'s file. Usually assigned when the contract enters legal review; a backfilled contract skips review, so legal names its lawyer here directly.',
    }),
    current_turn: Field.select({
      label: 'Ball In Court',
      group: 'parties',
      description: 'Whose move it is during negotiation.',
      options: [
        { label: 'None',         value: 'none',         color: '#94A3B8', default: true },
        { label: 'Internal',     value: 'internal',     color: '#3B82F6' },
        { label: 'Counterparty', value: 'counterparty', color: '#F59E0B' },
      ],
    }),
    turn_since: Field.datetime({
      label: 'Turn Since',
      group: 'parties',
    }),

    // ─── Commercial terms ───────────────────────────────────────────────
    amount: Field.currency({
      label: 'Contract Amount',
      group: 'commercial',
      min: 0,
      // In currency_code; the clm_approval_rule amount bands read it.
      description: 'Total contract value, in the contract currency. The approval matrix bands on it.',
    }),
    currency_code: Field.select({
      label: 'Currency',
      group: 'commercial',
      // DESIGN.md §01: the organization-level default is a setting, not schema.
      description: 'ISO 4217 code. The organization\'s default currency is a setting; out of the box it is USD.',
      options: [
        { label: 'USD — US Dollar',        value: 'usd', default: true },
        { label: 'EUR — Euro',             value: 'eur' },
        { label: 'GBP — Pound Sterling',   value: 'gbp' },
        { label: 'CNY — Renminbi',         value: 'cny' },
        { label: 'JPY — Japanese Yen',     value: 'jpy' },
      ],
    }),
    is_amount_estimated: Field.boolean({
      label: 'Amount Is Estimated',
      group: 'commercial',
      defaultValue: false,
      description: 'On for framework agreements and rate cards whose value is a forecast, not a commitment.',
    }),
    payment_terms: Field.select({
      label: 'Payment Terms',
      group: 'commercial',
      // Same value set as HotCRM crm_contract.payment_terms so the F15 hand-off
      // maps 1:1.
      description: 'The same values HotCRM uses for payment terms, so the two match one to one when a contract is handed over.',
      options: [
        { label: 'Net 15',         value: 'net_15' },
        { label: 'Net 30',         value: 'net_30' },
        { label: 'Net 60',         value: 'net_60' },
        { label: 'Net 90',         value: 'net_90' },
        { label: 'Due on Receipt', value: 'due_on_receipt' },
      ],
    }),
    liability_cap: Field.currency({
      label: 'Liability Cap',
      group: 'commercial',
      min: 0,
      description: 'Maximum aggregate liability, in the contract currency. Empty means uncapped or not negotiated.',
    }),

    // ─── Term & renewal ─────────────────────────────────────────────────
    start_date: Field.date({
      label: 'Start Date',
      group: 'term',
    }),
    end_date: Field.date({
      label: 'End Date',
      group: 'term',
      // F12 renewal_notice (renewal-notice.flow.ts) flags is_expiring
      // renewal_notice_days before this date.
      description: 'The contract is flagged Expiring Soon once this date is within its renewal notice period.',
    }),
    term_months: Field.number({
      label: 'Term (months)',
      group: 'term',
      scale: 0,
      min: 0,
      max: 600,
    }),
    auto_renew: Field.boolean({
      label: 'Auto-renews',
      group: 'term',
      defaultValue: false,
    }),
    renewal_notice_days: Field.number({
      label: 'Renewal Notice (days)',
      group: 'term',
      scale: 0,
      min: 0,
      max: 365,
      description: 'Days before the end date by which a non-renewal notice must be given.',
    }),
    renewed_from: Field.lookup('clm_contract', {
      label: 'Renewed From',
      group: 'term',
      // Written by the start_renewal flow; DESIGN.md §03: renewal is a new
      // contract, not a transition.
      description: 'Set by Start Renewal on the new draft. A renewal is a new contract, not a status change.',
    }),
    parent_contract: Field.lookup('clm_contract', {
      label: 'Parent Contract',
      group: 'term',
      description: 'The framework agreement this order sits under, or the main contract an amendment modifies.',
    }),
    is_expiring: Field.boolean({
      label: 'Expiring Soon',
      group: 'term',
      readonly: true,
      defaultValue: false,
      // Stamped by F12 renewal_notice — see end_date above.
      description: 'Set by the daily check once the end date is within the renewal notice period.',
    }),

    // ─── Legal ──────────────────────────────────────────────────────────
    governing_law: Field.text({
      label: 'Governing Law',
      group: 'legal',
      maxLength: 80,
      description: 'ISO country or state, e.g. US-NY, DE, England and Wales.',
    }),
    jurisdiction: Field.text({
      label: 'Jurisdiction',
      group: 'legal',
      maxLength: 120,
      description: 'Courts or arbitral seat with jurisdiction over disputes.',
    }),
    contract_language: Field.select({
      label: 'Contract Language',
      group: 'legal',
      // Option values are ISO 639-1 codes.
      description: 'The language whose text governs the contract.',
      options: [
        { label: 'English',  value: 'en', default: true },
        { label: 'Chinese',  value: 'zh' },
        { label: 'Japanese', value: 'ja' },
        { label: 'German',   value: 'de' },
        { label: 'French',   value: 'fr' },
        { label: 'Spanish',  value: 'es' },
      ],
    }),
    confidentiality_term_months: Field.number({
      label: 'Confidentiality Term (months)',
      group: 'legal',
      scale: 0,
      min: 0,
      max: 600,
      description: 'How long confidentiality obligations survive. Empty means not negotiated.',
    }),
    execution_formalities: Field.select({
      label: 'Execution Formalities',
      group: 'legal',
      multiple: true,
      readonly: true,
      description: 'Stamped from the contract type. Activation waits for a completed signing round whose Formalities Done covers every value here.',
      options: [
        { label: 'Countersigned copy returned', value: 'countersigned_copy' },
        { label: 'Company seal',                value: 'company_seal' },
        { label: 'Notarized',                   value: 'notarized' },
        { label: 'Witnessed',                   value: 'witnessed' },
      ],
    }),
    summary: Field.richtext({
      label: 'Summary',
      group: 'legal',
      description: 'Human-written summary of the deal. The AI summary is kept in its own field and adopted separately.',
    }),

    // ─── Routing & approval — stamped by F2 (route) and F5 (ladder) ────
    route_legal_head: Field.boolean({ label: 'Routes: Head of Legal',      group: 'routing', readonly: true, defaultValue: false }),
    route_finance:    Field.boolean({ label: 'Routes: Finance Controller', group: 'routing', readonly: true, defaultValue: false }),
    route_executive:  Field.boolean({ label: 'Routes: Executive',          group: 'routing', readonly: true, defaultValue: false }),
    route_gm:         Field.boolean({ label: 'Routes: General Manager',    group: 'routing', readonly: true, defaultValue: false }),
    approval_status: Field.select({
      label: 'Approval Status',
      group: 'routing',
      readonly: true,
      // Mirror of the F5 approval ladder's decision node (contract-approval.flow.ts).
      description: 'The outcome of the approval process. Set by the approval flow; do not edit it by hand.',
      options: [
        { label: 'Not Required', value: 'not_required', color: '#94A3B8', default: true },
        { label: 'Pending',      value: 'pending',      color: '#F59E0B' },
        { label: 'Approved',     value: 'approved',     color: '#2F7D5B' },
        { label: 'Rejected',     value: 'rejected',     color: '#EF4444' },
      ],
    }),

    // ─── Lifecycle stamps — written on entry to each stage ─────────────
    submitted_at:      Field.datetime({ label: 'Submitted At',      group: 'lifecycle', readonly: true }),
    review_started_at: Field.datetime({ label: 'Review Started At', group: 'lifecycle', readonly: true }),
    approved_at:       Field.datetime({ label: 'Approved At',       group: 'lifecycle', readonly: true }),
    signed_at:         Field.datetime({ label: 'Signed At',         group: 'lifecycle', readonly: true }),
    executed_at: Field.datetime({
      label: 'Executed At',
      group: 'lifecycle',
      readonly: true,
      description: 'When execution completed — the signature round was completed and its formalities were done.',
    }),
    activated_at:      Field.datetime({ label: 'Activated At',      group: 'lifecycle', readonly: true }),
    closed_at: Field.datetime({
      label: 'Closed At',
      group: 'lifecycle',
      readonly: true,
      description: 'Stamped on termination.',
    }),
    // DESIGN.md §03's `active → terminated` guard is "closed_at 与终止原因必填",
    // and the field list had no reason field to satisfy the second half —
    // decision #6, ruled A on 2026-09-09: declare it, textarea, required at
    // termination and nowhere else.
    //
    // Two enforcers, on purpose, and they are not redundant:
    //
    //  - `requiredWhen` is the ENGINE's transition gate (ADR-0113): the write
    //    that flips `status` to `terminated` while this cell is empty is
    //    refused by `evaluateValidationRules`, on every write path including
    //    a bare REST PATCH. It is also what the Console form reads, so the
    //    cell turns required exactly when the reason is being asked for.
    //  - `contract.hook.ts`'s state machine refuses the same edge with the
    //    machine's own `INVALID_STATE` envelope and a sentence naming the
    //    transition. AGENTS.md is explicit that a §03 guard lives in the
    //    hook, not only in a declaration a form happens to read.
    //
    // NO `storage.notNull`: the column must stay nullable — every contract
    // that is not terminated has no reason, and ADR-0113 rejects the pair
    // outright ("a conditional contract cannot be an unconditional column
    // constraint").
    //
    // It is NOT on any type's `intake_fields`, which is what keeps it off the
    // launch form (F1 renders exactly that list): the question is asked once,
    // at termination, by the Terminate action's param dialog.
    termination_reason: Field.textarea({
      label: 'Termination Reason',
      group: 'lifecycle',
      requiredWhen: P`record.status == "terminated"`,
      maxLength: 2000,
      description: 'Why the contract was ended before its term ran out. Required to terminate; asked once, by the Terminate action, and never on the intake form.',
    }),
    archived_at:       Field.datetime({ label: 'Archived At',       group: 'lifecycle', readonly: true }),

    // ─── AI review — written only by the "adopt suggestion" action ─────
    ai_summary: Field.richtext({
      label: 'AI Summary',
      group: 'ai',
      readonly: true,
      // Adopted from an S2/S6 suggestion (DESIGN.md §07); empty while the ai
      // capability is off.
      description: 'Adopted from an AI suggestion. Empty when nothing has been adopted, or when AI is turned off.',
    }),
    ai_risk_score: Field.number({
      label: 'AI Risk Score',
      group: 'ai',
      readonly: true,
      scale: 0,
      min: 0,
      max: 100,
      // Adopted from the S6 approver memo (DESIGN.md §07).
      description: '0 (no concern) to 100 (do not sign). Adopted from the AI approver memo after legal review; never written directly by the AI.',
    }),
    ai_risk_rationale: Field.textarea({
      label: 'AI Risk Rationale',
      group: 'ai',
      readonly: true,
    }),
    ai_reviewed_at: Field.datetime({
      label: 'AI Reviewed At',
      group: 'ai',
      readonly: true,
    }),

    // ─── Roll-ups — recomputed by the engine on every child write ──────
    //
    // `relationshipField` is declared on every one although the engine can
    // infer it: inference takes the FIRST lookup/master_detail field on the
    // child that points back here, so it is order-dependent on a key nothing
    // else about the child pins. Naming it makes the roll-up survive a field
    // being re-ordered or a second reference to `clm_contract` being added.
    //
    // None of them declares `max`. On an authored number a bound is a
    // guardrail; on a derived one it is a trap — `min`/`max` are checked on
    // the written value, so a count that outgrew its ceiling would have the
    // engine's own recompute write refused, and the roll-up would then sit
    // silently stale (the recompute failure is logged, not raised) while
    // every child write kept reporting success.
    version_count: Field.summary({
      label: 'Versions',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      description: 'How many document versions this contract has.',
      summaryOperations: {
        object: 'clm_contract_version',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
      },
    }),
    open_deviation_count: Field.summary({
      label: 'Open Deviations',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      // The in_review → in_approval guard in contract.hook.ts reads the children
      // directly: a guard must not trust a cached aggregate.
      description: 'How many clause deviations are still open. Used for listing and sorting; sending for approval checks the deviations themselves, not this number.',
      summaryOperations: {
        object: 'clm_deviation',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { status: 'open' },
      },
    }),
    // The three below exist so the header can grey out a transition whose
    // precondition is unmet (issue #169). Each is the hook guard's own count,
    // with the same child filter, rolled up onto the contract where an action's
    // `disabled` predicate can read it. Like `open_deviation_count` they are a
    // convenience and not a control: the guards in contract.hook.ts read the
    // children directly and keep refusing whatever this number says.
    approved_legal_review_count: Field.summary({
      label: 'Approved Legal Reviews',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      description: 'How many legal-stage reviews are approved. Sending for approval needs at least one; the check itself reads the reviews, not this number.',
      summaryOperations: {
        object: 'clm_review',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { stage: 'legal', decision: 'approved' },
      },
    }),
    current_clean_version_count: Field.summary({
      label: 'Current Clean Versions',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      // `is_current` moves between versions through contract-version.hook.ts,
      // which writes through the engine: the version losing the flag is a child
      // update, so this count is recomputed on that write too.
      description: 'Whether the current version is a clean copy (1) or not (0). Starting signing needs one; the check itself reads the versions, not this number.',
      summaryOperations: {
        object: 'clm_contract_version',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { kind: 'clean', is_current: true },
      },
    }),
    final_signed_version_count: Field.summary({
      label: 'Final Signed Versions',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      description: 'How many final signed versions are filed. Activation needs at least one; the check itself reads the versions, not this number.',
      summaryOperations: {
        object: 'clm_contract_version',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { kind: 'final_signed' },
      },
    }),
    overdue_obligation_count: Field.summary({
      label: 'Overdue Obligations',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      // Only the daily job (card 09, obligation-due.flow.ts) writes overdue; the
      // roll-up is recomputed by that write like any other.
      description: 'How many obligations are overdue. Only the daily check marks an obligation overdue.',
      summaryOperations: {
        object: 'clm_obligation',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { status: 'overdue' },
      },
    }),
    planned_amount: Field.summary({
      label: 'Planned Amount',
      group: 'rollup',
      readonly: true,
      scale: 2,
      min: 0,
      description: 'Total planned amount of the payment schedule, in the contract currency. Compare it with Contract Amount: that is the negotiated total, this is what the schedule actually adds up to.',
      summaryOperations: {
        object: 'clm_payment_plan',
        relationshipField: 'contract',
        function: 'sum',
        field: 'planned_amount',
      },
    }),
    actual_amount: Field.summary({
      label: 'Actual Amount',
      group: 'rollup',
      readonly: true,
      scale: 2,
      min: 0,
      description: 'Total actual amount of the payment schedule, in the contract currency — what has actually arrived against the schedule.',
      summaryOperations: {
        object: 'clm_payment_plan',
        relationshipField: 'contract',
        function: 'sum',
        field: 'actual_amount',
      },
    }),
  },

  validations: [
    // `our_entity`'s lookupFilters shape the picker and nothing else: a REST
    // PATCH, an import or a flow's create_record wrote a department, or a
    // retired company, as the signing entity without complaint (#119). This
    // rule is the write-side half, the same split `party` has with its
    // blocked-counterparty guard.
    //
    // A rule rather than a hook, for two measured reasons on 18.1.0:
    //  - a rule's condition reads ONE hop through a reference field
    //    (`record.our_entity.kind`); the engine batch-reads the named columns
    //    of `sys_business_unit` for the write, on insert, single-row update
    //    and multi-row update alike, and an unreadable or missing unit refuses
    //    the write rather than passing it;
    //  - a rule's message is translated per locale
    //    (`_validations.contract_entity_is_active_company.message` in both
    //    bundles). A message thrown from a hook reaches the caller in English
    //    only.
    //
    // A TRANSITION check, not an invariant, which is why it is a
    // `conditional`: `when` admits only writes that SET the entity (an insert,
    // where `previous` is null, or an update naming a different unit), and the
    // hop is read only inside `then`. A contract that already names a company
    // retired since stays editable on every other field; re-sending the same
    // entity with a form save is not a change; and a row whose unit can no
    // longer be read at all (a pre-#118 database still holding the old
    // `head_office` string) is not frozen by an unchanged entity either, which
    // a single rule reading the hop on every write would do. The two halves
    // are separate expressions for a second reason: a rule may not read a
    // reference both through the hop and as a bare value.
    //
    // The refusal is `then`'s, so `then`'s message is the one a caller sees
    // and the one both bundles translate. The outer rule's `message` is
    // required by the schema and never surfaced: the engine returns the
    // branch's violation, not the conditional's.
    {
      type: 'conditional' as const,
      name: 'contract_entity_set',
      label: 'Signing entity set or changed',
      description: 'Judges our_entity only on a write that sets or changes it; an unchanged entity is never re-judged.',
      when: P`previous == null || previous.our_entity != record.our_entity`,
      message: 'Our Signing Entity must be one of our active legal entities.',
      then: {
        type: 'cross_field' as const,
        name: 'contract_entity_is_active_company',
        label: 'Signing entity is an active company',
        description: 'A write that sets our_entity must name an active company-kind business unit.',
        condition: P`record.our_entity.kind != "company" || record.our_entity.active != true`,
        fields: ['our_entity'],
        message: 'Our Signing Entity must be one of our active legal entities: a business unit of kind Company that is still active. A department, an office or a retired company cannot sign. Choose an entity from the list, or ask an administrator to add or reactivate it in Setup → Business Units.',
      },
    },
    // `department`'s lookupFilters likewise shape the picker only: a REST
    // PATCH, an import or a headless `launch_contract` stored a company or an
    // office as the requesting department (#129). The same rule shape as
    // `contract_entity_set` above, for the same reasons, with two differences:
    //
    //  - `department` is optional, so `when` also requires a value. An empty
    //    department is a valid answer, and a hop through an empty reference
    //    has no row to read: the engine refuses that write as unevaluable
    //    rather than passing it, so the guard must sit in `when`, outside the
    //    hop. Empty means `null` or `""`: the engine stores a REST write of
    //    `""` as given (measured on 18.1.0), and without the second half that
    //    write was refused "could not be evaluated".
    //  - it judges `kind` only, never `active`. The department is a reporting
    //    field, and F12 / F13 renewals insert a new contract that copies it;
    //    judging `active` would refuse the renewal of every contract whose
    //    department has been retired since. The picker already hides retired
    //    units for a person choosing one.
    {
      type: 'conditional' as const,
      name: 'contract_department_set',
      label: 'Requesting department set or changed',
      description: 'Judges department only on a write that sets or changes it to a unit; an empty or unchanged department is never judged.',
      when: P`record.department != null && record.department != "" && (previous == null || previous.department != record.department)`,
      message: 'Requesting Department must be a department.',
      then: {
        type: 'cross_field' as const,
        name: 'contract_department_is_department',
        label: 'Requesting department is a department',
        description: 'A write that sets department must name a department-kind business unit.',
        condition: P`record.department.kind != "department"`,
        fields: ['department'],
        message: 'Requesting Department must be a department: a business unit of kind Department. A company, a division, an office or a cost centre cannot be the requesting department. Choose a department from the list, leave the field empty, or ask an administrator to add the department in Setup → Business Units.',
      },
    },
  ],

  indexes: [
    { fields: ['contract_number'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
    // The contract page's Approvals tab (DESIGN.md §05, 审批记录): whoever can
    // read a contract sees its approval requests and their full history,
    // read-only. The platform answers it on a read that names the contract;
    // no approval action is offered and the inbox is not widened. Default off
    // (participants only). The object grant it filters is `clm_requester`'s.
    approvalsVisibleToReaders: true,
  },

  // No generic "New" for a contract, for anyone (#136). A contract is born
  // through one of three doors: Launch Contract (F1, the intake wizard that
  // also files version 1 and routes it), Start Renewal (F12) and Backfill
  // Executed Contract (F16) — DESIGN.md §06. The platform's raw create form
  // (the list header's New, the Renewals related list's New, a lookup's
  // "Create new") skips everything F1 does and offers status and legal-owned
  // fields the server then refuses, so it is switched off here. Legal and the
  // CLM admin launch through the wizard too; F16 is the backfill door.
  //
  // No CSV import either, for anyone (#148), for the same reason: the list
  // header's Import is a bulk write door that skips F1 just as New does, and
  // the contract hook would only let it produce version-less drafts. Contracts
  // come in through F1, F12 and F16. An existing register of signed contracts
  // comes in through F16, or through a seed or migration an administrator runs.
  //
  // This is the UI affordance only. The data API and the permission matrix
  // (DESIGN.md §04: requester and legal hold C on clm_contract) are unchanged,
  // which is also what the three doors write through.
  userActions: {
    create: false,
    import: false,
  },
});
