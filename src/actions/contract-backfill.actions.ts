import type { Action } from '@objectstack/spec/ui';

/**
 * 补录已签合同 — the F16 button (DESIGN.md §06 F16, §13 Q8).
 *
 * ## Why a flow action and not a script body
 *
 * The six lifecycle buttons next door are `type: 'script'` bodies that write
 * one field to the current record AS THE CALLER. This one cannot be: it
 * CREATES a contract, and it creates it born `active`, which
 * `contract_type_stamp` refuses for anything but a system write ("A contract
 * is created as a draft, not as active"). `executed_upload` is that system
 * write — a `screen` flow with `runAs: 'system'` — and this action is its
 * door. The caller's identity still rides through the elevation, so
 * `created_by` names the person who backfilled and the row lands in their
 * organization.
 *
 * `list_toolbar` only, like `launch_contract`: the action makes a record, so
 * it has no record to sit on, and declaring a record-scoped location would
 * make the console demand a selected row first.
 *
 * ## The gate: `backfill_contract`
 *
 * §06 F16 says the records manager OR legal may backfill. The gate is one
 * capability both hold rather than an OR of two: `backfill_contract`, granted
 * by `clm_records`, `clm_legal` and `clm_admin` (§04; issue #43, ruling A —
 * backfilling and registering an execution are two business acts, so the
 * backfill gets its own name instead of borrowing `execute_contract`).
 *
 * It is declared twice, on purpose, with the same list. The flow's
 * `requiredPermissions` is the gate: every door that starts the flow by name
 * (this action over REST and MCP, the trigger route) refuses a caller without
 * it, `403 PERMISSION_DENIED`, before anything runs. The action repeats it
 * because only the action's OWN list hides the button: the console's action
 * strip and MCP `list_actions` read the action, not the flow it starts
 * (objectstack#25643). Hiding is not gating — the flow's list is what stops
 * the request — but without the repeat every member would see a button that
 * answers 403.
 *
 * ## The business owner is asked, not assumed
 *
 * `owner_id` is a required param (issue #99, item 7): whoever types a legacy
 * contract in is rarely the requester who owns it on the business side, and
 * the owner is who §04 widens rows to (the private OWD, 我的合同, rung 1's
 * manager). The platform stamps the acting user only on an insert that leaves
 * `owner_id` empty, so the value given here is the one stored. `legal_owner`
 * is a different field (§03) and is not asked here.
 */
export const ExecutedUploadAction: Action = {
  name: 'executed_upload',
  label: 'Backfill Executed Contract',
  objectName: 'clm_contract',
  icon: 'file-check',
  type: 'flow',
  target: 'executed_upload',
  locations: ['list_toolbar'],
  // The flow inserts the row straight into `active` with `is_backfilled: true`.
  description: 'Record a contract that was signed before this system, or outside it. It is created directly as active and marked as backfilled, skipping review and approval, and the executed copy is filed as its final signed version.',
  // The same list as the flow's (see the header): this copy hides the button.
  requiredPermissions: ['backfill_contract'],
  params: [
    // Field-backed where a picker is wanted: the param inherits the field's
    // type, its label and its `lookupFilters`, so inactive types, blocked
    // counterparties, and business units of the wrong kind (a non-company as
    // the entity, a non-department as the department) are already out of the
    // pickers.
    { field: 'contract_type', required: true, helpText: 'The workflow this contract would have run. It still stamps the number, the category and the execution formalities.' },
    { field: 'party', required: true, helpText: 'The counterparty on the executed document.' },
    { field: 'title', required: true },
    // Who owns the contract on the business side; the flow writes it as given.
    { field: 'owner_id', required: true, helpText: 'The requester who owns this contract on the business side. It is stored as given: the person recording the backfill is not assumed to be the owner.' },
    // `signed_date` becomes both `signed_at` and `executed_at`; `executed_file`
    // is filed as version 1 with `kind: 'final_signed'` (executed-upload.flow.ts).
    { name: 'signed_date', type: 'date', label: 'Signed On', required: true, helpText: 'The date on the executed document. It is recorded as both the signed date and the execution date.' },
    { name: 'executed_file', type: 'file', label: 'Executed Copy', required: true, helpText: 'The signed PDF or scan. It is filed as version 1, the final signed version.' },
    // Required on the contract, and a business-unit row: no default to fall back to.
    { field: 'our_entity', required: true },
    { field: 'department' },
    { field: 'amount' },
    { field: 'currency_code' },
    { field: 'start_date' },
    { field: 'end_date' },
    { field: 'term_months' },
    { field: 'auto_renew' },
    { field: 'renewal_notice_days' },
    { field: 'governing_law' },
    { field: 'archive_no', helpText: 'Optional. The existing paper file reference, if this contract already has one.' },
    { field: 'summary' },
  ],
  successMessage: 'Executed contract recorded.',
  refreshAfter: true,
};
