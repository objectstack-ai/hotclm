# Positions, permission sets, sharing rules, FLS, `onEnable` bindings

Milestone: M1 · Labels: `pm:queue` · Blocked-by: 02, 03

## Scope
`src/profiles/*.profile.ts` (6 permission sets), `src/sharing/positions.ts` (8 positions),
`src/sharing/*.sharing.ts` (7 rules), FLS declarations, `src/security/bind-position-sets.ts` +
`onEnable` in `objectstack.config.ts`. Adds `requires: ['sharing']`.

## Spec — DESIGN.md §04, verbatim
Positions, sets, the permission matrix, the seven sharing rules and the FLS table are pinned there.
Capabilities granted via `systemPermissions`: `clm_requester.access` · `clm_legal.access` · `clm_finance.access`
· `clm_records.access` · `clm_admin.access`; action gates `approve_contract` ·
`execute_contract` · `archive_contract` · `terminate_contract` · `manage_clauses` · `manage_approval_rules`.
`contract_manager_reports` uses `writeScope: 'own_and_reports'` **only if** declaring it does not require the
`hierarchy-security` capability at validate time; if it does, declare the capability (it is safe on an
open-edition boot — see HotCRM's `objectstack.config.ts` note) and record the edition boundary in the PR.
Bindings: `sys_position_permission_set` rows cannot be seeds — bind on `kernel:bootstrapped` as ATS does.

## Acceptance
- Gates green. Two requester accounts cannot read each other's contracts through REST; a `clm_legal`
  account reads all; a `clm_finance` account reads no `in_review` contract.
- `clm_party.bank_account` is absent from a requester's REST read.

## Out of scope
Views/app gating (07).
