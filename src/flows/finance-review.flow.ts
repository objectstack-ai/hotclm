import { expression } from '@objectstack/spec';
import type { Flow } from '@objectstack/spec/automation';
import { must, ref } from './_values.js';

/**
 * 记录财务审查 — finance records its own review of a contract that is still
 * in review or in approval (issue #190, ruling D, 2026-11-03).
 *
 * ## Why finance needs a door at all
 *
 * DESIGN.md §04 gives `clm_finance` "RCU（stage=finance）" on `clm_review`, and
 * `finance.profile.ts` declares it (`review_finance_stage_insert` /
 * `_update`). But `clm_review` is `controlled_by_parent`, and the platform
 * admits a write to a detail row only from a caller who may EDIT its master
 * (ADR-0055 §3, plugin-security's master-write check). Finance edits a
 * contract only from `approved` onward (`contract_finance_post_approval`);
 * before that it READS the contracts the matrix routed to it
 * (`contract_finance_routed`). So on an `in_review` or `in_approval`
 * contract — exactly when a finance review is given — finance@'s own POST or
 * PATCH of its finance review answers 403 "requires edit access to its master
 * record". The ruling keeps that refusal: finance gets no edit on the
 * contract, and the direct writes stay 403. This flow is the one door.
 *
 * ## `runAs: 'system'`, and what that is buying
 *
 * Exactly one thing: the master-write check, which refuses the caller's own
 * write. The run writes one `clm_review` row and nothing on the contract, and
 * it takes every value that names WHO and WHERE from the platform, not from
 * the caller's input:
 *
 *  - the contract is `record`, the row the action route loaded IN THE
 *    CALLER'S SCOPE before the run started. A contract finance cannot read
 *    answers 404 at the route and never reaches this flow. The flow declares
 *    no input that could name another contract, and a door that hands no
 *    record (the trigger route, which starts a flow by name) is refused at
 *    the first decision;
 *  - `reviewer` is `current_user.id`: elevation is not anonymity, the run
 *    carries the caller's `userId` beside `isSystem`, so the review is the
 *    caller's and the audit stamps name them;
 *  - `stage` is the literal `'finance'`.
 *
 * So the elevated write is the write `review_finance_stage_insert` /
 * `_update` already allow finance, on a contract finance can already read —
 * the platform's master-write rule is the only thing stepped around.
 *
 * ## Who may start it: `type: 'screen'` + `requiredPermissions`
 *
 * The same two questions `executed-upload.flow.ts` answers. On 18.x a door
 * that starts a flow by name refuses every non-system caller of a
 * `runAs: 'system'` flow whose type is self-triggered (`autolaunched`,
 * `record_change`, `schedule`), whatever they hold, so the type is `screen`:
 * an entry a member starts from a button, elevated by the author's choice. It
 * has no screen node — the action's dialog collects the three inputs. The
 * gate is `requiredPermissions: ['clm_finance.access']`, a token only
 * `clm_finance` grants (§04), checked at every door before anything runs. The
 * action repeats the list only so the button is hidden from everyone else
 * (`src/actions/finance-review.actions.ts`).
 *
 * ## One review per finance reviewer per contract
 *
 * The run looks for the caller's own finance-stage review of this contract
 * first and UPDATES it when there is one, so a second press restates the
 * review instead of filing a second row. A field the dialog leaves empty on
 * that second press keeps what the review already says: the dialog cannot
 * show the stored values, and an empty box is not a decision to erase the
 * comments the requester has read. `decision` is required, so it is always
 * written. `decided_at` is `review_decision_stamp`'s (`contract.hook.ts`),
 * stamped on the first non-pending decision and never moved.
 *
 * ## Refusals are refused `end` nodes
 *
 * As in every flow here: a refused `end` records the run `refused`, the
 * action's success sentence is suppressed, and the console shows the
 * sentence alone, translated by the
 * `flows.record_finance_review.refusals.<node_id>.message` key
 * (objectstack#15788, objectstack#22450). Both refusals sit before the first
 * read of a review, so a refused run writes nothing.
 */

/** The two contract states a finance review is recorded in (§03: review, then approval). */
export const FINANCE_REVIEW_STATUSES = ['in_review', 'in_approval'] as const;

const HAS_CONTRACT = 'has(vars.record) && vars.record != null && has(vars.record.id) && has(vars.record.status)';
const IN_WINDOW = `vars.record.status in [${FINANCE_REVIEW_STATUSES.map((s) => JSON.stringify(s)).join(', ')}]`;
const NO_CONTRACT = `!(${HAS_CONTRACT})`;
const OUT_OF_WINDOW = `${HAS_CONTRACT} && !(${IN_WINDOW})`;
const RECORDABLE = `${HAS_CONTRACT} && ${IN_WINDOW}`;
const HAS_EXISTING = 'has(vars.existing) && vars.existing != null && has(vars.existing.id)';
const NO_EXISTING = `!(${HAS_EXISTING})`;

