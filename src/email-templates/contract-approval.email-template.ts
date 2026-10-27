import { noticeBundle } from './_bundle.js';

/** F5 `contract_approval`: the two terminal outcomes, told to the contract owner. */

const TITLE = { name: 'title', description: 'The contract title.' };

export const ContractApprovedTemplates = noticeBundle({
  name: 'clm.contract_approved',
  description: 'F5: every approval rung cleared. Sent to the contract owner.',
  variables: [TITLE],
  en: {
    label: 'Contract approved',
    subject: 'Contract approved: {{ title }}',
    body: 'Your contract {{ title }} has cleared every approval rung. It can now go out for signature.',
  },
  zhCN: {
    label: '合同已批准',
    subject: '合同已批准：{{ title }}',
    body: '你的合同「{{ title }}」已通过全部审批层级，现在可以发起签署。',
  },
});

export const ContractRejectedTemplates = noticeBundle({
  name: 'clm.contract_rejected',
  description: 'F5: one rung rejected the contract. Sent to the contract owner.',
  variables: [TITLE],
  en: {
    label: 'Contract rejected',
    subject: 'Contract rejected: {{ title }}',
    body: 'Your contract {{ title }} was rejected in approval. The approver\'s comment is on the approval record. Ask legal to return the contract to draft if you want to rework and resubmit it.',
  },
  zhCN: {
    label: '合同已驳回',
    subject: '合同已驳回：{{ title }}',
    body: '你的合同「{{ title }}」在审批中被驳回，审批人的意见记录在审批记录上。如需修改后重新提交，请联系法务把合同退回草稿。',
  },
});
