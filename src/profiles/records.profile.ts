import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Signature } from '../objects/signature.object.js';
import { EXECUTION_STATUSES } from '../sharing/_lifecycle.js';
import { editableOnly, hidden, inList } from './_grants.js';

/**
 * `clm_records` — the records manager (DESIGN.md §04, global-first revision:
 * no seal keeper; execution registration and archive are one position).
 *
 * "RU（signing 及之后；执行与归档字段）" on contracts. The rows arrive through
 * `contract_records_execution` (`edit`, signing onward); the row policy
 * repeats the window for the OR-merge; and field-level security limits the
 * edit to the two execution/archive fields a person actually writes:
 *
 *  - `status` — execution IS the `signing → active` transition the
 *    `execute_contract` gate authorises (the state machine guards it);
 *  - `archive_no` — the archive reference F14 stamps `archived_at` from.
 *
 * Everything else on the contract, including the stamps §04 locks for every
 * position, is readable and locked (`editableOnly`). On `clm_signature`,
 * "RU（执行形式、执行副本）": the formalities, the executed copy, the completion
 * date a wet-ink round records, and the round's status so the round can be
 * completed at all (F7's wet-ink path names this position). On `clm_party`
 * the banking and phone fields are withheld (§04 FLS table).
 */
export const RecordsSet = definePermissionSet({
  name: 'clm_records',
  label: 'Records',
  description: 'The records manager: execution registration, archive and the contract ledger.',
  systemPermissions: ['clm_records.access', 'execute_contract', 'archive_contract'],
  objects: {
    clm_contract:         { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false, readScope: 'own' },
    clm_contract_version: { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: false },
    clm_review:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_deviation:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_signature:        { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false },
    clm_obligation:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_payment_plan:     { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_party:            { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_contract_type:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_clause:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_approval_rule:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
  },
  fields: {
    ...editableOnly(Contract, ['status', 'archive_no']),
    ...editableOnly(Signature, ['status', 'formalities_done', 'executed_file', 'completed_at']),
    ...hidden(Party, ['bank_account', 'contact_phone']),
  },
  rowLevelSecurity: [
    {
      name: 'contract_records_execution_window',
      label: 'Records edits a contract from signing onward',
      description: 'DESIGN.md §04 contract_records_execution, restated as the row policy that survives the OR-merge with clm_requester.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', EXECUTION_STATUSES),
    },
  ],
});
