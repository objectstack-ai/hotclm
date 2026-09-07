import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * The contract detail page's header actions — DESIGN.md §05: "header 挂
 * 「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止 / 发起续签」动作,按 status 与门控显隐".
 *
 * ## Why these are declarative status writes and not new business logic
 *
 * The state machine already exists and is not here: `contract.hook.ts` owns
 * `TRANSITIONS`, refuses every edge that is not in it, and stamps the lifecycle
 * timestamps on the ones that are (DESIGN.md §03 状态机 — "State transitions are
 * enforced in hooks, never only hidden in the UI"). These actions are the
 * BUTTON, nothing more: each writes one field to the current record on the data
 * plane AS THE CALLER, so the object permission, the row-level write window and
 * the hook all fire exactly as they do for a hand edit of the status field.
 *
 * That is why `visible` here is a convenience and not a control. A requester
 * who reaches `POST /api/v1/actions/clm_contract/activate_contract` on a draft
 * gets the hook's refusal ("Contract status cannot go from draft to active"),
 * not a silent write — the CEL predicate only spares them the click. The half
 * that IS a control is `requiredPermissions`, which ADR-0066 D4 enforces with a
 * 403 on the action route as well as hiding the button.
 *
 * ## The one §05 action that is NOT here
 *
 * 发起续签 (renew) is F12, and F12 is card 09. It is not a status write: it
 * builds a NEW draft with `renewed_from` pointing back, which is a flow. A
 * seventh entry here would have had to fake it.
 *
 * ## `approve_contract` is not a header action either
 *
 * The approval decision is taken in the platform approval centre (F5 opens a
 * `sys_approval_request` and holds the record lock), which is why 待我处理 in
 * the navigation is `approvals:inbox` and why `in_approval` has no button here:
 * a header action that wrote `approved` would bypass the ladder that is the
 * whole point of §06 F5.
 */

/** One §05 header action: a single-field status write, gated by status and capability. */
const transition = (
  name: string,
  label: string,
  icon: string,
  from: string,
  to: string,
  description: string,
  requiredPermissions?: readonly string[],
): Action => ({
  name,
  label,
  objectName: 'clm_contract',
  icon,
  description,
  // An L2 sandboxed body, NOT the declarative `operation: 'update'` / `patch`
  // pair. That pair was written first and measured second: `pnpm validate`
  // answers "sets `operation` but this action property is planned — declared,
  // and a consumer is being built against it (not read YET)", twice per action.
  // A button wired to a key nothing reads is a button that does nothing, which
  // is the one thing AGENTS.md's "Honest capabilities" rule forbids. The body
  // below is executed today, so the transition below happens today.
  //
  // `ctx.record` is the runner's snapshot of the current record — read-only, so
  // the write goes back through `ctx.api`, which is also what makes the hook
  // and the row-level policy fire. One capability: `api.write`.
  //
  // The call shape is the one `src/objects/_hook-api.ts` already pins for this
  // platform version: `update(doc-with-its-own-id, { where })`, with NO
  // `(id, doc)` overload. `updateById` was written first and answered
  // `400 VALIDATION_ERROR — TypeError: not a function`; a probe body enumerated
  // the sandbox's object facade and it carries exactly
  // `find/findOne/count/aggregate/insert/update/delete/updateMany/deleteMany/upsert`.
  // (The spec's lint docblock lists `insert|create|update|updateById` — that is
  // the LINT's ledger of spellings it inspects for write targets, not the
  // runtime surface, and reading it as the latter is what produced the wrong
  // call.) `ctx.recordId` is a first-class key on the action context.
  type: 'script',
  body: {
    language: 'js',
    source: `const id = ctx.recordId; await ctx.api.object('clm_contract').update({ id, status: '${to}' }, { where: { id } });`,
    capabilities: ['api.write'],
  },
  locations: ['record_header'],
  // NOT `P\`record.status == '${from}'\`` — the `P` tagged template
  // JSON-escapes an interpolated STRING into a complete CEL literal, so hand
  // quotes around it produce `record.status == '"draft"'`: a comparison
  // against the four-character value `"draft"`, which no row ever holds. That
  // predicate is false for every record, so every button is hidden — and a
  // button hidden by a broken predicate looks exactly like a button correctly
  // hidden by status. Measured, not reasoned: `GET /api/v1/meta/actions`
  // served `source: "record.status == '\\"submitted\\"'"` and the header
  // rendered zero actions on a draft AND on a signing contract.
  visible: P`record.status == ${from}`,
  ...(requiredPermissions ? { requiredPermissions: [...requiredPermissions] } : {}),
});

/** 提交 — the requester hands the draft over. No capability gate: the row-level
 *  write window (`clm_requester`'s `contract_requester_edit_window`) is what
 *  says whose draft this is, and every set that edits contracts carries its own. */
export const SubmitContractAction: Action = transition(
  'submit_contract', 'Submit', 'send',
  'draft', 'submitted',
  'Hand the draft to legal. Routing (F2) stamps the approval flags and either assigns a reviewer or sends it straight to approval.',
);

/** 受理 — legal takes the file. F2 normally assigns `legal_owner` on submission;
 *  this is the manual counterpart for a type that requires no auto-assignment. */
export const AcceptContractAction: Action = transition(
  'accept_contract', 'Accept for Review', 'file-search',
  'submitted', 'in_review',
  'Take a submitted contract into legal review.',
  ['clm_legal.access'],
);

/** 送审 — review is done, start the approval ladder. F6's deviation gate refuses
 *  this while any deviation is still `open`; the refusal comes from the hook. */
export const SendForApprovalAction: Action = transition(
  'send_for_approval', 'Send for Approval', 'git-branch',
  'in_review', 'in_approval',
  'Close legal review and open the approval ladder (F5). Refused while any deviation is still open.',
  ['clm_legal.access'],
);

/** 发起签署 — approved, now get it signed. */
export const StartSigningAction: Action = transition(
  'start_signing', 'Start Signing', 'pen-line',
  'approved', 'signing',
  'Move an approved contract into signing.',
  ['execute_contract'],
);

/** 生效 — the execution formalities are complete. */
export const ActivateContractAction: Action = transition(
  'activate_contract', 'Activate', 'circle-check',
  'signing', 'active',
  'Bring a signed contract into force. F9 stamps `activated_at` and builds the renewal reminder and payment schedule.',
  ['execute_contract'],
);

/** 终止 — end an active contract early. `terminate_contract` is the §04
 *  capability named for exactly this action. */
export const TerminateContractAction: Action = transition(
  'terminate_contract', 'Terminate', 'circle-x',
  'active', 'terminated',
  'End an active contract before its term runs out.',
  ['terminate_contract'],
);
