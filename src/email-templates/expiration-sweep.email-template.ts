import { noticeBundle } from './_bundle.js';

/** F13 `expiration_sweep`: the day a contract's term runs out. */

const VARIABLES = [
  { name: 'title', description: 'The contract title.' },
  { name: 'contract_number', description: 'The contract number.' },
  { name: 'end_date', description: 'The contract end date.' },
];

export const ContractExpiredTemplates = noticeBundle({
  name: 'clm.contract_expired',
  description: 'F13: a contract that does not auto-renew passed its end date and was marked expired. Sent to the contract owner and the legal owner.',
  variables: VARIABLES,
  en: {
    label: 'Contract expired',
    subject: 'Expired: {{ title }}',
    body: 'Contract {{ contract_number }} ended on {{ end_date }} and is now expired. It does not auto-renew. Start a renewal if the relationship continues, and hand it to the records desk for archiving.',
  },
  zhCN: {
    label: '合同已到期',
    subject: '已到期：{{ title }}',
    body: '合同 {{ contract_number }} 已于 {{ end_date }} 结束，现已到期，且不会自动续约。如需继续合作，请发起续签；并请交给档案与记录管理员归档。',
  },
});

export const ContractAutoRenewedTemplates = noticeBundle({
  name: 'clm.contract_auto_renewed',
  description: 'F13: an auto-renewing contract passed its end date and a renewal draft was created. Sent to the contract owner and the legal owner.',
  variables: VARIABLES,
  en: {
    label: 'Renewal drafted',
    subject: 'Renewal drafted: {{ title }}',
    body: 'Contract {{ contract_number }} auto-renews and its term ended on {{ end_date }}, so a renewal draft has been created and linked back to it. Review the terms and submit it.',
  },
  zhCN: {
    label: '已生成续签草稿',
    subject: '已生成续签草稿：{{ title }}',
    body: '合同 {{ contract_number }} 设为自动续约，期限已于 {{ end_date }} 结束，系统已生成一份续签草稿并回链到这份合同。请核对条款后提交。',
  },
});
