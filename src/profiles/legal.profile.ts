import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { CONTRACT_STATUSES, OBLIGATION_STATUSES, REVIEW_STAGES } from '../sharing/_lifecycle.js';
import { CONTRACT_STAMPED_FIELDS, inList, readOnly } from './_grants.js';

/**
 * `clm_legal` — legal counsel and the head of legal (DESIGN.md §04).
 *
 * "RCU（全部）" on contracts: the object grant here is owner-scoped like every
 * other set's (`readScope: 'own'`, authored so the intent is explicit — the
 * `security-private-no-readscope` rule otherwise reads the omission as an
 * unmade decision); the ROWS arrive through `contract_legal_all`, a sharing
 * rule at `edit` level naming both legal positions
 * (`src/sharing/contract.sharing.ts`). Deliberately not `viewAllRecords` /
 * `modifyAllRecords`: those are super-user bypasses that skip row-level
 * security and widen delete, and §04 grants legal no delete.
 *
 * ## Why this set carries "allow every status" row policies
 *
 * RLS policies are collected from EVERY set a person holds and OR-combined;
 * a set that says nothing contributes nothing. `clm_requester` — which every
 * legal user also holds (§04 "所有员工默认") — narrows contract updates to
 * `draft`/`submitted` and obligation updates to the caller's own. Without a
 * permissive policy of its own on the same object and operation, legal would
 * inherit the requester's window and lose the ability to edit a contract in
 * review — the OR-merge trap. Each policy below is therefore the whole
 * vocabulary of the field it names, read from the object.
 *
 * `manage_clauses` (clause RCU is legal's alone), `terminate_contract` (legal
 * and admin are the only sets that may write `status` on an active contract:
 * finance's is locked by §13 Q1, records' edit is limited to execution and
 * archive) and `approve_contract` (the head of legal is a ladder rung) are the
 * action gates §04 assigns here.
 */
export const LegalSet = definePermissionSet({
  name: 'clm_legal',
  label: 'Legal',
  description: 'Legal counsel and the head of legal: every contract, every review, the clause playbook.',
  systemPermissions: ['clm_legal.access', 'approve_contract', 'terminate_contract', 'manage_clauses'],
  objects: {
    clm_contract:         { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, readScope: 'own' },
    clm_contract_version: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_review:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_deviation:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_signature:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_obligation:       { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_payment_plan:     { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: false },
    clm_party:            { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_contract_type:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_clause:           { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false },
    clm_approval_rule:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
  },
  fields: {
    ...readOnly(Contract, CONTRACT_STAMPED_FIELDS),
  },
  rowLevelSecurity: [
    {
      name: 'contract_legal_edit_any_status',
      label: 'Legal edits a contract in any status',
      description: 'The permissive companion of contract_requester_edit_window (policies OR-merge across the sets a person holds).',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', CONTRACT_STATUSES),
    },
    {
      name: 'review_legal_insert_any_stage',
      label: 'Legal records a review at any stage',
      description: 'The permissive companion of the finance stage policies on clm_review.',
      object: 'clm_review',
      operation: 'insert',
      check: inList('stage', REVIEW_STAGES),
    },
    {
      name: 'review_legal_update_any_stage',
      label: 'Legal updates a review at any stage',
      description: 'The permissive companion of the finance stage policies on clm_review.',
      object: 'clm_review',
      operation: 'update',
      using: inList('stage', REVIEW_STAGES),
    },
    {
      name: 'obligation_legal_update_any',
      label: 'Legal updates any obligation of a contract it can edit',
      description: 'The permissive companion of obligation_requester_own.',
      object: 'clm_obligation',
      operation: 'update',
      using: inList('status', OBLIGATION_STATUSES),
    },
  ],
});
