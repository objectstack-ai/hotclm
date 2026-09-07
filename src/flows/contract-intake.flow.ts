import { P } from '@objectstack/spec';
import type { Flow } from '@objectstack/spec/automation';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';

/**
 * F1 `contract_intake` — the launch form (DESIGN.md §06 F1, §02 Launch Form,
 * §05 表 3): one screen flow that creates a `clm_contract` draft and its first
 * version, and optionally submits it into F2's routing.
 *
 * ## Shape, and why it is this shape
 *
 * Measured on the pinned @objectstack 17.3.0 packages — the console's screen
 * runner (`@objectstack/console` `RecordDetailView` chunk) and
 * `service-automation`'s screen executor — rather than assumed:
 *
 *  - A flat screen renders text / number / currency / date / email / textarea
 *    / boolean, and a select when `options` are declared. It has NO record
 *    picker and NO file input: a `lookup`-typed field falls through to a plain
 *    text box. So the two pickers the intake needs — the contract type and the
 *    counterparty — are collected by the `launch_contract` ACTION's param
 *    dialog (`src/actions/contract.actions.ts`), whose field-backed lookup
 *    params render the real pickers and inherit the fields' `lookupFilters`
 *    (active types only; blocked parties hidden). The flow receives them as
 *    the input variables `contract_type` and `party`.
 *  - A screen field's `visibleWhen` is bare CEL the CLIENT evaluates against
 *    the screen's OWN field values only — flow variables are not in scope
 *    there (the server re-checks `required` under it with the run's variables
 *    layered in, which is why an unevaluable predicate renders visible). To
 *    make the type's `intake_fields` drive the conditional fields, the list is
 *    carried ONTO the screen as a hidden field (`intakeFields`, a
 *    server-interpolated `defaultValue`), and each optional field's predicate
 *    is `"<field>" in intakeFields`. There is no `requiredWhen`: `required:
 *    true` + `visibleWhen` is "required when shown", enforced on both sides.
 *  - A screen with fields ALWAYS pauses (the executor never consults the
 *    variables). Headless completion — MCP `run_action`, REST `/actions` —
 *    therefore goes round the screens: `decision_headless` tests
 *    `has(vars.title)`, a variable only a headless caller binds (the action
 *    declares it `visible: false`, so the console dialog never sends it), and
 *    routes straight to the same create nodes.
 *  - Refusals (`clm_intake_refuse`, registered under `functions`) FAIL the run
 *    with the message: a paused "refusal screen" would leave a headless run
 *    parked forever, and the console shows a failed run's error as the toast.
 *  - The first version's file has two headless spellings — `draft_from_template`
 *    (the type's `template_file` becomes v1, kind `draft`) or a pre-uploaded
 *    `first_version_file` id — and one interactive one: an OBJECT-FORM screen
 *    on `clm_contract_version`, the platform's real form with its file widget,
 *    prefilled with the new contract. An object form always pauses, which is
 *    why the two headless spellings exist.
 *
 * Every write runs as the launching user (`runAs: 'user'`, the default):
 * DESIGN.md §04 decides who may create a party or a payment instalment
 * (legal / finance / admin; a requester reads them) and the platform refuses
 * the step for anyone else — the flow does not elevate around the matrix.
 *
 * Flow copy is English-only (the source language, DESIGN.md §01); a flow has
 * no entry in the translation bundles.
 */

interface SelectLike {
  options?: ReadonlyArray<{ label: string; value: unknown }>;
}

/** The object's own option list, so a screen select cannot drift from the field it feeds. */
function optionsOf(object: { name: string; fields: Record<string, unknown> }, field: string): Array<{ label: string; value: unknown }> {
  const options = (object.fields[field] as SelectLike | undefined)?.options;
  if (!options || options.length === 0) {
    throw new Error(`${object.name}.${field} has no options; the intake screen derives its select from the field.`);
  }
  return options.map(({ label, value }) => ({ label, value }));
}

/** The optional contract fields a type may list in `intake_fields`, in the order the screen asks them. */
const INTAKE_FIELD_NAMES = ['governing_law', 'payment_terms', 'confidentiality_term_months', 'liability_cap', 'auto_renew', 'parent_contract'] as const;

