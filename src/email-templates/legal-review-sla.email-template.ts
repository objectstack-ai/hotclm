import { noticeBundle } from './_bundle.js';

/** F3 `legal_review_sla`: a contract sitting in legal review past a fixed threshold. */

const VARIABLES = [
  { name: 'title', description: 'The contract title.' },
  { name: 'contract_number', description: 'The contract number.' },
  { name: 'review_started_at', description: 'When legal review started.' },
];

export const LegalReviewOver30DaysTemplates = noticeBundle({
  name: 'clm.legal_review_over_30_days',
  description: 'F3: in legal review for more than 30 days. Sent to the legal owner.',
  variables: VARIABLES,
  en: {
    label: 'In legal review over 30 days',
    subject: 'In legal review over 30 days: {{ title }}',
    body: 'Contract {{ contract_number }} has been in legal review since {{ review_started_at }} — more than 30 days. This is a fixed 30-day threshold, not this contract type\'s own review SLA. Move it on, or record what it is waiting for.',
  },
  zhCN: {
    label: '法务审查超过 30 天',
    subject: '法务审查超过 30 天：{{ title }}',
    body: '合同 {{ contract_number }} 自 {{ review_started_at }} 起处于法务审查中，已超过 30 天。这是固定的 30 天阈值，不是该合同类型自己的审查时限。请推进审查，或记录它在等什么。',
  },
});

export const LegalReviewOver60DaysTemplates = noticeBundle({
  name: 'clm.legal_review_over_60_days',
  description: 'F3: in legal review for more than 60 days. Sent to the legal owner, with the head of legal copied.',
  variables: VARIABLES,
  en: {
    label: 'In legal review over 60 days',
    subject: 'In legal review over 60 days: {{ title }}',
    body: 'Contract {{ contract_number }} has been in legal review since {{ review_started_at }} — more than 60 days, twice the 30-day reminder threshold, so the head of legal is copied. This is a fixed threshold, not this contract type\'s own review SLA.',
  },
  zhCN: {
    label: '法务审查超过 60 天',
    subject: '法务审查超过 60 天：{{ title }}',
    body: '合同 {{ contract_number }} 自 {{ review_started_at }} 起处于法务审查中，已超过 60 天，是 30 天提醒阈值的两倍，因此同时抄送法务负责人。这是固定阈值，不是该合同类型自己的审查时限。',
  },
});
