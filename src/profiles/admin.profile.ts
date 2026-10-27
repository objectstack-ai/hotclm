import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Review } from '../objects/review.object.js';
import { Signature } from '../objects/signature.object.js';
import { CONTRACT_STATUSES, OBLIGATION_STATUSES } from '../sharing/_lifecycle.js';
import { CONTRACT_STAMPED_FIELDS, PARTY_ASSESSED_FIELDS, inList, openAllExcept, open, readOnly } from './_grants.js';

/**
 * `clm_admin` — the CLM administrator (DESIGN.md §04): RCUD on every object,
 * write access to the four configuration objects that every other set only
 * reads, and all seven action gates.
 *
 * `viewAllRecords` / `modifyAllRecords` on the private contract and its
 * children: an administrator reaches every row without a sharing rule, and
 * `modifyAllRecords` is what lets them reassign a contract's business owner
 * (`allowTransfer` is authored beside it so the capability is readable here
 * rather than implied).
 *
 * ## Why this set carries "allow everything" row policies
 *
 * The super-user bits skip ownership and sharing. They do NOT skip business
 * row-level security on these objects: the platform drops RLS for a Modify
 * All Data holder only on an object whose exposure posture is
 * `access.default: 'private'` (ADR-0066 D2), and the CLM objects declare an
 * OWD (`sharingModel`), not that posture. So the policies of every set an
 * administrator holds still apply and OR-combine — and the administrator
 * also holds `clm_requester` (§04 "所有员工默认"), whose
 * `contract_requester_edit_window` and `obligation_requester_own` would be the
 * only update policies on those two objects. Without a permissive companion
 * here, an administrator could not edit a contract past `submitted` (nor any
 * child of one: a child write needs its master editable), nor an obligation
 * someone else owns — measured as 403 on 17.4, 17.7 and 18.1 (issue #11).
 * Same pattern, same reason as the companions in `legal.profile.ts`. Each
 * policy is the whole vocabulary of the field it names, read from the object.
 *
 * The super-user bits do NOT bypass field-level security, and field masks
 * merge most permissively only among the sets that declare a field
 * (`_grants.ts`, `open`): an administrator also holds `clm_requester`, whose
 * masks would otherwise apply to them. Every field another set locks or hides
 * is opened here explicitly.
 *
 * What even the administrator may not do by hand is write the fields §04 locks
 * for every position: the routing flags, the stage timestamps and the AI
 * fields have exactly one writer each (hooks, flows and the adopt action,
 * under a system context), and a hand edit would forge an audit trail.
 */
const full = { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true } as const;
const config = { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true } as const;

export const AdminSet = definePermissionSet({
  name: 'clm_admin',
  label: 'CLM Administrator',
  description: 'Full reach over every CLM object and the configuration objects: contract types, the clause playbook, the approval matrix, counterparties.',
  systemPermissions: [
    'clm_admin.access',
    'approve_contract',
    'execute_contract',
    'backfill_contract',
    'archive_contract',
    'terminate_contract',
    'manage_clauses',
    'manage_approval_rules',
  ],
  objects: {
    clm_contract:         { ...full, allowTransfer: true },
    clm_contract_version: full,
    clm_review:           full,
    clm_deviation:        full,
    clm_signature:        full,
    clm_obligation:       full,
    clm_payment_plan:     full,
    clm_party:            config,
    clm_contract_type:    config,
    clm_clause:           config,
    clm_approval_rule:    config,
  },
  fields: {
    ...openAllExcept(Contract, CONTRACT_STAMPED_FIELDS),
    ...readOnly(Contract, CONTRACT_STAMPED_FIELDS),
    ...openAllExcept(Signature, []),
    ...open(Review, ['internal_note']),
    ...open(Party, ['bank_account', 'contact_phone']),
    // Read-only for clm_requester, which every member holds (#133).
    ...open(Party, PARTY_ASSESSED_FIELDS),
  },
  rowLevelSecurity: [
    {
      name: 'contract_admin_edit_any_status',
      label: 'The administrator edits a contract in any status',
      // The permissive companion of contract_requester_edit_window: policies
      // OR-merge across the sets a person holds, and Modify All Data does not
      // skip them on this object.
      description: 'Lets the CLM administrator edit a contract in any status, not only while it is Draft or Submitted.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', CONTRACT_STATUSES),
    },
    {
      name: 'obligation_admin_update_any',
      label: 'The administrator updates any obligation',
      // The permissive companion of obligation_requester_own.
      description: 'Lets the CLM administrator update any obligation, not only the ones assigned to them.',
      object: 'clm_obligation',
      operation: 'update',
      using: inList('status', OBLIGATION_STATUSES),
    },
  ],
});
