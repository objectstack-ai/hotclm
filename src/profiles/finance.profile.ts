import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Review } from '../objects/review.object.js';
import { POST_APPROVAL_STATUSES } from '../sharing/_lifecycle.js';
import { CONTRACT_LEGAL_FIELDS, CONTRACT_STAMPED_FIELDS, CONTRACT_TERMINATION_REASON, editableOnly, hidden, inList, onRowsWhere, open, readOnly } from './_grants.js';

/**
 * `clm_finance` — the finance controller (DESIGN.md §04).
 *
 * "RU（approved 及之后，FLS 锁法律字段）" on contracts, ruled in §13 Q1 as `edit`
 * with field-level security locking the legal fields AND `status`. The rows
 * arrive through `contract_finance_post_approval` (`edit`, approved onward);
 * the row policy below repeats that window so it survives the OR-merge with
 * `clm_requester` (see `legal.profile.ts`); and the FLS entries are the lock:
 * a finance user's write that names `status` — or any legal field — on an
 * approved-or-later contract is refused with 403 (`Field write denied`). Card
 * 04 measured exactly that on a running app; the PR carries the transcript.
 * The lock carries the same window as a row condition (`onRowsWhere`), so it
 * does not land on the draft a finance controller launches (#127).
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
    //
    // From `approved` onward only — the rows finance edits as finance (#127,
    // ruling A). Before that the entries are absent, so on the draft a finance
    // controller launches as a requester, `clm_requester` alone decides: the
    // legal fields and `status` are open there as they are to every launcher,
    // and `risk_level`, `liability_cap` and the termination reason stay locked
    // by the requester's own entries. The stamps above stay unconditional.
    ...onRowsWhere(
      readOnly(Contract, [...CONTRACT_LEGAL_FIELDS, 'status', CONTRACT_TERMINATION_REASON]),
      inList('status', POST_APPROVAL_STATUSES),
    ),
    ...hidden(Review, ['internal_note']),
    ...editableOnly(Party, ['bank_name', 'bank_account']),
    // editableOnly declares only the fields it locks, so the banking pair has
    // to be opened here: clm_requester, which every member holds, hides
    // `bank_account` and locks `bank_name`, and a set that says nothing does
    // not out-vote it (`_grants.ts`, open). Without this line finance could
    // neither read nor write the bank account (#133).
    ...open(Party, ['bank_name', 'bank_account']),
  },
  rowLevelSecurity: [
    {
      name: 'contract_finance_post_approval_window',
      label: 'Finance edits a contract from approved onward',
      // DESIGN.md §04 contract_finance_post_approval, restated as the row policy
      // that survives the OR-merge with clm_requester.
      description: 'Lets finance edit a contract that is Approved, Signing, Active, Expired or Terminated.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', POST_APPROVAL_STATUSES),
    },
    {
      name: 'review_finance_stage_insert',
      label: 'Finance records finance-stage reviews',
      // DESIGN.md §04: RCU（stage=finance）.
      description: 'Finance can record a review only at the finance stage.',
      object: 'clm_review',
      operation: 'insert',
      check: 'stage == "finance"',
    },
    {
      name: 'review_finance_stage_update',
      label: 'Finance updates finance-stage reviews',
      // DESIGN.md §04: RCU（stage=finance）.
      description: 'Finance can update a review only at the finance stage.',
      object: 'clm_review',
      operation: 'update',
      using: 'stage == "finance"',
    },
  ],
});