/** Bare CEL over the screen's own fields: shown only when the type lists the field. */
const askedFor = (field: (typeof INTAKE_FIELD_NAMES)[number]): string => `"${field}" in intakeFields`;

/**
 * The one registered function of the flow: fail the run with a structured
 * refusal that names what was refused. A `script` node is the only node that
 * can end a run with a computed message.
 */
export function refuseIntake({ input }: { input: Record<string, unknown> }): never {
  const kind = typeof input.kind === 'string' ? input.kind : 'invalid';
  const name = typeof input.name === 'string' && input.name ? input.name : 'the counterparty';
  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : '';
  const MESSAGES: Record<string, string> = {
    no_type: 'A contract type is required to launch a contract.',
    type_unavailable: 'The chosen contract type does not exist or is inactive; pick an active type.',
    party_missing: `Counterparty ${name} does not exist.`,
    party_blocked: `Counterparty ${name} is blocked and cannot be put on a new contract${note ? `: ${note}` : '.'}`,
  };
  const err = new Error(MESSAGES[kind] ?? 'The contract cannot be launched.') as Error & { code: string; status: number };
  err.code = kind === 'party_missing' ? 'INVALID_REFERENCE' : 'INVALID_STATE';
  err.status = 422;
  throw err;
}

const H = P`has(vars.title)`;
const NOT_H = P`!has(vars.title)`;

