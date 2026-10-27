import type { EmailTemplateDefinition } from '@objectstack/spec/system';
import { ContractApprovedTemplates, ContractRejectedTemplates } from './contract-approval.email-template.js';
import { ExecutionCopyMissingTemplates, ExecutionFormalitiesMissingTemplates } from './signature-record.email-template.js';
import { RenewalNoticeDueTemplates } from './renewal-notice.email-template.js';
import { ContractAutoRenewedTemplates, ContractExpiredTemplates } from './expiration-sweep.email-template.js';
import { LegalReviewOver30DaysTemplates, LegalReviewOver60DaysTemplates } from './legal-review-sla.email-template.js';
import { TurnStalledTemplates } from './turn-stalled.email-template.js';
import { ObligationDueSoonTemplates, ObligationDueTodayTemplates, ObligationOverdueTemplates } from './obligation-due.email-template.js';
import { PaymentOverdueTemplates } from './payment-overdue.email-template.js';

/**
 * Every notification this app sends itself, one `email_template` bundle each
 * (`en-US` + `zh-CN`). `defineStack({ emailTemplates })` reads this list; the
 * notify node that sends one names it in its `template` key.
 */
export const allEmailTemplates: EmailTemplateDefinition[] = [
  ...ContractApprovedTemplates,
  ...ContractRejectedTemplates,
  ...ExecutionCopyMissingTemplates,
  ...ExecutionFormalitiesMissingTemplates,
  ...RenewalNoticeDueTemplates,
  ...ContractExpiredTemplates,
  ...ContractAutoRenewedTemplates,
  ...LegalReviewOver30DaysTemplates,
  ...LegalReviewOver60DaysTemplates,
  ...TurnStalledTemplates,
  ...ObligationDueSoonTemplates,
  ...ObligationDueTodayTemplates,
  ...ObligationOverdueTemplates,
  ...PaymentOverdueTemplates,
];
