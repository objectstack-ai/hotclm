import { P, expression } from '@objectstack/spec';
import type { Flow } from '@objectstack/spec/automation';
import { CLM_POSITION } from '../sharing/positions.js';

/**
 * F5 `contract_approval` — the approval ladder (DESIGN.md §06 F5, §03 状态机,
 * §04 岗位).
 *
 * DESIGN.md §03 五个刻意的取舍 fixes the ladder at five rungs — 直接主管 →
 * 法务负责人 → 财务负责人 → 分管领导 → 总经理 — and gives the matrix one job:
 * decide WHICH rungs are climbed, never what the rungs are. So this flow is a
 * fixed graph with decision nodes between the rungs, and the decisions read
 * flags. They do not compute them.
 *
 * ## It READS `route_*`; the routing algorithm lives in exactly one place
 *
 * `contract_route` (F2, `contract.hook.ts`, card 05) evaluates
 * `clm_approval_rule` on the write that submits the contract and stamps the
 * UNION of every matching rule's `route_*` onto the record; F6 adds
 * `route_legal_head` when a deviation from a clause marked
 * `requires_legal_head` is accepted. By the time this flow runs, the answer is
 * already on the row. Re-deriving it here would put a second copy of the
 * matrix in the product — one that can disagree with the flags the contract
 * detail page shows, the two `route_*` sharing rules grant on (§04
 * `contract_executive_routed` / `contract_gm_routed`), and the audit reads.
 * The only thing this flow does to a flag is NORMALISE it (see
 * `normalize_routing` below), and that changes no decision.
 *
 * ## The rungs
 *
 *  1. **Direct manager** — `{ type: 'manager' }`, always, no flag. The engine
 *     resolves it from the CONTRACT OWNER's `sys_user.manager_id`, not the
 *     submitter's: with no `value` on the approver, `expandApprovers` reads
 *     `record[value] ?? record.owner_id` and looks up that user's manager.
 *     MEASURED on 17.3.0 — a contract owned by a requester whose manager is
 *     set, submitted by a DIFFERENT user who has no manager at all, opened
 *     rung 1 on the owner's manager. That is the right subject for this
 *     ladder (the contract belongs to its owner, and §04 scopes the requester
 *     window by `owner_id`), but it means a contract whose owner has no
 *     manager resolves to nobody — see `RUNG_POLICY.onEmptyApprovers`.
 *  2. **Legal head and/or finance controller** — three shapes, selected by the
 *     two flags: both ⇒ ONE node with `behavior: 'per_group'` (会签 — the
 *     legal group and the finance group must each clear it, and one rejection
 *     from either finalises the node as rejected); exactly one ⇒ a
 *     single-position node; neither ⇒ the rung is not entered at all. Three
 *     nodes rather than one, because an approval node's `approvers` are static
 *     metadata: there is no way to include a group conditionally.
 *  3. **Executive** — `route_executive`, position `clm_executive`.
 *  4. **General manager** — `route_gm`, position `clm_general_manager`.
 *
 * Every rung is `lockRecord: true` and mirrors onto `approval_status`, and
 * every rung's `reject` edge goes to the same terminal pair: one veto ends the
 * chain (`ApprovalNodeConfigSchema`: "In every mode a single rejection
 * finalizes the node as `rejected`").
 *
 * ## Approvers are POSITIONS, never membership tiers
 *
 * `{ type: 'position', value: 'clm_legal_head' }` resolves through
 * `sys_user_position` by machine NAME (ADR-0090 D3). The neighbouring type,
 * `org_membership_level`, resolves against `sys_member.role`, whose vocabulary
 * is the closed builtin tier list — authoring a position name there matches
 * NOBODY and the request then waits forever with no error. That is the
 * `approval-approver-not-membership-tier` lint this card's acceptance names,
 * and it is why the position names come from `CLM_POSITION` (card 04) rather
 * than being spelled again here.
 *
 * ## `runAs: 'system'`, and why it is not optional
 *
 * DESIGN.md §06's closing line: a record_change flow that reacts to an
 * approval decision must be `system`. Three reasons, each sufficient:
 * the approvals service mirrors its decision back with a SYSTEM write that
 * carries no user, and a run whose trigger supplied no user has no identity to
 * scope to — under the default `runAs: 'user'` its data operations are refused
 * outright (`FlowSchema.runAs`); the terminal `status` write lands on a record
 * this flow's own nodes have been holding locked; and a gate that exists to
 * CONSTRAIN the submitter must not be evaluated under the submitter's scope.
 *
 * ## What this flow does NOT author: the send-back edge
 *
 * DESIGN.md §06 F5 and §03 both say send-back returns the contract to `draft`.
 * ADR-0044's send-back cannot express that, and the mismatch is not a detail
 * this card may resolve on its own — it is raised as a decision card instead
 * of guessed at. Measured on @objectstack 17.3.0:
 *
 *  - the `revise` out-edge must target an `approval_revise` node, and NOTHING
 *    may sit between them, so there is no node on which to write
 *    `status: 'draft'` as the run walks into the revise window
 *    (`assertReviseEdge` refuses any other target, and the same rule gates
 *    `os lint`);
 *  - the revise window unlocks the record but leaves it in `in_approval`,
 *    where §04's row-level write window (`draft`/`submitted` for the
 *    requester) does not let the submitter edit the contract they were asked
 *    to rework;
 *  - `ApprovalService.sendBack` mirrors the literal `returned` onto
 *    `approvalStatusField`, and `clm_contract.approval_status` (§03) offers
 *    `not_required` / `pending` / `approved` / `rejected` only — the mirror
 *    write is wrapped in a try/catch that logs a warning, so a value outside
 *    the field's vocabulary fails SILENTLY.
 *
 * With no `revise` edge, `sendBack` refuses BEFORE any mutation, naming the
 * missing edge ("the flow does not support send-back for revision") — the
 * request stays pending and the approver can still approve or reject. That is
 * the honest degradation while the question is open; §03's other route out of
 * `in_approval` (reject, then `rejected → draft` 修改重提) stays available and
 * is what the ladder ships with.
 */

