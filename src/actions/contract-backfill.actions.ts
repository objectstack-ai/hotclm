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
 * write — a flow with `runAs: 'system'` — and this action is its door. The
 * caller's identity still rides through the elevation, so `created_by` names
 * the person who backfilled and the row lands in their organization.
 *
 * `list_toolbar` only, like `launch_contract`: the action makes a record, so
 * it has no record to sit on, and declaring a record-scoped location would
 * make the console demand a selected row first.
 *
 * ## The gate, and the half of it this platform cannot express
 *
 * §06 F16 says "仅 `clm_records.access` 与 `clm_legal.access` 可用" — records
 * OR legal. `requiredPermissions` is an AND: the runtime refuses unless the
 * caller holds EVERY capability listed
 * (`missing = required.filter(p => !held.has(p))`), and no capability is held
 * by both `clm_records` and `clm_legal` today. So the declaration below gates
 * on `execute_contract`, the §04 capability for the execution lane — held by
 * `clm_records` and `clm_admin` — which delivers the records half of the rule
 * exactly and leaves the legal half out. The legal counsel keeps every other
 * path (§04 grants `clm_legal` RCU on `clm_contract`); what they lose is this
 * button.
 *
 * That gap is REPORTED, not papered over: closing it needs either a new §04
 * capability granted to both sets (a governed-surface decision, not a
 * developer's) or an OR-form gate on the platform. Gating on `visible` instead
 * would hide the button without stopping the request, which is the thing the
 * spec's own guidance calls out — "hiding is not gating".
 */
export const ExecutedUploadAction: Action = {
  name: 'executed_upload',
  label: 'Backfill Executed Contract',
  objectName: 'clm_contract',
  icon: 'file-check',
  type: 'flow',
  target: 'executed_upload',
  locations: ['list_toolbar'],
  description: 'Record a contract that was signed before this system, or outside it: it is created directly in active with is_backfilled set, skipping review and approval, and the executed copy is filed as its final signed version.',
  requiredPermissions: ['execute_contract'],
  params: [
    // Field-backed where a picker is wanted: the param inherits the field's
    // type, its label and its `lookupFilters`, so inactive types and blocked
    // counterparties are already out of the pickers.
    { field: 'contract_type', required: true, helpText: 'The workflow this contract would have run. It still stamps the number, the category and the execution formalities.' },
    { field: 'party', required: true, helpText: 'The counterparty on the executed document.' },
    { field: 'title', required: true },
    { name: 'signed_date', type: 'date', label: 'Signed On', required: true, helpText: 'The date on the executed document. It becomes both signed_at and executed_at.' },
    { name: 'executed_file', type: 'file', label: 'Executed Copy', required: true, helpText: 'The signed PDF or scan. It is filed as version 1, kind final_signed.' },
    { field: 'our_entity' },
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
