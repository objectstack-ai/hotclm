import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * "Launch Contract" — the button behind F1 (DESIGN.md §05 "发起 = screen flow
 * 动作"), bound to the `contract_intake` flow.
 *
 * ## Why the action carries params at all
 *
 * The flat screens of a flow have no record picker (measured on the pinned
 * console — see the flow's header), so the two pickers the intake needs are
 * collected HERE, by the action's param dialog: field-backed lookup params
 * render the real pickers and inherit the fields' `lookupFilters` (active
 * types only; blocked parties hidden). The console posts them as the flow's
 * `params`, which the engine seeds into the input variables of the same name.
 *
 * ## The headless half
 *
 * `ai.exposed` publishes this action to the MCP surface and to the
 * `POST /api/v1/actions/clm_contract/launch_contract` route — DESIGN.md §07's
 * conversational intake for M2. Measured on 17.3.0: MCP does not mint one
 * tool per action; it ships the generic pair `list_actions` / `run_action`,
 * and an exposed action appears in `list_actions` (with its params) for
 * `run_action` to call by name. The REST route takes the params under a
 * `params` wrapper — a bare top-level body is refused
 * "Invalid action params: Action param \"contract_type\" is required". Over those doors the params gate (ADR-0104)
 * refuses any key the action does not declare, so EVERY flow input is
 * declared below; the ones a person answers on the flow's screens are
 * `visible: false`, which keeps them out of the console dialog (and out of
 * its submission) while leaving them declared for a headless caller. A
 * headless call that supplies `title` completes without a screen; one that
 * supplies fewer inputs pauses on the first screen it needs.
 *
 * `list_toolbar` only: the action creates a record, so it has no record to
 * sit on. Declaring a record-scoped location would make the console demand a
 * selected row first.
 */

type ActionParam = NonNullable<Action['params']>[number];

/** A flow input a headless caller may pass and the screens collect from a person. */
const headless = (name: string, type: ActionParam['type'], label: string): ActionParam => ({
  name,
  type,
  label,
  visible: P`false`,
});

export const LaunchContractAction: Action = {
  name: 'launch_contract',
  label: 'Launch Contract',
  objectName: 'clm_contract',
  icon: 'rocket',
  type: 'flow',
  target: 'contract_intake',
  locations: ['list_toolbar'],
  params: [
    // The two pickers a flat screen cannot render.
    { field: 'contract_type', label: 'Contract type', required: true, helpText: 'The workflow this contract runs: which fields are asked, whether legal reviews it, how it is executed.' },
    { field: 'party', label: 'Counterparty', required: false, helpText: 'Pick an existing counterparty, or leave empty to create one on the next step.' },
    // Everything else is answered on the flow's screens; declared here for
    // the headless doors only.
    headless('title', 'text', 'Title'),
    headless('our_entity', 'text', 'Our signing entity'),
    headless('department', 'text', 'Requesting department'),
    headless('amount', 'number', 'Contract amount'),
    headless('currency_code', 'text', 'Currency (ISO 4217, lowercase)'),
    headless('is_amount_estimated', 'boolean', 'Amount is an estimate'),
    headless('start_date', 'date', 'Start date'),
    headless('end_date', 'date', 'End date'),
    headless('term_months', 'number', 'Term (months)'),
    headless('summary', 'text', 'Summary'),
    headless('governing_law', 'text', 'Governing law'),
    headless('payment_terms', 'text', 'Payment terms'),
    headless('confidentiality_term_months', 'number', 'Confidentiality term (months)'),
    headless('auto_renew', 'boolean', 'Auto-renews'),
    headless('parent_contract', 'text', 'Parent contract (record id)'),
    headless('new_party_name', 'text', 'New counterparty: name'),
    headless('new_party_kind', 'text', 'New counterparty: kind'),
    headless('new_party_registration_no', 'text', 'New counterparty: registration / tax ID'),
    headless('new_party_contact_name', 'text', 'New counterparty: contact name'),
    headless('new_party_contact_email', 'text', 'New counterparty: contact email'),
    headless('draft_from_template', 'boolean', 'Draft version 1 from the type template'),
    headless('first_version_file', 'text', 'Version 1: uploaded file id'),
    headless('submit_now', 'boolean', 'Submit now'),
  ],
  successMessage: 'Contract launched.',
  refreshAfter: true,
  ai: {
    exposed: true,
    category: 'flow',
    description:
      'Launches a contract: creates the contract draft and its first version from the given contract type, counterparty (an existing record id, or a new one by name) and the core terms plus whichever optional fields the type asks for, then optionally submits it into legal review or approval. Refuses a blocked counterparty, naming it and why.',
  },
};