/**
 * `has()`-guarded truth test on a normalised flag. Written against
 * `vars.route`, never against the record: see `normalize_routing`.
 *
 * The polarity pairs below must PARTITION — a decision's out-edges are
 * evaluated independently and an unevaluable one aborts the step rather than
 * skipping it (17.x), so each pair is written in explicit opposite polarity
 * rather than relying on a default edge.
 */
const routed = (flag: string): string => `(has(vars.route) && has(vars.route.${flag}) && vars.route.${flag} == true)`;
const notRouted = (flag: string): string => `(!has(vars.route) || !has(vars.route.${flag}) || vars.route.${flag} != true)`;
/** Both halves of one rung decision, as a CEL predicate envelope. */
const when = (...clauses: string[]) => expression(clauses.join(' && '));

/**
 * The one registered function F5 calls. Contractually pure — it takes the four
 * flags, returns four booleans, and touches nothing else.
 *
 * It exists because a stored boolean does not arrive as one shape. The
 * automation engine says so in its own re-entrancy warning: "booleans persist
 * as 0/1 on SQLite/libsql and CEL `1 != true` is true". An edge written
 * `vars.contractRecord.route_gm == true` would then read FALSE, the
 * general-manager rung would be skipped, and nothing anywhere would say so —
 * the silent mis-route this ladder must not have.
 *
 * MEASURED on this deployment (better-sqlite3, 17.3.0), both ends: the column
 * really does store `1` (`SELECT route_gm FROM clm_contract` → `1`, a JS
 * number), and the data engine's READ coerces it to a real boolean before it
 * reaches a flow (`GET /api/v1/data/clm_contract/<id>` → `"route_gm": true`,
 * typeof boolean). So on this driver the coercion below is a no-op and a bare
 * `== true` edge would have worked. It stays because the property that makes
 * it a no-op is the READ path's, not the flag's: the engine's warning names
 * drivers where the raw `1` reaches CEL, and the cost of being wrong there is
 * a rung that is silently not climbed. One coercion, in one place, is what
 * makes the six edges below driver-independent.
 *
 * This is a NORMALISATION, not a derivation: no rule is read, no threshold is
 * compared, no flag is invented. `false` in is `false` out.
 */
export function normalizeRouteFlags({ input }: { input: Record<string, unknown> }): {
  legal: boolean;
  finance: boolean;
  executive: boolean;
  gm: boolean;
} {
  const truthy = (value: unknown): boolean =>
    value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'TRUE';
  return {
    legal: truthy(input.legal),
    finance: truthy(input.finance),
    executive: truthy(input.executive),
    gm: truthy(input.gm),
  };
}

