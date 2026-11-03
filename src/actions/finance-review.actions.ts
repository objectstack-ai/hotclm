import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * 记录财务审查 — finance records its own review of a contract in review or in
 * approval (issue #190, ruling D, 2026-11-03).
 *
 * DESIGN.md §04 grants `clm_finance` "RCU（stage=finance）" on `clm_review`,
 * but a `controlled_by_parent` detail is written only by a caller who may
 * edit its master, and finance edits a contract only from `approved` onward.
 * The ruling keeps finance off the contract and gives the review its own
 * door instead: this button starts `record_finance_review`
 * (`src/flows/finance-review.flow.ts`), which writes the caller's
 * `stage: 'finance'` review system-elevated, creating it or updating the one
 * they already gave, and writes nothing on the contract. The flow's header
 * says what the elevation does and does not buy.
 *
 * ## The gate: `clm_finance.access`
 *
 * A token `clm_finance` already holds and no other set grants (§04), the
 * same way `clm_legal.access` serves the legal-only actions; no capability
 * is added. Declared twice with the same list, as `executed_upload` does:
 * the flow's `requiredPermissions` stops the request at every door that
 * starts it by name, and this copy hides the button, because the console's
 * action strip and MCP `list_actions` read the action, not the flow behind
 * it (objectstack#25643). The action route also refuses a caller without it,
 * 403, before the flow is looked at.
 *
 * ## `visible` is a convenience, not the control
 *
 * Shown while the contract is `in_review` or `in_approval`, the window in
 * which finance cannot write its review any other way. From `approved`
 * onward finance edits the review directly, as §04 has always said. The
 * flow repeats the status test as a refused end, so a caller who reaches the
 * route on a contract in any other state is told so and nothing is written.
 *
 * ## The dialog
 *
 * The three fields of the review the reviewer decides, field-backed on
 * `clm_review` (`objectOverride`) so each inherits that field's label, type
 * and options in both locales. `decision` is required: a review recorded
 * with no decision is not a review. The reviewer, the stage and the contract
 * are not asked: the caller, `finance`, and the contract on screen.
 */
export const RecordFinanceReviewAction: Action = {
  name: 'record_finance_review',
  label: 'Record Finance Review',
  objectName: 'clm_contract',
  icon: 'calculator',
  type: 'flow',
  target: 'record_finance_review',
  locations: ['record_header'],
  description: 'Record your finance review of this contract. Pressing it again updates the review you already gave; a field left empty keeps what the review says. The contract itself is not changed.',
  visible: P`record.status == 'in_review' || record.status == 'in_approval'`,
  // The same list as the flow's (see the header): this copy hides the button.
  requiredPermissions: ['clm_finance.access'],
  params: [
    { field: 'decision', objectOverride: 'clm_review', required: true },
    { field: 'risk_level_assessed', objectOverride: 'clm_review' },
    { field: 'comments', objectOverride: 'clm_review', helpText: 'Visible to the requester.' },
  ],
  successMessage: 'Finance review recorded.',
  refreshAfter: true,
};
