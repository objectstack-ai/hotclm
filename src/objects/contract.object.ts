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
 * The five roll-ups (`version_count`, `open_deviation_count`,
 * `overdue_obligation_count`, `planned_amount`, `actual_amount`) are a sixth
 * such family: `summary` fields the ENGINE recomputes on every child insert,
 * update and delete (`ObjectQL.recomputeSummaries`, under an elevated system
 * context, which is why `readonly: true` does not lock the engine out).
 * Deliberately NOT `formula`: a formula is derived per read and cannot be
 * filtered, sorted or listed on, and the two filtered counts here exist to be
 * filtered and sorted on.
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
      description: 'Generated on insert by contract.hook.ts as <type code>-<year>-<4-digit sequence>, one sequence per type per year (DESIGN.md §13 Q5). Regenerated only if the type changes while the contract is still a draft.',
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
      description: 'The workflow this contract runs: intake fields, review, execution method and formalities (DESIGN.md §02).',
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
      description: 'Lifecycle state. Transitions and their guards are enforced by contract.hook.ts (DESIGN.md §03 状态机); expired, terminated and cancelled are terminal.',
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
      description: 'An already-executed contract entered after the fact through the F16 executed_upload action (DESIGN.md §13 Q8) — the only writer. Such a contract starts active and skipped review and approval.',
    }),
    archive_no: Field.text({
      label: 'Archive Number',
      group: 'identity',
      searchable: true,
      maxLength: 40,
      description: 'Physical or records-management archive reference, assigned at archive time (F14).',
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
    our_entity: Field.select({
      label: 'Our Signing Entity',
      group: 'parties',
      description: 'Which of our legal entities signs. The shipped list is a single placeholder — a group with several legal entities replaces it with its own (DESIGN.md §01: signing entities are configuration, not schema).',
      options: [
        { label: 'Head office', value: 'head_office', default: true },
      ],
    }),
    department: Field.select({
      label: 'Requesting Department',
      group: 'parties',
      description: 'The business unit that launched the contract. A redundant scalar on the contract because RLS cannot cross objects (DESIGN.md §04); department-level sharing is a customer overlay (§13 Q2).',
      options: [
        { label: 'Sales',        value: 'sales' },
        { label: 'Procurement',  value: 'procurement' },
        { label: 'Legal',        value: 'legal' },
        { label: 'Finance',      value: 'finance' },
        { label: 'Operations',   value: 'operations' },
        { label: 'People / HR',  value: 'people' },
        { label: 'IT',           value: 'it' },
        { label: 'Other',        value: 'other' },
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
    legal_owner: Field.user({
      label: 'Legal Owner',
      group: 'parties',
      description: 'The lawyer who accepted the review. Required before a submitted contract enters review.',
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
      scale: 2,
      min: 0,
      description: 'Total contract value in currency_code. The approval matrix bands on it (clm_approval_rule).',
    }),
    currency_code: Field.select({
      label: 'Currency',
      group: 'commercial',
      description: 'ISO 4217 code. The organization-level default is a setting, not schema; the factory default is USD (DESIGN.md §01).',
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
      description: 'Same value set as HotCRM crm_contract.payment_terms so the F15 hand-off maps 1:1.',
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
      scale: 2,
      min: 0,
      description: 'Maximum aggregate liability in currency_code. Empty means uncapped or not negotiated.',
    }),

    // ─── Term & renewal ─────────────────────────────────────────────────
    start_date: Field.date({
      label: 'Start Date',
      group: 'term',
    }),
    end_date: Field.date({
      label: 'End Date',
      group: 'term',
      description: 'The expiry job (F13) flags is_expiring renewal_notice_days before this date.',
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
      description: 'Days before end_date by which a non-renewal notice must be given.',
    }),
    renewed_from: Field.lookup('clm_contract', {
      label: 'Renewed From',
      group: 'term',
      description: 'Set by the "start renewal" action on the new draft; renewal is a new contract, not a transition (DESIGN.md §03).',
    }),
    parent_contract: Field.lookup('clm_contract', {
      label: 'Parent Contract',
      group: 'term',
      description: 'The framework agreement this order sits under, or the main contract an amendment (category: amendment) modifies.',
    }),
    is_expiring: Field.boolean({
      label: 'Expiring Soon',
      group: 'term',
      readonly: true,
      defaultValue: false,
      description: 'Stamped daily by the expiry job (F13) when end_date is within the renewal notice window.',
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
      description: 'ISO 639-1 code of the governing text.',
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
      description: 'Stamped from the contract type. Activation waits for a completed signature whose formalities_done covers every value here.',
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
      description: 'Human-written summary of the deal. The AI summary lives in ai_summary and is adopted separately.',
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
      description: 'Mirror of the approval ladder (F5) decision node; written by the flow, never by hand.',
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
    archived_at:       Field.datetime({ label: 'Archived At',       group: 'lifecycle', readonly: true }),

    // ─── AI review — written only by the "adopt suggestion" action ─────
    ai_summary: Field.richtext({
      label: 'AI Summary',
      group: 'ai',
      readonly: true,
      description: 'Adopted from an S2/S6 suggestion (DESIGN.md §07). Empty when nothing has been adopted, or when the ai capability is off.',
    }),
    ai_risk_score: Field.number({
      label: 'AI Risk Score',
      group: 'ai',
      readonly: true,
      scale: 0,
      min: 0,
      max: 100,
      description: '0 (no concern) to 100 (do not sign). Adopted from the S6 approver memo after legal review; never written directly by the model.',
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
    // `relationshipField` is declared on all five although the engine can
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
      description: 'Count of clm_contract_version rows on this contract.',
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
      description: 'Count of clm_deviation rows still open. The in_review → in_approval guard reads the children directly (a guard must not trust a cached aggregate); this is the number people list and sort on.',
      summaryOperations: {
        object: 'clm_deviation',
        relationshipField: 'contract',
        function: 'count',
        field: 'id',
        filter: { status: 'open' },
      },
    }),
    overdue_obligation_count: Field.summary({
      label: 'Overdue Obligations',
      group: 'rollup',
      readonly: true,
      scale: 0,
      min: 0,
      description: 'Count of clm_obligation rows in arrears. Moves only when the daily job (card 09) flips a child to overdue — the roll-up is recomputed by that write like any other.',
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
      description: 'Sum of clm_payment_plan.planned_amount, in the contract currency. Compare with `amount`: that is the negotiated total, this is what the schedule actually adds up to.',
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
      description: 'Sum of clm_payment_plan.actual_amount, in the contract currency — what has actually arrived against the schedule.',
      summaryOperations: {
        object: 'clm_payment_plan',
        relationshipField: 'contract',
        function: 'sum',
        field: 'actual_amount',
      },
    }),
  },

  indexes: [
    { fields: ['contract_number'], unique: 'organization' },
  ],

  enable: {
    apiEnabled: true,
    searchable: true,
    files: true,
  },
});
