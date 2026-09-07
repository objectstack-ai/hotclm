# F5 approval ladder · F7 signature record and execution formalities

Milestone: M2 · Labels: `pm:queue` · Blocked-by: 04

## Scope
`src/flows/contract-approval.flow.ts` (F5), `src/flows/signature-record.flow.ts` (F7).
Adds `requires: ['approvals', 'messaging']`.

## Spec — DESIGN.md §06 F5/F7
F5: `record_change` on `clm_contract` entering `in_approval`, `runAs: 'system'` (state the reason in a
comment — approval mirror writes carry no user). Rung 1 `approvers: [{ type: 'manager' }]`. Decision on
`route_legal_head` / `route_finance`: both → one node with `behavior: 'per_group'`
(`clm_legal_head` group `legal`, `clm_finance_controller` group `finance`); one → single position node;
neither → skip. Decision `route_executive` → position `clm_executive`. Decision `route_gm` → position
`clm_general_manager`. `lockRecord: true`, `approvalStatusField: 'approval_status'`. Out-edges: approve →
`update_record` status `approved` + `approved_at`; reject → `rejected`; send-back → `draft`. `notify` the
owner on every terminal outcome (inbox). Approving is gated on `approve_contract`.
F7: `record_change` on `clm_signature` reaching `completed` → hook checks `formalities_done` against the type's `execution_formalities`; when covered, stamp the parent's `executed_at` and create the `final_signed` version from `executed_file`; when a formality is missing, notify legal (`clm_legal_counsel` owner) naming it. Wet-ink path: legal uploads the executed copy on the signature record and ticks the formalities.

## Acceptance
- Gates green; `os lint` shows no `approval-approver-not-membership-tier`.
- A seeded 1.2M purchase contract with a deviation opens manager → legal+finance (会签) → executive → GM in
  order; a rejection at any rung ends the chain and unlocks the record.

## Out of scope
Views of the inbox (platform-provided), e-signature (12).
