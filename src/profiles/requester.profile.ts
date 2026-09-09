import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Review } from '../objects/review.object.js';
import { REQUESTER_EDITABLE_STATUSES } from '../sharing/_lifecycle.js';
import { CONTRACT_STAMPED_FIELDS, CONTRACT_TERMINATION_REASON, hidden, inList, readOnly } from './_grants.js';

/**
 * `clm_requester` — every employee (DESIGN.md §04 "所有员工默认").
 *
 * ## How the default is distributed
 *
 * The platform's mechanism for "the set every member holds" is `isDefault:
 * true`, which auto-binds the set to the built-in `everyone` anchor. It is NOT
 * used here, and cannot be: §04 grants `clm_requester.access` through
 * `systemPermissions`, and a set carrying ANY system permission is
 * high-privilege by the platform's definition (ADR-0090 D5/D9,
 * `describeHighPrivilegeBits`) — the runtime refuses the binding at boot with
 * a warning, and `os lint` refuses the declaration outright
 * (`security-anchor-high-privilege`, an error). So under this platform version
 * the default is DISTRIBUTED, not implicit:
 *
 *  - every one of the seven positions is bound to this set as well as to its
 *    own (`src/security/bind-position-sets.ts`), so legal, finance, records,
 *    admin and the two leadership rungs are all requesters too — which is also
 *    the only way an executive holds an object-level read on `clm_contract`
 *    for the rows `contract_executive_routed` shares with them;
 *  - an employee who holds no position receives the set in Setup (a
 *    `sys_user_permission_set` grant), which is the platform's supported path.
 *
 * Whether §04's wording should change, or the platform's high-privilege rule
 * should learn to tell an app capability token from `manage_users`, is a
 * maintainer decision; the card-04 PR files it. Nothing here pre-empts it.
 *
 * ## Row scope
 *
 * `own_and_reports` on both axes is the `contract_manager_reports` row of the
 * §04 sharing table and §13 Q2 ("部门内可见性 … 靠 own_and_reports"): a manager
 * reaches the contracts of their reports through the manager chain. It is a
 * HIERARCHY depth (ADR-0057) resolved by `@objectstack/security-enterprise`;
 * the open edition has no resolver and fails CLOSED to owner-only, so on an
 * open-edition boot a requester reads exactly their own contracts — the M1
 * acceptance measurement. `requires: ['hierarchy-security']` in
 * `objectstack.config.ts` is the other half of this declaration.
 *
 * The write window ("`draft`/`submitted` 可改") is a row-level policy: once the
 * contract leaves the requester's hands it is legal's to edit. RLS policies
 * from every set a person holds are OR-combined, so every other set that edits
 * contracts carries its own window (see the note in `legal.profile.ts`).
 *
 * ## `approve_contract`
 *
 * The first rung of the approval ladder is the requester's direct manager
 * (§06 F5, `type: 'manager'`), who holds no position and therefore only this
 * set. The gate is held here so that rung can act; WHICH approval is theirs is
 * the flow's assignment, not the gate's. The executive and general-manager
 * rungs hold it the same way.
 */
export const RequesterSet = definePermissionSet({
  name: 'clm_requester',
  label: 'Requester',
  description: 'Every employee: launches contracts, follows their own through review and approval, performs the obligations assigned to them.',
  systemPermissions: ['clm_requester.access', 'approve_contract'],
  objects: {
    clm_contract:         { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, readScope: 'own_and_reports', writeScope: 'own_and_reports' },
    // Children follow the contract (controlled_by_parent, ADR-0055): a
    // readScope here would be inert. Creating a version or a deviation needs
    // the contract to be editable, so in practice both happen while it is
    // still draft or submitted — legal uploads the negotiation rounds (§03).
    clm_contract_version: { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: false },
    clm_review:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_deviation:        { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: false },
    clm_signature:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_obligation:       { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false },
    clm_payment_plan:     { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    // Configuration objects are public_read: everyone reads every row.
    clm_party:            { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_contract_type:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_clause:           { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    clm_approval_rule:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
  },
  fields: {
    ...readOnly(Contract, CONTRACT_STAMPED_FIELDS),
    // Assessed by legal (§04 FLS table).
    ...readOnly(Contract, ['risk_level', 'liability_cap']),
    // Ending a contract is legal's act (§04 gives only clm_legal and clm_admin
    // `terminate_contract`), so the reason is readable here and not writable.
    ...readOnly(Contract, [CONTRACT_TERMINATION_REASON]),
    // Legal's working note; the conclusion for the requester goes in `comments`.
    ...hidden(Review, ['internal_note']),
    // Payment and contact details are the easiest to leak (§04 FLS table).
    ...hidden(Party, ['bank_account', 'contact_phone']),
  },
  rowLevelSecurity: [
    {
      name: 'contract_requester_edit_window',
      label: 'Requesters edit a contract only while it is draft or submitted',
      description: 'DESIGN.md §04: RCU（本人发起，draft/submitted 可改）. From review onward the contract is edited by legal, finance and records through their own grants.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', REQUESTER_EDITABLE_STATUSES),
    },
    {
      name: 'obligation_requester_own',
      label: 'Requesters update the obligations they own',
      description: 'DESIGN.md §04: RU（本人负责）. Reading follows the contract; updating needs the obligation to be assigned to the caller.',
      object: 'clm_obligation',
      operation: 'update',
      using: 'owner == current_user.id',
    },
  ],
});
