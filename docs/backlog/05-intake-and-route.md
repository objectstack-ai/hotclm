# F1 intake screen flow · F2 route hook · F6 deviation gate

Milestone: M2 · Labels: `pm:queue` · Blocked-by: 04

## Scope
`src/flows/contract-intake.flow.ts` (F1), route logic in `src/objects/contract.hook.ts` (F2, F6), the
"Launch Contract" action bound to the flow. Adds `requires: ['automation', 'triggers']`.

## Spec — DESIGN.md §06 F1/F2/F6, §02 Launch Form
F1: screen flow — step 1 pick `contract_type` (active only) → step 2 core fields + the optional fields the
type's `intake_fields` lists (`visibleWhen`/`requiredWhen` on the screen fields) → step 3 party: search
`clm_party`, or create one inline; refuse `risk_flag == 'blocked'` → step 4 upload first version file or
tick "draft from template" (which attaches the type's `template_file` as version 1 with kind `draft`) →
create `clm_contract` (`draft`) + `clm_contract_version` v1 → optional "submit now" toggle → `submitted`.
Declare `ai: { exposed: true }` with every input as an `isInput` variable so MCP can complete it headlessly.
F2 (hook, entering `submitted`): stamp category/direction/requires_seal; evaluate active
`clm_approval_rule` rows (category ∈ applies_to or empty; direction match or `any`; amount band;
`only_with_deviation`) and stamp the union of `route_*`; `submitted_at`; if the type requires legal review,
assign `legal_owner` round-robin among holders of `clm_legal_counsel` by open-contract count and enter
`in_review`, else enter `in_approval`.
F6: refuse `in_approval` while any deviation is `open`; an accepted deviation on a clause with
`requires_legal_head` sets `route_legal_head`.

## Acceptance
- Gates green. Launching an NDA through the Console creates contract + v1 and lands in `in_review` with a
  `legal_owner`; a purchase contract above the seeded finance threshold has `route_finance == true`.
- Headless: the flow completes through MCP with all inputs supplied.

## Out of scope
The approval ladder itself (06).
