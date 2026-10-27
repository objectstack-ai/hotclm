import { noticeBundle } from './_bundle.js';

/**
 * F11 `payment_overdue`: an unpaid instalment past its planned date.
 *
 * Both amounts render with `number:2`: grouped and with two decimals in the
 * recipient's own locale (71,100.00 in zh-CN and en, 71 100,00 in fr-FR), the
 * shape the Console gives a currency field. The mail renderer takes exactly
 * one formatter per hole and has no conditional, and `number` renders a null
 * as nothing. A hole cannot also carry `default:0`: a second pipe is read as
 * the first formatter's argument, so null would print that text literally.
 *
 * So the null is settled before the template. `actual_amount` is null on an
 * instalment that went from due to overdue with nothing received, and nothing
 * received is exactly what null means on that column. The flow's
 * `templateData` coalesces it to 0 in CEL, where branching belongs, and the
 * hole here only formats a number. `planned_amount` is required, so it is
 * never null.
 *
 * Amounts carry no currency symbol: the `currency` formatter takes its ISO
 * code as a literal in the template, and this bundle serves every contract
 * currency.
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
    { name: 'actual_amount', description: 'The amount received or paid on the instalment so far, in the contract currency; 0 when nothing has been (the flow coalesces a null).' },
  ],
  en: {
    label: 'Instalment overdue',
    subject: 'Instalment {{ seq }} overdue: {{ title }}',
    body: 'Instalment {{ seq }} of contract {{ contract_number }} was due on {{ planned_date }} and is not settled. Planned {{ planned_amount | number:2 }}; received so far {{ actual_amount | number:2 }}.',
  },
  zhCN: {
    label: '分期已逾期',
    subject: '第 {{ seq }} 期已逾期：{{ title }}',
    body: '合同 {{ contract_number }} 的第 {{ seq }} 期应于 {{ planned_date }} 收付，目前尚未结清。计划金额 {{ planned_amount | number:2 }}，目前已收付 {{ actual_amount | number:2 }}。',
  },
});
