import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * The contract detail page's header actions — DESIGN.md §05: "header 挂
 * 「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止 / 发起续签」动作,按 status 与门控显隐",
 * plus 撤回 (`withdraw_contract`), the button for §03's `draft → cancelled`
 * row (「发起人撤回」).
 *
 * ## Why these are declarative status writes and not new business logic
 *
 * The state machine already exists and is not here: `contract.hook.ts` owns
 * `TRANSITIONS`, refuses every edge that is not in it, and stamps the lifecycle
 * timestamps on the ones that are (DESIGN.md §03 状态机 — "State transitions are
 * enforced in hooks, never only hidden in the UI"). These actions are the
 * BUTTON, nothing more: each writes one field to the current record, and the
 * hooks fire exactly as they do for a hand edit of the status field.
 *
 * ⚠️ The write is NOT made as the caller. A script action's body is TRUSTED:
 * the platform hands it a system-elevated `ctx.api` (`{ ...caller, isSystem:
 * true }`), and the security layer skips an `isSystem` write entirely — no
 * row-level window, no CHECK, no field-level security. Measured on 17.7.0
 * (issue #90): the server logs `[action-audit] REST action
 * 'clm_contract/submit_contract' — body executes TRUSTED (system-elevated
 * context, RLS/FLS-bypassing)` on every press. What still binds the caller
 * is (1) the route's caller-scoped load of the subject record — a record the
 * caller cannot READ answers 404 before the body runs — and (2)
 * `requiredPermissions`, which ADR-0066 D4 enforces with a 403 on the action
 * route as well as hiding the button. An earlier version of this comment said
 * the write went through "AS THE CALLER", which is why the header Submit kept
 * working while every caller-scoped submission (the intake wizard's "Submit
 * now", a `PATCH` of `status`) was refused by the requester's edit window.
 *
 * That is why `visible` here is a convenience and not a control. A requester
 * who reaches `POST /api/v1/actions/clm_contract/activate_contract` on a draft
 * gets the hook's refusal ("Contract status cannot go from draft to active"),
 * not a silent write — the CEL predicate only spares them the click.
 *
 * ## The one §05 action here that is NOT a status write
 *
 * 发起续签 (renew) is F12. It does not move this contract anywhere: it builds
 * a NEW draft with `renewed_from` pointing back (DESIGN.md §03 — "续签不是
 * 转换"), so it is a flow action rather than one of the transitions above,
 * and it shares its field map with the auto-renew branch of F13 so a renewal
 * looks the same however it was started.
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
  successMessage: string,
  requiredPermissions?: readonly string[],
  options?: {
    /** Offer the button only to the contract's owner (`owner_id`), on top of the status test. */
    ownerOnly?: boolean;
    /** The one confirm question of a param-less action whose write cannot be taken back. */
    confirmText?: string;
  },
): Action => ({
  name,
  label,
  objectName: 'clm_contract',
  icon,
  description,
  // What the toast says once the write has landed. Without it the console
  // falls back to its generic 「操作已成功完成」 / "Action completed
  // successfully", which leaves the user reading the status chip to learn
  // whether the right thing happened (issue #158). One fixed sentence per
  // transition, no `{{ record.* }}` hole: the toast shows on the contract's
  // own page, under a header that already names it.
  successMessage,
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
    // `ownerOnly` also puts its two display tests INTO the body, because for
    // such an action they are the only thing that limits it: the body is
    // trusted (it skips the caller's row-level edit window), the action has no
    // `requiredPermissions`, and the hook allows `${to}` from more than one
    // status. Without the guard, anyone who can READ a contract could post
    // this action at it in any status the hook lets reach `${to}` — measured:
    // the owner's press on their own `in_approval` contract answered 200 and
    // wrote `cancelled`. `ctx.record` is the route's caller-scoped load and
    // `ctx.user` the caller. The other actions keep the bare write; their
    // targets are reachable from one status only, or a capability gates them.
    source: options?.ownerOnly
      ? `const id = ctx.recordId; const rec = ctx.record || {}; const me = ctx.user && ctx.user.id;`
        + ` if (rec.status !== '${from}') throw new Error('Only a ${from} contract can be changed this way; this one is ' + rec.status + '.');`
        + ` if (!me || rec.owner_id !== me) throw new Error('Only the owner of this contract can do this.');`
        + ` await ctx.api.object('clm_contract').update({ id, status: '${to}' }, { where: { id } });`
      : `const id = ctx.recordId; await ctx.api.object('clm_contract').update({ id, status: '${to}' }, { where: { id } });`,
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
  //
  // `ownerOnly` adds `record.owner_id == current_user.id`, the same
  // `current_user` the requester's row policies read. Like the status test it
  // is a convenience, not a control — see `WithdrawContractAction` for what
  // refuses a non-owner.
  visible: options?.ownerOnly
    ? P`record.status == ${from} && record.owner_id == current_user.id`
    : P`record.status == ${from}`,
  ...(requiredPermissions ? { requiredPermissions: [...requiredPermissions] } : {}),
  ...(options?.confirmText ? { confirmText: options.confirmText } : {}),
  // The status this button writes is the status the header shows, and the
  // status every one of these `visible` predicates reads. The spec defaults
  // `refreshAfter` to `false` (materialized at parse), and the record page
  // re-reads the record only when it is `true`. Measured on 17.7.0 (issue
  // #94): without it each press answered `200 {"success":true}` and toasted
  // success while the header kept the old stage and the old button until a
  // manual reload; no `GET` of the record followed the action.
  refreshAfter: true,
});

/** 提交 — the requester hands the draft over. No capability gate. What limits
 *  whose draft can be submitted here is the route's caller-scoped READ of the
 *  record (see the header) — NOT `clm_requester`'s
 *  `contract_requester_edit_window`, which the trusted body skips. The
 *  caller-scoped doors (the intake wizard, a `PATCH`) are judged by that
 *  window, and land inside it since F2's onward hop became a system write
 *  (`contract_route_onward`). On submission F2 (`contract_route`) stamps the
 *  `route_*` approval flags and either assigns a legal owner or, for a type
 *  without legal review, hops straight to `in_approval`. */
export const SubmitContractAction: Action = transition(
  'submit_contract', 'Submit', 'send',
  'draft', 'submitted',
  'Hand the draft over. Its approval route is worked out, and it is either assigned to a lawyer for review or, for a type without legal review, sent straight to approval.',
  'Contract submitted.',
);

/**
 * 撤回 — the owner takes back their own draft: `draft → cancelled`, the
 * 「发起人撤回」 half of DESIGN.md §03's last transition row
 * (「draft / … → cancelled | 发起人撤回或法务作废」). It adds no edge: the
 * hook's `TRANSITIONS` already lists `cancelled` from `draft`, and this is the
 * button for it, as `submit_contract` is the button for `draft → submitted`.
 * It is also the owner's way out of a draft they no longer want — the intake
 * wizard abandoned after its first version step leaves exactly such a draft,
 * and the requester can neither delete it (§04 grants RCU) nor, before this,
 * end it from the page.
 *
 * Shown only to the owner, only on a draft, and refused to everyone else.
 * A caller who cannot read the contract — another requester — is answered
 * 404 by the route's caller-scoped load before the body runs (see the
 * header). Everything else is refused by the body itself (`ownerOnly`): the
 * hook allows `cancelled` from six statuses and this action carries no
 * capability, so the status and owner tests the button shows under are
 * re-checked server-side. A reader who is not the owner (legal, the CLM
 * administrator) is neither offered nor served it; legal's own way to
 * `cancelled` is its edit grant on the status field — the 「法务作废」 half —
 * and it is untouched here. `cancelled` is terminal, so the press is
 * confirmed first.
 */
export const WithdrawContractAction: Action = transition(
  'withdraw_contract', 'Withdraw', 'undo-2',
  'draft', 'cancelled',
  'Withdraw your own draft. It becomes Cancelled, which is final.',
  'Draft withdrawn. The contract is cancelled.',
  undefined,
  {
    ownerOnly: true,
    confirmText: 'Withdraw this draft? It becomes Cancelled, which is final: it cannot be submitted or reopened. To go ahead later, launch a new contract.',
  },
);

/** 受理 — legal takes the file. F2 normally assigns `legal_owner` on submission;
 *  this is the manual counterpart for a type that requires no auto-assignment. */
export const AcceptContractAction: Action = transition(
  'accept_contract', 'Accept for Review', 'file-search',
  'submitted', 'in_review',
  'Take a submitted contract into legal review.',
  'Accepted into legal review.',
  ['clm_legal.access'],
);

/** 送审 — review is done, start the approval ladder (F5). F6's deviation gate refuses
 *  this while any deviation is still `open`; the refusal comes from the hook. */
export const SendForApprovalAction: Action = transition(
  'send_for_approval', 'Send for Approval', 'git-branch',
  'in_review', 'in_approval',
  'Close legal review and start approval. Not possible while any deviation is still open.',
  'Sent for approval.',
  ['clm_legal.access'],
);

/** 发起签署 — approved, now get it signed. */
export const StartSigningAction: Action = transition(
  'start_signing', 'Start Signing', 'pen-line',
  'approved', 'signing',
  'Move an approved contract into signing.',
  'Signing started.',
  ['execute_contract'],
);

/** 生效 — the execution formalities are complete. F9 (`contract_activate`)
 *  stamps `activated_at` and opens the renewal-reminder obligation.
 *
 *  The description no longer promises a payment schedule. Decision #14 was
 *  ruled A on 2026-09-09: F9 expands NO intake-captured payment arrangement,
 *  because nothing at intake can capture one and §04 gives the requester read
 *  only on `clm_payment_plan`. Finance creates the schedule after activation,
 *  on the contract's own tab. A button whose text promises a side effect the
 *  flow does not perform is the same defect as the declaration the ruling
 *  deleted, one layer up. */
export const ActivateContractAction: Action = transition(
  'activate_contract', 'Activate', 'circle-check',
  'signing', 'active',
  'Bring a signed contract into force. Its activation date is recorded and, if it has an end date, a renewal reminder is set up.',
  'Contract activated.',
  ['execute_contract'],
);

/**
 * 终止 — end an active contract early. `terminate_contract` is the §04
 * capability named for exactly this action.
 *
 * The ONE action here that collects something. DESIGN.md §03's guard on
 * `active → terminated` is "closed_at 与终止原因必填", and decision #6 was
 * ruled A on 2026-09-09: `clm_contract.termination_reason` is that field,
 * asked once, at termination, and never on the intake form. This dialog is
 * where it is asked — which is also why the field is not in any contract
 * type's `intake_fields`.
 *
 * The write carries both values, so the transition and its reason land
 * together: the field's `requiredWhen` and the state machine's own guard each
 * refuse a termination without one, and a button that fired the status write
 * alone would hit both refusals every time.
 *
 * The body is hand-written rather than built by `transition()` because it is
 * the only one with a second field. `ctx.input` is the action's params bag;
 * `ctx.record` is a read-only snapshot, so the write goes through `ctx.api`
 * exactly as the others do, and the hook fires exactly as for a hand edit.
 */
export const TerminateContractAction: Action = {
  name: 'terminate_contract',
  label: 'Terminate',
  objectName: 'clm_contract',
  icon: 'circle-x',
  // The confirm question lives HERE, not in `confirmText`: an action with
  // params and a `confirmText` shows two dialogs for one decision, and
  // `description` renders under the param dialog's own title. One condition,
  // one wording, one dialog.
  description: 'Terminate this contract? It is a terminal state — the contract cannot be reactivated, only renewed as a new one. The reason is required and is recorded on the contract.',
  type: 'script',
  body: {
    language: 'js',
    source: "const id = ctx.recordId; const reason = ctx.input && ctx.input.termination_reason; await ctx.api.object('clm_contract').update({ id, status: 'terminated', termination_reason: reason }, { where: { id } });",
    capabilities: ['api.write'],
  },
  locations: ['record_header'],
  visible: P`record.status == 'active'`,
  requiredPermissions: ['terminate_contract'],
  successMessage: 'Contract terminated.',
  params: [
    {
      field: 'termination_reason',
      required: true,
      helpText: 'Why the contract is ending early — counterparty breach, no longer needed, agreed between the parties. Legal and audit ask this first.',
    },
  ],
  refreshAfter: true,
};

/**
 * 发起续签 — F12's button (DESIGN.md §05 header actions, §06 F12
 * "动作「发起续签」预填新 draft").
 *
 * A flow, not a transition: renewal creates a NEW contract carrying
 * `renewed_from`, and §03 is explicit that it is not a status change. The
 * flow refuses a second renewal on a contract that already has one, so the
 * button is safe to press twice.
 *
 * Visible on a contract whose term is running out or has run out — `active`
 * covers the ordinary case (the F12 sweep flags `is_expiring` and the
 * notification points here) and `expired` covers the one that ran out before
 * anyone acted.
 */
export const StartRenewalAction: Action = {
  name: 'start_renewal',
  label: 'Start Renewal',
  objectName: 'clm_contract',
  icon: 'refresh-cw',
  description: 'Create a renewal draft pre-filled from this contract and linked back to it. Renewal is a new contract, not a status change.',
  type: 'flow',
  target: 'renewal_start',
  locations: ['record_header'],
  visible: P`record.status == 'active' || record.status == 'expired'`,
  successMessage: 'Renewal draft created.',
  refreshAfter: true,
};