export const ContractIntakeFlow: Flow = {
  name: 'contract_intake',
  label: 'Launch Contract',
  description: 'Launch a contract: pick the type, fill the core and the type-specific fields, choose or create the counterparty, attach the first version, optionally schedule a payment and submit.',
  type: 'screen',
  status: 'active',
  successMessage: 'Contract launched.',

  variables: [
    // The two pickers, supplied by the launch action's dialog (or headlessly).
    { name: 'contract_type', type: 'text', isInput: true, isOutput: false },
    { name: 'party', type: 'text', isInput: true, isOutput: false },
    // Core fields. `title` doubles as the headless marker — see the header.
    { name: 'title', type: 'text', isInput: true, isOutput: false },
    { name: 'our_entity', type: 'text', isInput: true, isOutput: false, defaultValue: 'head_office' },
    { name: 'department', type: 'text', isInput: true, isOutput: false },
    { name: 'amount', type: 'number', isInput: true, isOutput: false },
    { name: 'currency_code', type: 'text', isInput: true, isOutput: false, defaultValue: 'usd' },
    { name: 'is_amount_estimated', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
    { name: 'start_date', type: 'date', isInput: true, isOutput: false },
    { name: 'end_date', type: 'date', isInput: true, isOutput: false },
    { name: 'term_months', type: 'number', isInput: true, isOutput: false },
    { name: 'summary', type: 'text', isInput: true, isOutput: false },
    // Optional fields, asked only when the type lists them.
    { name: 'governing_law', type: 'text', isInput: true, isOutput: false },
    { name: 'payment_terms', type: 'text', isInput: true, isOutput: false },
    { name: 'confidentiality_term_months', type: 'number', isInput: true, isOutput: false },
    { name: 'liability_cap', type: 'number', isInput: true, isOutput: false },
    { name: 'auto_renew', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
    { name: 'parent_contract', type: 'text', isInput: true, isOutput: false },
    // Inline counterparty, when none was picked.
    { name: 'new_party_name', type: 'text', isInput: true, isOutput: false },
    { name: 'new_party_kind', type: 'text', isInput: true, isOutput: false, defaultValue: 'company' },
    { name: 'new_party_registration_no', type: 'text', isInput: true, isOutput: false },
    { name: 'new_party_contact_name', type: 'text', isInput: true, isOutput: false },
    { name: 'new_party_contact_email', type: 'text', isInput: true, isOutput: false },
    // First version.
    { name: 'draft_from_template', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
    { name: 'first_version_file', type: 'text', isInput: true, isOutput: false },
    // Optional first payment instalment, and the submit toggle.
    { name: 'pay_seq', type: 'number', isInput: true, isOutput: false, defaultValue: 1 },
    { name: 'pay_planned_date', type: 'date', isInput: true, isOutput: false },
    { name: 'pay_planned_amount', type: 'number', isInput: true, isOutput: false },
    { name: 'pay_condition', type: 'text', isInput: true, isOutput: false },
    { name: 'submit_now', type: 'boolean', isInput: true, isOutput: false, defaultValue: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'clm_contract' } },

    // ── Step 1: the type decides everything after it ─────────────────────
    { id: 'decision_type_given', type: 'decision', label: 'Type Chosen?' },
    {
      id: 'refuse_no_type', type: 'script', label: 'Refuse: No Type',
      config: { function: 'clm_intake_refuse', inputs: { kind: 'no_type' } },
    },
    {
      id: 'get_type', type: 'get_record', label: 'Load Contract Type',
      config: { objectName: 'clm_contract_type', filter: { id: '{contract_type}' }, outputVariable: 'typeRecord' },
    },
    { id: 'decision_type_ok', type: 'decision', label: 'Type Active?' },
    {
      id: 'refuse_type', type: 'script', label: 'Refuse: Type Unavailable',
      config: { function: 'clm_intake_refuse', inputs: { kind: 'type_unavailable' } },
    },
    // Both branches bind `templateAvailable` and `templateNote`, so no later
    // read meets an unbound variable (the house rule of the flow-variable
    // conditions table in the spec's FlowVariableSchema note).
    { id: 'decision_template', type: 'decision', label: 'Type Has Template?' },
    {
      id: 'template_yes', type: 'assignment', label: 'Template Available',
      config: { assignments: { templateAvailable: true, templateNote: 'This contract type carries a template. Tick "Draft from template" to attach it as version 1, or leave it clear to upload the first version on the next step.' } },
    },
    {
      id: 'template_no', type: 'assignment', label: 'No Template',
      config: { assignments: { templateAvailable: false, templateNote: 'This contract type carries no template; upload the first version on the next step.' } },
    },
    // The type's `intake_fields` list, normalised to an array on both branches
    // and carried onto the core screen as a hidden field — see the header.
    { id: 'decision_intake_fields', type: 'decision', label: 'Type Lists Intake Fields?' },
    {
      id: 'intake_from_type', type: 'assignment', label: 'Intake Fields From Type',
      config: { assignments: { intakeFields: '{typeRecord.intake_fields}' } },
    },
    {
      id: 'intake_none', type: 'assignment', label: 'No Intake Fields',
      config: { assignments: { intakeFields: [] } },
    },
    // Interactive or headless? A headless caller binds `title` up front; the
    // console never does (the launch action declares it `visible: false`).
    { id: 'decision_headless', type: 'decision', label: 'Inputs Supplied Headlessly?' },

    // ── Step 2: core fields, and the type's optional ones ─────────────────
    {
      id: 'screen_core', type: 'screen', label: 'Contract Details',
      config: {
        title: 'Contract details',
        description: 'The core terms every contract carries, then the fields this contract type asks for.',
        fields: [
          // Carrier: the type's intake_fields, interpolated server-side to the
          // raw list, hidden by its own predicate, read by the predicates below.
          { name: 'intakeFields', label: 'Intake fields', type: 'text', defaultValue: '{intakeFields}', visibleWhen: 'intakeFields == null' },
          { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g. Mutual NDA with Acme' },
          { name: 'our_entity', label: 'Our signing entity', type: 'select', options: optionsOf(Contract, 'our_entity'), defaultValue: '{our_entity}' },
          { name: 'department', label: 'Requesting department', type: 'select', options: optionsOf(Contract, 'department') },
          { name: 'amount', label: 'Contract amount', type: 'currency' },
          { name: 'currency_code', label: 'Currency', type: 'select', options: optionsOf(Contract, 'currency_code'), defaultValue: '{currency_code}' },
          { name: 'is_amount_estimated', label: 'Amount is an estimate', type: 'boolean', defaultValue: '{is_amount_estimated}' },
          { name: 'start_date', label: 'Start date', type: 'date' },
          { name: 'end_date', label: 'End date', type: 'date' },
          { name: 'term_months', label: 'Term (months)', type: 'number', placeholder: 'Instead of an end date' },
          { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'What the deal is, in a few sentences' },
          // Asked — and required — only when the type lists them.
          { name: 'governing_law', label: 'Governing law', type: 'text', required: true, placeholder: 'e.g. US-NY, England and Wales', visibleWhen: askedFor('governing_law') },
          { name: 'payment_terms', label: 'Payment terms', type: 'select', required: true, options: optionsOf(Contract, 'payment_terms'), visibleWhen: askedFor('payment_terms') },
          { name: 'confidentiality_term_months', label: 'Confidentiality term (months)', type: 'number', required: true, visibleWhen: askedFor('confidentiality_term_months') },
          { name: 'liability_cap', label: 'Liability cap', type: 'currency', required: true, visibleWhen: askedFor('liability_cap') },
          { name: 'auto_renew', label: 'Auto-renews', type: 'boolean', defaultValue: '{auto_renew}', visibleWhen: askedFor('auto_renew') },
          // A flat screen has no record picker (see the header): the parent
          // contract is collected as its record id.
          { name: 'parent_contract', label: 'Parent contract (record id)', type: 'text', required: true, placeholder: 'The framework or main contract this one sits under', visibleWhen: askedFor('parent_contract') },
        ],
      },
    },

    // ── Step 3: the counterparty — picked, supplied inline, or asked for ──
    { id: 'decision_party_given', type: 'decision', label: 'Counterparty Picked?' },
    {
      id: 'screen_party', type: 'screen', label: 'New Counterparty',
      config: {
        title: 'New counterparty',
        description: 'No counterparty was picked. Create one here — legal keeps its risk flag and screening up to date afterwards.',
        fields: [
          { name: 'new_party_name', label: 'Name', type: 'text', required: true },
          { name: 'new_party_kind', label: 'Kind', type: 'select', options: optionsOf(Party, 'party_kind'), defaultValue: '{new_party_kind}' },
          { name: 'new_party_registration_no', label: 'Registration / tax ID', type: 'text' },
          { name: 'new_party_contact_name', label: 'Contact name', type: 'text' },
          { name: 'new_party_contact_email', label: 'Contact email', type: 'email' },
        ],
      },
    },
    {
      id: 'create_party', type: 'create_record', label: 'Create Counterparty',
      config: {
        objectName: 'clm_party',
        fields: {
          name: '{new_party_name}',
          party_kind: '{new_party_kind}',
          registration_no: '{new_party_registration_no}',
          contact_name: '{new_party_contact_name}',
          contact_email: '{new_party_contact_email}',
        },
        outputVariable: 'createdParty',
      },
    },
    { id: 'use_new_party', type: 'assignment', label: 'Use New Counterparty', config: { assignments: { partyId: '{createdParty.id}' } } },
    {
      id: 'get_party', type: 'get_record', label: 'Load Counterparty',
      config: { objectName: 'clm_party', filter: { id: '{party}' }, outputVariable: 'partyRecord' },
    },
    // The blocked-party refusal, and its two neighbours: a party that does not
    // resolve is refused too, and a clean one is used. The three edge
    // predicates partition every record shape.
    { id: 'decision_party_state', type: 'decision', label: 'Counterparty Blocked?' },
    {
      id: 'refuse_party_missing', type: 'script', label: 'Refuse: Counterparty Missing',
      config: { function: 'clm_intake_refuse', inputs: { kind: 'party_missing', name: '{party}' } },
    },
    {
      id: 'refuse_blocked', type: 'script', label: 'Refuse: Counterparty Blocked',
      config: { function: 'clm_intake_refuse', inputs: { kind: 'party_blocked', name: '{partyRecord.name}', note: '{partyRecord.risk_note}' } },
    },
    { id: 'use_picked_party', type: 'assignment', label: 'Use Picked Counterparty', config: { assignments: { partyId: '{partyRecord.id}' } } },

    // ── Step 4: the first version ─────────────────────────────────────────
    { id: 'decision_document_screen', type: 'decision', label: 'Ask About The Document?' },
    {
      id: 'screen_document', type: 'screen', label: 'First Version',
      config: {
        title: 'First version',
        description: '{templateNote}',
        fields: [
          { name: 'draft_from_template', label: 'Draft from template', type: 'boolean', defaultValue: '{draft_from_template}' },
        ],
      },
    },
    {
      id: 'create_contract', type: 'create_record', label: 'Create Contract',
      config: {
        objectName: 'clm_contract',
        fields: {
          title: '{title}',
          contract_type: '{contract_type}',
          party: '{partyId}',
          our_entity: '{our_entity}',
          department: '{department}',
          amount: '{amount}',
          currency_code: '{currency_code}',
          is_amount_estimated: '{is_amount_estimated}',
          start_date: '{start_date}',
          end_date: '{end_date}',
          term_months: '{term_months}',
          summary: '{summary}',
          governing_law: '{governing_law}',
          payment_terms: '{payment_terms}',
          confidentiality_term_months: '{confidentiality_term_months}',
          liability_cap: '{liability_cap}',
          auto_renew: '{auto_renew}',
          parent_contract: '{parent_contract}',
          status: 'draft',
          owner_id: '{$User.Id}',
        },
        outputVariable: 'contractRecord',
      },
    },
    { id: 'decision_version', type: 'decision', label: 'Where Does Version 1 Come From?' },
    {
      id: 'create_template_version', type: 'create_record', label: 'Version 1 From Template',
      config: {
        objectName: 'clm_contract_version',
        fields: {
          contract: '{contractRecord.id}',
          version_no: 1,
          kind: 'draft',
          turn: 'internal',
          is_current: true,
          file: '{typeRecord.template_file}',
          submitted_by: '{$User.Id}',
          notes: 'Drafted from the contract type template.',
        },
        outputVariable: 'versionRecord',
      },
    },
    {
      id: 'create_file_version', type: 'create_record', label: 'Version 1 From Uploaded File',
      config: {
        objectName: 'clm_contract_version',
        fields: {
          contract: '{contractRecord.id}',
          version_no: 1,
          kind: 'draft',
          turn: 'internal',
          is_current: true,
          file: '{first_version_file}',
          submitted_by: '{$User.Id}',
        },
        outputVariable: 'versionRecord',
      },
    },
    {
      // The platform's own form for the version, with its file widget.
      id: 'screen_upload', type: 'screen', label: 'Upload First Version',
      config: {
        title: 'Upload the first version',
        description: 'The document this contract starts from. It becomes version 1.',
        objectName: 'clm_contract_version',
        mode: 'create',
        defaults: { contract: '{contractRecord.id}', version_no: 1, kind: 'draft', turn: 'internal', is_current: true },
        idVariable: 'versionId',
      },
    },

    // ── Step 5: an optional first instalment, and submit ──────────────────
    { id: 'decision_schedule_screen', type: 'decision', label: 'Ask About Payment And Submission?' },
    {
      id: 'screen_schedule', type: 'screen', label: 'Payment And Submission',
      config: {
        title: 'Payment schedule and submission',
        description: 'Optionally record the first planned instalment (more can be added on the contract), then choose whether to submit now. Submitting routes the contract to legal review or to approval, as its type decides.',
        fields: [
          { name: 'pay_seq', label: 'Instalment no.', type: 'number', defaultValue: '{pay_seq}' },
          { name: 'pay_planned_date', label: 'Planned date', type: 'date' },
          { name: 'pay_planned_amount', label: 'Planned amount', type: 'currency' },
          { name: 'pay_condition', label: 'Condition', type: 'textarea', placeholder: 'What releases the instalment — acceptance, delivery, a milestone' },
          { name: 'submit_now', label: 'Submit now', type: 'boolean', defaultValue: '{submit_now}' },
        ],
      },
    },
    { id: 'decision_payment', type: 'decision', label: 'Instalment Given?' },
    {
      id: 'create_payment_plan', type: 'create_record', label: 'Create First Instalment',
      config: {
        objectName: 'clm_payment_plan',
        fields: {
          contract: '{contractRecord.id}',
          seq: '{pay_seq}',
          planned_date: '{pay_planned_date}',
          planned_amount: '{pay_planned_amount}',
          condition: '{pay_condition}',
          status: 'planned',
        },
        outputVariable: 'instalmentRecord',
      },
    },
    { id: 'decision_submit', type: 'decision', label: 'Submit Now?' },
    {
      // The write that enters F2: `contract_route` stamps the routing and the
      // state machine takes the contract into review or approval.
      id: 'submit_contract', type: 'update_record', label: 'Submit Contract',
      config: { objectName: 'clm_contract', filter: { id: '{contractRecord.id}' }, fields: { status: 'submitted' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e01', source: 'start', target: 'decision_type_given', type: 'default' },
    { id: 'e02', source: 'decision_type_given', target: 'get_type', type: 'default', condition: P`has(vars.contract_type) && vars.contract_type != null && vars.contract_type != ""`, label: 'Given' },
    { id: 'e03', source: 'decision_type_given', target: 'refuse_no_type', type: 'default', condition: P`!has(vars.contract_type) || vars.contract_type == null || vars.contract_type == ""`, label: 'Missing' },
    { id: 'e04', source: 'get_type', target: 'decision_type_ok', type: 'default' },
    { id: 'e05', source: 'decision_type_ok', target: 'decision_template', type: 'default', condition: P`vars.typeRecord != null && (!has(vars.typeRecord.is_active) || vars.typeRecord.is_active != false)`, label: 'Active' },
    { id: 'e06', source: 'decision_type_ok', target: 'refuse_type', type: 'default', condition: P`vars.typeRecord == null || (has(vars.typeRecord.is_active) && vars.typeRecord.is_active == false)`, label: 'Unavailable' },
    { id: 'e07', source: 'decision_template', target: 'template_yes', type: 'default', condition: P`has(vars.typeRecord.template_file) && vars.typeRecord.template_file != null`, label: 'Template' },
    { id: 'e08', source: 'decision_template', target: 'template_no', type: 'default', condition: P`!has(vars.typeRecord.template_file) || vars.typeRecord.template_file == null`, label: 'No template' },
    { id: 'e09', source: 'template_yes', target: 'decision_intake_fields', type: 'default' },
    { id: 'e10', source: 'template_no', target: 'decision_intake_fields', type: 'default' },
    { id: 'e11', source: 'decision_intake_fields', target: 'intake_from_type', type: 'default', condition: P`has(vars.typeRecord.intake_fields) && vars.typeRecord.intake_fields != null`, label: 'Listed' },
    { id: 'e12', source: 'decision_intake_fields', target: 'intake_none', type: 'default', condition: P`!has(vars.typeRecord.intake_fields) || vars.typeRecord.intake_fields == null`, label: 'None' },
    { id: 'e13', source: 'intake_from_type', target: 'decision_headless', type: 'default' },
    { id: 'e14', source: 'intake_none', target: 'decision_headless', type: 'default' },
    { id: 'e15', source: 'decision_headless', target: 'decision_party_given', type: 'default', condition: H, label: 'Headless' },
    { id: 'e16', source: 'decision_headless', target: 'screen_core', type: 'default', condition: NOT_H, label: 'Interactive' },
    { id: 'e17', source: 'screen_core', target: 'decision_party_given', type: 'default' },
    // Three ways out, partitioned: a picked party, an inline party supplied
    // headlessly, or the screen that asks for one.
    { id: 'e18', source: 'decision_party_given', target: 'get_party', type: 'default', condition: P`has(vars.party) && vars.party != null && vars.party != ""`, label: 'Picked' },
    { id: 'e19', source: 'decision_party_given', target: 'create_party', type: 'default', condition: P`(!has(vars.party) || vars.party == null || vars.party == "") && has(vars.new_party_name) && vars.new_party_name != null && vars.new_party_name != ""`, label: 'Inline' },
    { id: 'e20', source: 'decision_party_given', target: 'screen_party', type: 'default', condition: P`(!has(vars.party) || vars.party == null || vars.party == "") && (!has(vars.new_party_name) || vars.new_party_name == null || vars.new_party_name == "")`, label: 'Ask' },
    { id: 'e21', source: 'screen_party', target: 'create_party', type: 'default' },
    { id: 'e22', source: 'create_party', target: 'use_new_party', type: 'default' },
    { id: 'e23', source: 'get_party', target: 'decision_party_state', type: 'default' },
    { id: 'e24', source: 'decision_party_state', target: 'refuse_party_missing', type: 'default', condition: P`vars.partyRecord == null`, label: 'Missing' },
    { id: 'e25', source: 'decision_party_state', target: 'refuse_blocked', type: 'default', condition: P`vars.partyRecord != null && has(vars.partyRecord.risk_flag) && vars.partyRecord.risk_flag == "blocked"`, label: 'Blocked' },
    { id: 'e26', source: 'decision_party_state', target: 'use_picked_party', type: 'default', condition: P`vars.partyRecord != null && (!has(vars.partyRecord.risk_flag) || vars.partyRecord.risk_flag != "blocked")`, label: 'Clear' },
    { id: 'e27', source: 'use_new_party', target: 'decision_document_screen', type: 'default' },
    { id: 'e28', source: 'use_picked_party', target: 'decision_document_screen', type: 'default' },
    { id: 'e29', source: 'decision_document_screen', target: 'create_contract', type: 'default', condition: H, label: 'Headless' },
    { id: 'e30', source: 'decision_document_screen', target: 'screen_document', type: 'default', condition: NOT_H, label: 'Interactive' },
    { id: 'e31', source: 'screen_document', target: 'create_contract', type: 'default' },
    { id: 'e32', source: 'create_contract', target: 'decision_version', type: 'default' },
    // Version 1: the template (when asked for and available), a supplied file,
    // or the upload form. Partitioned in that order.
    { id: 'e33', source: 'decision_version', target: 'create_template_version', type: 'default', condition: P`vars.draft_from_template == true && vars.templateAvailable == true`, label: 'Template' },
    { id: 'e34', source: 'decision_version', target: 'create_file_version', type: 'default', condition: P`!(vars.draft_from_template == true && vars.templateAvailable == true) && has(vars.first_version_file) && vars.first_version_file != null && vars.first_version_file != ""`, label: 'File' },
    { id: 'e35', source: 'decision_version', target: 'screen_upload', type: 'default', condition: P`!(vars.draft_from_template == true && vars.templateAvailable == true) && (!has(vars.first_version_file) || vars.first_version_file == null || vars.first_version_file == "")`, label: 'Upload' },
    { id: 'e36', source: 'create_template_version', target: 'decision_schedule_screen', type: 'default' },
    { id: 'e37', source: 'create_file_version', target: 'decision_schedule_screen', type: 'default' },
    { id: 'e38', source: 'screen_upload', target: 'decision_schedule_screen', type: 'default' },
    { id: 'e39', source: 'decision_schedule_screen', target: 'decision_payment', type: 'default', condition: H, label: 'Headless' },
    { id: 'e40', source: 'decision_schedule_screen', target: 'screen_schedule', type: 'default', condition: NOT_H, label: 'Interactive' },
    { id: 'e41', source: 'screen_schedule', target: 'decision_payment', type: 'default' },
    { id: 'e42', source: 'decision_payment', target: 'create_payment_plan', type: 'default', condition: P`has(vars.pay_planned_amount) && vars.pay_planned_amount != null`, label: 'Instalment' },
    { id: 'e43', source: 'decision_payment', target: 'decision_submit', type: 'default', condition: P`!has(vars.pay_planned_amount) || vars.pay_planned_amount == null`, label: 'None' },
    { id: 'e44', source: 'create_payment_plan', target: 'decision_submit', type: 'default' },
    { id: 'e45', source: 'decision_submit', target: 'submit_contract', type: 'default', condition: P`vars.submit_now == true`, label: 'Submit' },
    { id: 'e46', source: 'decision_submit', target: 'end', type: 'default', condition: P`vars.submit_now != true`, label: 'Keep draft' },
    { id: 'e47', source: 'submit_contract', target: 'end', type: 'default' },
    // Every refusal ends the run; a script node that throws fails it with
    // its message, so these edges are only ever reached by a function that
    // returned — which `clm_intake_refuse` never does.
    { id: 'e48', source: 'refuse_no_type', target: 'end', type: 'default' },
    { id: 'e49', source: 'refuse_type', target: 'end', type: 'default' },
    { id: 'e50', source: 'refuse_party_missing', target: 'end', type: 'default' },
    { id: 'e51', source: 'refuse_blocked', target: 'end', type: 'default' },
  ],
};
