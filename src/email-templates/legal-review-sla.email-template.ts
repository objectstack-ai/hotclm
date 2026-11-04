import { noticeBundle } from './_bundle.js';

/** F3 `legal_review_sla`: a contract sitting in legal review past its contract type's review SLA. */

const VARIABLES = [
  { name: 'title', description: 'The contract title.' },
  { name: 'contract_number', description: 'The contract number.' },
  { name: 'review_started_at', description: 'When legal review started.' },
];

export const LegalReviewOverSlaTemplates = noticeBundle({
  name: 'clm.legal_review_over_sla',
  description: 'F3: in legal review longer than the contract type\'s review SLA. Sent to the legal owner.',
  variables: VARIABLES,
  en: {
    label: 'Legal review over SLA',
    subject: 'Legal review over SLA: {{ title }}',
    body: 'Contract {{ contract_number }} has been in legal review since {{ review_started_at }}, longer than the review SLA of its contract type. Move it on, or record what it is waiting for.',
  },
  zhCN: {
    label: '法务审查超时限',
    subject: '法务审查超时限：{{ title }}',
    body: '合同 {{ contract_number }} 自 {{ review_started_at }} 起处于法务审查中，已超过该合同类型的审查时限。请推进审查，或记录它在等什么。',
  },
});

export const LegalReviewOverDoubleSlaTemplates = noticeBundle({
  name: 'clm.legal_review_over_double_sla',
  description: 'F3: in legal review longer than twice the contract type\'s review SLA. Sent to the legal owner, with the head of legal copied.',
  variables: VARIABLES,
  en: {
    label: 'Legal review over twice the SLA',
    subject: 'Legal review over twice the SLA: {{ title }}',
    body: 'Contract {{ contract_number }} has been in legal review since {{ review_started_at }}, longer than twice the review SLA of its contract type, so the head of legal is copied.',
  },
  zhCN: {
    label: '法务审查超时限一倍',
    subject: '法务审查超时限一倍：{{ title }}',
    body: '合同 {{ contract_number }} 自 {{ review_started_at }} 起处于法务审查中，已超过该合同类型审查时限的两倍，因此同时抄送法务负责人。',
  },
});
