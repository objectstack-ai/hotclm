import { noticeBundle } from './_bundle.js';

/** F12 `renewal_notice`: the non-renewal notice window has opened. */

export const RenewalNoticeDueTemplates = noticeBundle({
  name: 'clm.renewal_notice_due',
  description: 'F12: the contract is inside its notice-of-non-renewal window. Sent to the contract owner and the legal owner.',
  variables: [
    { name: 'title', description: 'The contract title.' },
    { name: 'contract_number', description: 'The contract number.' },
    { name: 'end_date', description: 'The contract end date.' },
    { name: 'deadline', description: 'The last day notice of non-renewal can be given.' },
    { name: 'notice_days', description: 'The contract\'s notice period, in days.' },
  ],
  en: {
    label: 'Renewal decision due',
    subject: 'Renewal decision due: {{ title }}',
    body: 'Contract {{ contract_number }} ends on {{ end_date }}, and notice of non-renewal is owed by {{ deadline }} ({{ notice_days }} days before). Start a renewal from the contract page, or give notice.',
  },
  zhCN: {
    label: '需决定是否续签',
    subject: '需决定是否续签：{{ title }}',
    body: '合同 {{ contract_number }} 将于 {{ end_date }} 到期，不续约通知须在 {{ deadline }} 前发出（到期前 {{ notice_days }} 天）。请在合同页面发起续签，或发出不续约通知。',
  },
});
