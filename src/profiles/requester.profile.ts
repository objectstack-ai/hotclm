import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { Party } from '../objects/party.object.js';
import { Review } from '../objects/review.object.js';
import { REQUESTER_EDITABLE_STATUSES } from '../sharing/_lifecycle.js';
import { CONTRACT_STAMPED_FIELDS, CONTRACT_TERMINATION_REASON, hidden, inList, readOnly } from './_grants.js';

/**
 * `clm_requester` — every employee (DESIGN.md §04 "所有员工默认").
 *
 * ## How the default reaches every member
 *
 * `isDefault: true` is the platform's mechanism for "the set every member
 * holds": the security plugin binds the set to the built-in `everyone` anchor
 * at boot (ADR-0090 D5), so `security/explain` lists it for any member as
 * "additive baseline". Nobody grants it in Setup and no position has to name
 * it — the seven positions in `src/sharing/positions.ts` name only their own
 * set, and the executive and general-manager rungs, which have none, still
 * reach `clm_contract` through this one: it is what gives them the
 * object-level read that `contract_executive_routed` / `contract_gm_routed`
 * deliver rows into. The dev admin and every platform account in the
 * organization hold it too.
 *
 * The binding is refused for a high-privilege set, and a `systemPermissions`
 * token counts as high-privilege unless the stack DECLARES it (ADR-0090
 * D5/D9, `describeHighPrivilegeBits`; `os lint` rule
 * `security-anchor-high-privilege`). This set grants two tokens, so the
 * `capabilities:` list in `objectstack.config.ts` is the other half of this
 * flag: measured on 18.1.0, `isDefault: true` with no declaration fails
 * `os lint`, `os validate` and the dev compile, and with the eleven app
 * tokens declared all three pass. Granting this set a token that list does
 * not declare puts it back over the line.
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
 * (§06 F5, `type: 'manager'`), who need hold no position: this set is all a
 * plain member has. The gate is held here so that rung can act; WHICH
 * approval is theirs is the flow's assignment, not the gate's. The executive
 * and general-manager rungs hold it the same way.
 */
export const RequesterSet = definePermissionSet({
  name: 'clm_requester',
  label: 'Requester',
  isDefault: true,
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
    // The contract page's Discussion tab (DESIGN.md §05, 讨论 — the platform
    // discussion panel) reads these three platform objects and posts to
    // `sys_comment`. The platform baseline every member resolves
    // (`member_default`) names none of them — it has been explicit-allow since
    // the wildcard retired, "everything else is the application's to declare"
    // — so without these lines every audience got `403 PERMISSION_DENIED` on
    // all three and the tab read "You don't have permission…" (issue #86).
    // They sit in this set because every audience holds it (see the header).
    //
    // An object-level read here does NOT open rows beyond §04, because the
    // platform scopes each of these reads by the record the row is about, with
    // the caller's own read of that record: a comment by the record its
    // `thread_id` names, an activity row by `object_name` + `record_id`, an
    // attachment by `parent_object` + `parent_id`. Posting a comment likewise
    // requires reading the record it is posted on. MEASURED on 17.7.0 with two
    // requesters, each owning a contract the other cannot open: each listed
    // only their own contract's comment and attachment, the other's comment
    // answered `404` by id, posting on the other's contract answered `403`,
    // and all 640 activity rows served to one of them were about records that
    // requester can read.
    //
    // `sys_approval_request` (the Approvals tab, 审批记录) follows the same
    // shape. The platform serves a caller only the approval requests they may
    // see, and `enable.approvalsVisibleToReaders` on `clm_contract` widens that
    // to whoever can read the contract, on a read that names it — a list that
    // names no contract answers nothing beyond the caller's own participation.
    // The read is object-level only: approve, reject and the rest keep
    // authorizing on the approver slate (#86, ruling A).
    sys_comment:          { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: false },
    sys_activity:         { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    sys_attachment:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    sys_approval_request: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
    // `clm_contract.our_entity` is a required lookup to the platform's
    // business units (the active company-kind ones are the signing entities),
    // and `member_default` grants no read on them. Without this line every
    // non-admin member got `403 PERMISSION_DENIED` in the launch dialog's
    // "Our signing entity" picker — so could not launch a contract — and the
    // record page showed the entity's raw id (issue #124). It sits here
    // because every member holds this set, the legal, finance and records
    // positions included. Read only: units are maintained in Setup → Business
    // Units by an administrator. The object's sharing baseline is org-wide,
    // so the read reaches the organization's own units and nothing else.
    sys_business_unit:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false },
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
      // DESIGN.md §04: RCU（本人发起，draft/submitted 可改）.
      description: 'A requester can change a contract only while it is Draft or Submitted. From review onward, legal, finance and records make the changes.',
      object: 'clm_contract',
      operation: 'update',
      using: inList('status', REQUESTER_EDITABLE_STATUSES),
    },
    {
      name: 'obligation_requester_own',
      label: 'Requesters update the obligations they own',
      // DESIGN.md §04: RU（本人负责）.
      description: 'A requester sees the obligations of the contracts they can see, and updates only the ones assigned to them.',
      object: 'clm_obligation',
      operation: 'update',
      using: 'owner == current_user.id',
    },
  ],
});
