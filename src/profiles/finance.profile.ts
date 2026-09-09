import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Review } from '../objects/review.object.js';
import { POST_APPROVAL_STATUSES } from '../sharing/_lifecycle.js';
import { CONTRACT_LEGAL_FIELDS, CONTRACT_STAMPED_FIELDS, CONTRACT_TERMINATION_REASON, editableOnly, hidden, inList, readOnly } from './_grants.js';

/**
 * `clm_finance` — the finance controller (DESIGN.md §04).
 *
 * "RU（approved 及之后，FLS 锁法律字段）" on contracts, ruled in §13 Q1 as `edit`
 * with field-level security locking the legal fields AND `status`. The rows
 * arrive through `contract_finance_post_approval` (`edit`, approved onward);
 * the row policy below repeats that window so it survives the OR-merge with
 * `clm_requester` (see `legal.profile.ts`); and the FLS entries are the lock:
 * a finance user's write that names `status` — or any legal field — is refused
 * with 403 (`Field write denied`). Card 04 measured exactly that on a running
 * app; the PR carries the transcript.
 *
 * On `clm_review`, "RCU（stage=finance）": finance reads every review of a
 * contract it can see (legal's `internal_note` withheld) and creates or
 * updates only finance-stage ones. On `clm_party`, "RU（银行信息）": every
 * field readable, only the two banking fields editable.
 */
export const FinanceSet = definePermissionSet({
  name: 'clm_finance',
  label: 'Finance',
  description: 'The finance controller: approved contracts, the payment schedule, finance reviews and counterparty banking details.',
  systemPermissions: ['clm_finance.access', 'approve_contract'],
  objects: {
    clm_contract:         { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false, readScope: 'own' },
    clm_contract_version: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_review:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_deviation:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_signature:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_obligation:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_payment_plan:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_party:            { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false },
    clm_contract_type:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_clause:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_approval_rule:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
  },
  fields: {
    ...readOnly(Contract, CONTRACT_STAMPED_FIELDS),
    // §04 "FLS 锁法律字段" + §13 Q1 "与 status". The termination reason travels
    // with `status` on the same write, so locking one without the other would
    // leave finance able to author half of a transition it may not make.
    ...readOnly(Contract, [...CONTRACT_LEGAL_FIELDS, 'status', CONTRACT_TERMINATION_REASON]),
    ...hidden(Review, ['internal_note']),
    ...editableOnly(Party, ['bank_name', 'bank_account']),
  },
  rowLevelSecurity: [
    {
      name: 'contract_finance_post_approval_window',
      label: 'Finance edits a contract from approved onward',
      description: 'DESIGN.md §04 contract_finance_post_approval, restated as the row policy that survives the OR-merge with clm_requester.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', POST_APPROVAL_STATUSES),
    },
    {
      name: 'review_finance_stage_insert',
      label: 'Finance records finance-stage reviews',
      description: 'DESIGN.md §04: RCU（stage=finance）.',
      object: 'clm_review',
      operation: 'insert',
      check: 'stage == "finance"',
    },
    {
      name: 'review_finance_stage_update',
      label: 'Finance updates finance-stage reviews',
      description: 'DESIGN.md §04: RCU（stage=finance）.',
      object: 'clm_review',
      operation: 'update',
      using: 'stage == "finance"',
    },
  ],
});