/** Every rung shares this policy; only the approvers and the behaviour differ. */
const RUNG_POLICY = {
  // Explicit even though `admin_rescue` is the schema default: an unstaffed
  // position resolving to an empty slate is the failure this ladder is most
  // exposed to (five of its six rungs route to positions), and the policy that
  // handles it is authored, not inherited. `auto_approve` would wave a
  // contract through a rung nobody sat on — the worst outcome an approval
  // ladder has; `fail` would abandon a locked record with no request at all.
  //
  // MEASURED end to end on 17.3.0, by unstaffing `clm_general_manager` and
  // driving a routed contract into `gm_signoff`: the request OPENS with
  // `pending_approvers = ['position:clm_general_manager']` — an unresolvable
  // literal, nobody's inbox — and the boot log carries both warnings
  // (`approver 'position:clm_general_manager' expanded to nobody` and
  // `resolved to no concrete approver — the request is decidable only by a
  // privileged admin`). The record stays locked: a PATCH answers 409
  // RECORD_LOCKED even for the platform admin. The recovery is real — a
  // platform admin's `POST /api/v1/approvals/requests/<id>/approve` answered
  // 200, resumed the run and carried the contract to `approved`, while the
  // same call from a non-approver non-admin answered 403 FORBIDDEN — but it
  // is API-ONLY in Console 17.3.0: neither the inbox's All tab nor the
  // request record page renders an approve/reject/reassign control for the
  // override actor (#3424). That residual is a platform gap, recorded in the
  // PR rather than papered over here: the lint's suggested fallback
  // (`{ type: 'org_membership_level', value: 'owner' }`) would seat the org
  // owner on the legal, finance, executive and GM rungs as a silent
  // co-approver, and DESIGN.md §03 fixes the ladder at five NAMED rungs with
  // the matrix deciding only which are climbed (§13 Q3 puts an extra approver
  // in the customer overlay, not the standard product).
  onEmptyApprovers: 'admin_rescue' as const,
  lockRecord: true,
  approvalStatusField: 'approval_status',
};