/**
 * On the update path: the dialog's value when one was given, otherwise what
 * the stored review already says (see the header).
 */
const givenOrKept = (input: string) =>
  expression(
    `has(vars.${input}) && vars.${input} != null && vars.${input} != "" ? vars.${input} : (has(vars.existing.${input}) ? vars.existing.${input} : null)`,
  );

export const FinanceReviewFlow: Flow = {
  name: 'record_finance_review',
  label: 'Record Finance Review',
  description: "Record the caller's finance review of a contract in review or in approval: create it, or update the one they already gave. Nothing on the contract is written.",
  // An entry a member starts from the 记录财务审查 button. Not `autolaunched`:
  // 18.x refuses every non-system caller at the door of an elevated
  // self-triggered flow, whatever they hold (see the header).
  type: 'screen',
  status: 'active',
  // See the header: elevation steps around the master-write check alone.
  runAs: 'system',
  // The gate: only `clm_finance` holds it (§04). Checked at every door that
  // starts this flow by name, before anything runs.
  requiredPermissions: ['clm_finance.access'],
  successMessage: 'Finance review recorded.',

  // The dialog's three inputs and nothing else: the contract is the record
  // the route loaded in the caller's scope, and the reviewer is the caller.
  variables: [
    { name: 'decision', type: 'text', isInput: true, isOutput: false },
    { name: 'risk_level_assessed', type: 'text', isInput: true, isOutput: false },
    { name: 'comments', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'clm_contract' } },

    { id: 'decide_contract', type: 'decision', label: 'Contract In Review Or Approval?' },
    {
      id: 'refuse_no_contract',
      type: 'end',
      label: 'Refuse — No Contract',
      config: {
        outcome: 'refused',
        message: 'A finance review is recorded from the contract it reviews. Open the contract and use Record Finance Review there.',
      },
    },
    {
      id: 'refuse_stage',
      type: 'end',
      label: 'Refuse — Not In Review Or Approval',
      config: {
        outcome: 'refused',
        message: 'A finance review is recorded while the contract is In Review or In Approval. From Approved onward, finance edits the review on the contract directly.',
      },
    },

    {
      id: 'get_existing',
      type: 'get_record',
      label: "Caller's Finance Review",
      config: {
        objectName: 'clm_review',
        filter: { contract: must('record.id'), stage: 'finance', reviewer: expression('current_user.id') },
        fields: ['id', 'decision', 'risk_level_assessed', 'comments'],
        outputVariable: 'existing',
      },
    },
    { id: 'decide_existing', type: 'decision', label: 'Already Recorded?' },
    {
      id: 'update_review',
      type: 'update_record',
      label: 'Update The Finance Review',
      config: {
        objectName: 'clm_review',
        filter: { id: must('existing.id') },
        fields: {
          decision: ref('decision'),
          risk_level_assessed: givenOrKept('risk_level_assessed'),
          comments: givenOrKept('comments'),
        },
      },
    },
    {
      id: 'create_review',
      type: 'create_record',
      label: 'Record The Finance Review',
      config: {
        objectName: 'clm_review',
        fields: {
          contract: must('record.id'),
          stage: 'finance',
          reviewer: expression('current_user.id'),
          decision: ref('decision'),
          risk_level_assessed: ref('risk_level_assessed'),
          comments: ref('comments'),
        },
        outputVariable: 'created',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'f1', source: 'start', target: 'decide_contract', type: 'default' },
    { id: 'f2', source: 'decide_contract', target: 'refuse_no_contract', type: 'default', label: 'No contract', condition: NO_CONTRACT },
    { id: 'f3', source: 'decide_contract', target: 'refuse_stage', type: 'default', label: 'Outside the window', condition: OUT_OF_WINDOW },
    { id: 'f4', source: 'decide_contract', target: 'get_existing', type: 'default', label: 'In review or approval', condition: RECORDABLE },
    { id: 'f5', source: 'get_existing', target: 'decide_existing', type: 'default' },
    { id: 'f6', source: 'decide_existing', target: 'update_review', type: 'default', label: 'Already recorded', condition: HAS_EXISTING },
    { id: 'f7', source: 'decide_existing', target: 'create_review', type: 'default', label: 'First time', condition: NO_EXISTING },
    { id: 'f8', source: 'update_review', target: 'end', type: 'default' },
    { id: 'f9', source: 'create_review', target: 'end', type: 'default' },
  ],
};
