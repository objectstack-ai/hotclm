import type { Flow } from '@objectstack/spec/automation';
import { ContractIntakeFlow, refuseIntake } from './contract-intake.flow.js';
import { ContractApprovalFlow, normalizeRouteFlags } from './contract-approval.flow.js';
import { SignatureRecordFlow, SignatureRecordOnCreateFlow, signatureExecution } from './signature-record.flow.js';
import { notifyRecipients, positionHolders } from './_daily-sweep.js';
import { LegalReviewSlaFlow } from './legal-review-sla.flow.js';
import { TurnStalledFlow } from './turn-stalled.flow.js';
import { ObligationDueFlow } from './obligation-due.flow.js';
import { PaymentOverdueFlow } from './payment-overdue.flow.js';
import { RenewalNoticeFlow, RenewalStartFlow, renewalDraft, renewalWindow } from './renewal-notice.flow.js';
import { ExpirationSweepFlow } from './expiration-sweep.flow.js';
import { ExecutedUploadFlow, backfillStamps, refuseBackfill } from './executed-upload.flow.js';

// F1–F16 of DESIGN.md §06; this barrel is what `defineStack({ flows })` reads.
// F8 (e-signature) and F15 (CRM hand-off) arrive with cards 12 and 13.
export { ContractIntakeFlow } from './contract-intake.flow.js';
export { ContractApprovalFlow } from './contract-approval.flow.js';
export { SignatureRecordFlow, SignatureRecordOnCreateFlow } from './signature-record.flow.js';
export { LegalReviewSlaFlow } from './legal-review-sla.flow.js';
export { TurnStalledFlow } from './turn-stalled.flow.js';
export { ObligationDueFlow } from './obligation-due.flow.js';
export { PaymentOverdueFlow } from './payment-overdue.flow.js';
export { RenewalNoticeFlow, RenewalStartFlow } from './renewal-notice.flow.js';
export { ExpirationSweepFlow } from './expiration-sweep.flow.js';
export { ExecutedUploadFlow } from './executed-upload.flow.js';

export const allFlows: Flow[] = [
  ContractIntakeFlow,
  ContractApprovalFlow,
  SignatureRecordFlow,
  SignatureRecordOnCreateFlow,
  // The reminder layer (card 09). Six scheduled jobs, all `runAs: 'system'`
  // with the reason on `sweepFlow` in `_daily-sweep.ts`, plus the two
  // action-launched flows the reminders point at.
  LegalReviewSlaFlow,
  TurnStalledFlow,
  ObligationDueFlow,
  PaymentOverdueFlow,
  RenewalNoticeFlow,
  ExpirationSweepFlow,
  RenewalStartFlow,
  ExecutedUploadFlow,
];

/**
 * Named functions the flows' `script` nodes call by string
 * (`defineStack({ functions })`). Pure by contract: each returns or throws;
 * none writes. That is what keeps every data operation on the flow graph,
 * where the run can count it.
 */
export const flowFunctions = {
  clm_intake_refuse: refuseIntake,
  clm_route_flags: normalizeRouteFlags,
  clm_signature_execution: signatureExecution,
  // Card 09. The first two are shared by all six daily jobs — see the header
  // of `_daily-sweep.ts` for why the six have a shared shape at all; the last
  // three are per-job arithmetic the platform CEL cannot do (§12 gap #7).
  clm_position_holders: positionHolders,
  clm_notify_recipients: notifyRecipients,
  clm_renewal_window: renewalWindow,
  clm_renewal_draft: renewalDraft,
  clm_backfill_stamps: backfillStamps,
  // The refusal channel both action-launched flows share. `end` nodes with
  // `outcome: 'refused'` parse but do nothing on 17.4.0 (objectstack#15788) —
  // see `refuseBackfill` for the reading.
  clm_backfill_refuse: refuseBackfill,
};
