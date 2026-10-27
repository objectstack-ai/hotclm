import { noticeBundle } from './_bundle.js';

/**
 * F11 `payment_overdue`: an unpaid instalment past its planned date.
 *
 * `actual_amount` is null on an instalment that went from due to overdue with
 * nothing received, and a bare hole renders null as nothing ("received so far
 * ."). The mail renderer has no conditional to drop the clause, but its
 * `default` formatter fills an empty value, so the hole reads 0 there: nothing
 * received is exactly what null means on this column. Amounts stay bare
 * numbers: the `currency` formatter takes its ISO code as a literal in the
 * template, and this bundle serves every contract currency.
 */

export const PaymentOverdueTemplates = noticeBundle({
  name: 'clm.payment_overdue',
  description: 'F11: an instalment that is not settled passed its planned date and was marked overdue. Sent to the contract owner and the finance controllers.',
  variables: [
    { name: 'seq', description: 'The instalment number within the schedule.' },
    { name: 'title', description: 'The contract title.' },
    { name: 'contract_number', description: 'The contract number.' },
    { name: 'planned_date', description: 'The instalment planned date.' },
    { name: 'planned_amount', description: 'The instalment planned amount, in the contract currency.' },
    { name: 'actual_amount', description: 'The amount received or paid on the instalment so far; null when nothing has been, which the body shows as 0.' },
  ],
  en: {
    label: 'Instalment overdue',
    subject: 'Instalment {{ seq }} overdue: {{ title }}',
    body: 'Instalment {{ seq }} of contract {{ contract_number }} was due on {{ planned_date }} and is not settled. Planned {{ planned_amount }}; received so far {{ actual_amount | default:0 }}.',
  },
  zhCN: {
    label: '分期已逾期',
    subject: '第 {{ seq }} 期已逾期：{{ title }}',
    body: '合同 {{ contract_number }} 的第 {{ seq }} 期应于 {{ planned_date }} 收付，目前尚未结清。计划金额 {{ planned_amount }}，目前已收付 {{ actual_amount | default:0 }}。',
  },
});
