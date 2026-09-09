// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The English prose pools — the sentences the generators draw on so that six
 * hundred child rows read like a working contract database rather than one
 * line repeated.
 *
 * Each pool has a fixed length declared in `../strings.ts`, and `../plan.ts`
 * picks from it by a deterministic index. That is what keeps `demo-en` and
 * `demo-zh` row-for-row identical: the two bundles supply different strings at
 * the same positions, and the plan never sees which language it is drawing.
 */

/** Distinguishes a second contract of the same type with the same counterparty. */
export const TITLE_QUALIFIERS: readonly string[] & { length: 8 } = [
  'Renewal',
  'Phase 2',
  'EU entity',
  'APAC entity',
  'Extension',
  'Pilot',
  'Regional',
  'Uplift',
] as const;

/** Risk notes: two blocked counterparties and one under watch. */
export const RISK_NOTES: readonly string[] & { length: 3 } = [
  'Sanctions screening returned a match on a controlling shareholder. No new business until cleared by the head of legal.',
  'Company registration could not be verified against any national register. Blocked pending evidence of incorporation.',
  'Two late payments in the last twelve months. Finance asks to be consulted before any extension of credit.',
] as const;

export const OBLIGATION_TITLES = {
  deliverable: [
    'Deliver the implementation plan',
    'Complete user acceptance testing',
    'Hand over the configuration baseline',
    'Provide the migration runbook',
    'Deliver the training materials',
    'Complete the integration build',
  ] as readonly string[] & { length: 6 },
  payment: [
    'Issue the quarterly invoice',
    'Settle the milestone invoice',
    'Reconcile the annual true-up',
    'Release the retention amount',
  ] as readonly string[] & { length: 4 },
  report: [
    'Submit the quarterly service report',
    'Provide the annual security attestation',
    'Deliver the sub-processor register update',
    'Submit the usage statement',
  ] as readonly string[] & { length: 4 },
  renewal: [
    'Give notice of non-renewal',
    'Confirm the renewal position with the business',
    'Start the renewal negotiation',
  ] as readonly string[] & { length: 3 },
  compliance: [
    'Refresh the insurance certificate',
    'Complete the annual sanctions re-screen',
    'Confirm continued data-transfer safeguards',
    'Provide the anti-bribery compliance statement',
  ] as readonly string[] & { length: 4 },
  other: [
    'Update the contract register entry',
    'File the executed counterpart',
    'Confirm the named contacts remain current',
  ] as readonly string[] & { length: 3 },
} as const;

export const PAYMENT_CONDITIONS: readonly string[] & { length: 6 } = [
  'On signature of the agreement.',
  'On acceptance of the milestone deliverable.',
  'Quarterly in advance, on the first business day of the quarter.',
  'On delivery and inspection of the goods.',
  'On completion of the annual service period.',
  'Retention, released thirty days after final acceptance.',
] as const;

export const REVIEW_COMMENTS: readonly string[] & { length: 8 } = [
  'Terms are within the playbook. No changes required before approval.',
  'Liability cap sits above our standard position; the business has accepted the exposure in writing.',
  'Payment terms extended to sixty days at the counterparty’s request. Finance has been consulted.',
  'The data-processing schedule needs the transfer mechanism named before this can move on.',
  'Two clauses are outside the playbook and are recorded as deviations; both need a decision.',
  'Counterparty redline removes the audit right. That is not acceptable — reverting to our text.',
  'Scope is clear and the milestone schedule matches the commercial proposal.',
  'Governing law changed to the counterparty’s jurisdiction. Acceptable here given the enforcement treaty.',
] as const;

export const REVIEW_INTERNAL_NOTES: readonly string[] & { length: 6 } = [
  'The business is under time pressure; do not let that drive the liability position.',
  'Counterparty’s counsel has conceded this point on two previous deals — hold the line.',
  'Watch the indemnity: their draft narrows it to registered rights only.',
  'Finance flagged the counterparty’s payment history. Keep the set-off right.',
  'If they push again on the audit clause, escalate rather than concede.',
  'Their standard form is materially better than the last version they sent; worth reusing.',
] as const;

export const DEVIATION_TEXTS: readonly string[] & { length: 8 } = [
  'Counterparty asks to raise the aggregate liability cap to three times the annual fees.',
  'Counterparty asks to delete the mutual exclusion of indirect loss.',
  'Counterparty asks for payment terms of ninety days rather than thirty.',
  'Counterparty asks to remove the customer’s right of set-off entirely.',
  'Counterparty asks to retain ownership of bespoke deliverables and grant a term licence only.',
  'Counterparty asks to remove the audit right from the data-processing schedule.',
  'Counterparty asks for an uncapped annual price increase at its discretion.',
  'Counterparty asks to shorten the confidentiality survival period to twelve months.',
] as const;

export const DEVIATION_JUSTIFICATIONS: readonly string[] & { length: 6 } = [
  'The counterparty is the only supplier qualified for this scope and will not move.',
  'The commercial value justifies the exposure; the business owner has accepted it in writing.',
  'The same position was accepted on the previous agreement with this counterparty.',
  'Rejecting this would delay the programme past the board-approved start date.',
  'The exposure is bounded in practice because the engagement is fixed price.',
  'Requested by the business without a supporting rationale; legal recommends refusal.',
] as const;

export const SIGNATURE_NOTES: readonly string[] & { length: 4 } = [
  'Envelope sent to both signatories; awaiting the counterparty’s signature.',
  'Signed electronically by both parties. Countersigned copy filed.',
  'Wet-ink round: originals exchanged by courier and the company seal applied.',
  'Notarisation booked; the witnessed copy is still outstanding.',
] as const;

/**
 * Why the four terminated contracts were ended early — the answer legal and
 * audit ask for first, which is why `termination_reason` is required to
 * terminate at all (DESIGN.md §03, decision #6).
 */
export const TERMINATION_REASONS: readonly string[] & { length: 4 } = [
  'Counterparty in material breach: three consecutive missed delivery milestones, unremedied after written notice.',
  'Business need withdrawn — the programme this contract supported was cancelled at the mid-year review.',
  'Terminated by mutual agreement; the parties settled the outstanding balance and released each other.',
  'Counterparty entered insolvency proceedings; terminated on the insolvency clause with immediate effect.',
] as const;

/** Court or arbitral seat, paired with the three governing laws in `../plan.ts`. */
export const JURISDICTIONS: readonly string[] & { length: 3 } = [
  'Courts of New York County, New York',
  'Courts of England and Wales, London',
  'Landgericht Frankfurt am Main',
] as const;