export const ContractApprovalFlow: Flow = {
  name: 'contract_approval',
  label: 'Contract Approval Ladder',
  description: 'Five-rung approval for a contract entering approval: direct manager, then the legal/finance joint sign-off, the executive and the general manager as the routing flags require.',
  type: 'record_change',
  status: 'active',
  // See the header — the approvals service's mirror write carries no user.
  runAs: 'system',

  variables: [
    { name: 'contractId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      config: {
        objectName: 'clm_contract',
        triggerType: 'record-after-update',
        // ENTERING `in_approval`, not "is in approval". `previous` is bound on
        // every record-change dispatch (and to `null` on the insert leg), so
        // the transition itself is expressible — which matters more here than
        // it looks:
        //
        //  - the ladder's own mirror writes (`approval_status` → pending,
        //    approved, …) are updates on a record still in `in_approval`, and
        //    a "is in approval" guard would re-fire the flow on each of them,
        //    opening a second ladder on the same contract;
        //  - guarding on `approval_status` instead (the shape HotCRM uses)
        //    would leave the RESUBMISSION path dead: §03 sends a rejected
        //    contract back to `draft` for rework, and its `approval_status` is
        //    still `rejected` when it re-enters approval, so the ladder would
        //    never open a second time — silently.
        //
        // Total over a sparse row: `has()` before every read, because an
        // unevaluable condition ABORTS the dispatch rather than skipping it.
        condition: P`has(record.status) && record.status == "in_approval"
          && (previous == null || !has(previous.status) || previous.status != "in_approval")`,
      },
    },
    {
      id: 'get_contract',
      type: 'get_record',
      label: 'Get Contract',
      config: { objectName: 'clm_contract', filter: { id: '{record.id}' }, outputVariable: 'contractRecord' },
    },
    {
      id: 'normalize_routing',
      type: 'script',
      label: 'Read Routing Flags',
      config: {
        function: 'clm_route_flags',
        inputs: {
          legal: '{contractRecord.route_legal_head}',
          finance: '{contractRecord.route_finance}',
          executive: '{contractRecord.route_executive}',
          gm: '{contractRecord.route_gm}',
        },
        outputVariable: 'route',
      },
    },

    // ── Rung 1: the direct manager, on every contract ─────────────────────
    {
      id: 'manager_review',
      type: 'approval',
      label: 'Direct Manager',
      config: {
        // No `value`: the engine resolves the submitter's `sys_user.manager_id`
        // (`APPROVER_VALUE_BINDINGS.manager` is `{ source: 'auto' }`).
        approvers: [{ type: 'manager' }],
        behavior: 'first_response',
        ...RUNG_POLICY,
      },
    },

    // ── Rung 2: legal head and/or finance controller ──────────────────────
    { id: 'decision_rung2', type: 'decision', label: 'Legal / Finance Rung?' },
    {
      id: 'legal_finance_joint',
      type: 'approval',
      label: 'Head of Legal + Finance Controller (会签)',
      config: {
        // 会签: `per_group` advances only once EACH group has reached
        // `minApprovals`. The two group labels are what make them two groups —
        // approvers without one each form their own group, which would be the
        // same arithmetic here but stops being so the moment a position is
        // held by two people.
        approvers: [
          { type: 'position', value: CLM_POSITION.legalHead, group: 'legal' },
          { type: 'position', value: CLM_POSITION.financeController, group: 'finance' },
        ],
        behavior: 'per_group',
        // One sign-off per group. Declared rather than left to the default
        // (which is also 1 for `per_group`) because it is the number that
        // makes this 会签 rather than a quorum, and it is clamped at runtime
        // to the resolvable approver count, so it can never deadlock.
        minApprovals: 1,
        ...RUNG_POLICY,
      },
    },
    {
      id: 'legal_only',
      type: 'approval',
      label: 'Head of Legal',
      config: {
        approvers: [{ type: 'position', value: CLM_POSITION.legalHead }],
        behavior: 'first_response',
        ...RUNG_POLICY,
      },
    },
    {
      id: 'finance_only',
      type: 'approval',
      label: 'Finance Controller',
      config: {
        approvers: [{ type: 'position', value: CLM_POSITION.financeController }],
        behavior: 'first_response',
        ...RUNG_POLICY,
      },
    },

    // ── Rung 3: the executive ─────────────────────────────────────────────
    { id: 'decision_executive', type: 'decision', label: 'Executive Rung?' },
    {
      id: 'executive_signoff',
      type: 'approval',
      label: 'Executive',
      config: {
        approvers: [{ type: 'position', value: CLM_POSITION.executive }],
        behavior: 'first_response',
        ...RUNG_POLICY,
      },
    },

    // ── Rung 4: the general manager ───────────────────────────────────────
    { id: 'decision_gm', type: 'decision', label: 'General Manager Rung?' },
    {
      id: 'gm_signoff',
      type: 'approval',
      label: 'General Manager',
      config: {
        approvers: [{ type: 'position', value: CLM_POSITION.generalManager }],
        behavior: 'first_response',
        ...RUNG_POLICY,
      },
    },

    // ── Terminal: approved ────────────────────────────────────────────────
    {
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: {
        objectName: 'clm_contract',
        filter: { id: '{record.id}' },
        // `status` only. `approved_at` is stamped by the state machine on this
        // very edge (`contract.hook.ts`: `from === 'in_approval' && to ===
        // 'approved'` ⇒ `input.approved_at = now`), so writing it here would
        // be a second writer for one column — and the hook's is the one the
        // §03 table names. DESIGN.md §06 F5's "approve → approved +
        // approved_at" is delivered by the pair, not by this node alone.
        fields: { status: 'approved' },
      },
    },
    {
      id: 'notify_approved',
      type: 'notify',
      label: 'Notify Owner — Approved',
      config: {
        // `owner_id` is the platform ownership anchor and the security
        // middleware stamps the acting user on any insert that leaves it
        // empty, so the business owner is always someone.
        recipients: '{contractRecord.owner_id}',
        channels: ['inbox', 'email'],
        topic: 'clm_contract_approved',
        title: 'Contract approved: {contractRecord.title}',
        message: 'Your contract {contractRecord.title} has cleared every approval rung. It can now go out for signature.',
        sourceObject: 'clm_contract',
        sourceId: '{record.id}',
      },
    },

    // ── Terminal: rejected (one veto, from any rung) ──────────────────────
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: {
        objectName: 'clm_contract',
        filter: { id: '{record.id}' },
        fields: { status: 'rejected' },
      },
    },
    {
      id: 'notify_rejected',
      type: 'notify',
      label: 'Notify Owner — Rejected',
      config: {
        recipients: '{contractRecord.owner_id}',
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'clm_contract_rejected',
        title: 'Contract rejected: {contractRecord.title}',
        // §03's way forward is `rejected → draft` 修改重提 — but the copy does
        // NOT tell the owner to do it themselves, because measured against
        // card 04's row window they cannot: §04 lets a requester edit their
        // own contract only while it is `draft` or `submitted`, so the same
        // PATCH that legal answers 200 answers the owner 403 on a `rejected`
        // contract. Naming the person who can act is the honest instruction;
        // whether §03 and §04 should agree here is a maintainer decision this
        // card files rather than settles.
        message: 'Your contract {contractRecord.title} was rejected in approval. The approver\'s comment is on the approval record. Ask legal to return the contract to draft if you want to rework and resubmit it.',
        sourceObject: 'clm_contract',
        sourceId: '{record.id}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e01', source: 'start', target: 'get_contract', type: 'default' },
    { id: 'e02', source: 'get_contract', target: 'normalize_routing', type: 'default' },
    { id: 'e03', source: 'normalize_routing', target: 'manager_review', type: 'default' },

    // Rung 1 decision. An approval node's out-edges are selected by matching
    // the decision against the edge LABEL, not by a condition.
    { id: 'e04', source: 'manager_review', target: 'decision_rung2', type: 'default', label: 'approve' },
    { id: 'e05', source: 'manager_review', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Rung 2 selection — four branches over two flags, in opposite polarity so
    // they partition: exactly one is true for every pair of values.
    {
      id: 'e06', source: 'decision_rung2', target: 'legal_finance_joint', type: 'default', label: 'Legal + finance (会签)',
      condition: when(routed('legal'), routed('finance')),
    },
    {
      id: 'e07', source: 'decision_rung2', target: 'legal_only', type: 'default', label: 'Legal only',
      condition: when(routed('legal'), notRouted('finance')),
    },
    {
      id: 'e08', source: 'decision_rung2', target: 'finance_only', type: 'default', label: 'Finance only',
      condition: when(notRouted('legal'), routed('finance')),
    },
    {
      id: 'e09', source: 'decision_rung2', target: 'decision_executive', type: 'default', label: 'Neither — skip the rung',
      condition: when(notRouted('legal'), notRouted('finance')),
    },

    { id: 'e10', source: 'legal_finance_joint', target: 'decision_executive', type: 'default', label: 'approve' },
    { id: 'e11', source: 'legal_finance_joint', target: 'mark_rejected', type: 'default', label: 'reject' },
    { id: 'e12', source: 'legal_only', target: 'decision_executive', type: 'default', label: 'approve' },
    { id: 'e13', source: 'legal_only', target: 'mark_rejected', type: 'default', label: 'reject' },
    { id: 'e14', source: 'finance_only', target: 'decision_executive', type: 'default', label: 'approve' },
    { id: 'e15', source: 'finance_only', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Rung 3 selection.
    {
      id: 'e16', source: 'decision_executive', target: 'executive_signoff', type: 'default', label: 'Routed',
      condition: when(routed('executive')),
    },
    {
      id: 'e17', source: 'decision_executive', target: 'decision_gm', type: 'default', label: 'Skip the rung',
      condition: when(notRouted('executive')),
    },
    { id: 'e18', source: 'executive_signoff', target: 'decision_gm', type: 'default', label: 'approve' },
    { id: 'e19', source: 'executive_signoff', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Rung 4 selection.
    {
      id: 'e20', source: 'decision_gm', target: 'gm_signoff', type: 'default', label: 'Routed',
      condition: when(routed('gm')),
    },
    {
      id: 'e21', source: 'decision_gm', target: 'mark_approved', type: 'default', label: 'Skip the rung',
      condition: when(notRouted('gm')),
    },
    { id: 'e22', source: 'gm_signoff', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e23', source: 'gm_signoff', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Terminals.
    { id: 'e24', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e25', source: 'notify_approved', target: 'end', type: 'default' },
    { id: 'e26', source: 'mark_rejected', target: 'notify_rejected', type: 'default' },
    { id: 'e27', source: 'notify_rejected', target: 'end', type: 'default' },
  ],
};
