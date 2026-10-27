import { noticeBundle } from './_bundle.js';

/** F10 `obligation_due`: an open obligation seven days out, due today, or past due. Sent to the obligation owner. */

const VARIABLES = [
  { name: 'title', description: 'The obligation title.' },
  { name: 'due_date', description: 'The obligation due date.' },
];

export const ObligationDueSoonTemplates = noticeBundle({
  name: 'clm.obligation_due_soon',
  description: 'F10: an open obligation falls due in seven days. Sent to the obligation owner.',
  variables: VARIABLES,
  en: {
    label: 'Obligation due in 7 days',
    subject: 'Due in 7 days: {{ title }}',
    body: 'This contract obligation is due on {{ due_date }}. Record progress, or mark it done once it is performed.',
  },
  zhCN: {
    label: '履约义务 7 天后到期',
    subject: '7 天后到期：{{ title }}',
    body: '这项合同履约义务将于 {{ due_date }} 到期。请记录进展，履行后把它标记为已完成。',
  },
});

export const ObligationDueTodayTemplates = noticeBundle({
  name: 'clm.obligation_due_today',
  description: 'F10: an open obligation falls due today. Sent to the obligation owner.',
  variables: VARIABLES,
  en: {
    label: 'Obligation due today',
    subject: 'Due today: {{ title }}',
    body: 'This contract obligation is due today ({{ due_date }}). It moves into overdue tomorrow if it is not done or waived.',
  },
  zhCN: {
    label: '履约义务今天到期',
    subject: '今天到期：{{ title }}',
    body: '这项合同履约义务今天（{{ due_date }}）到期。如果今天没有完成或豁免，明天会转为已逾期。',
  },
});

export const ObligationOverdueTemplates = noticeBundle({
  name: 'clm.obligation_overdue',
  description: 'F10: an open obligation passed its due date and was marked overdue. Sent to the obligation owner.',
  variables: VARIABLES,
  en: {
    label: 'Obligation overdue',
    subject: 'Overdue: {{ title }}',
    body: 'This contract obligation was due on {{ due_date }} and is now overdue. Perform it and mark it done, or ask legal to waive it.',
  },
  zhCN: {
    label: '履约义务已逾期',
    subject: '已逾期：{{ title }}',
    body: '这项合同履约义务应于 {{ due_date }} 完成，现已逾期。请履行后把它标记为已完成，或请法务豁免。',
  },
});
