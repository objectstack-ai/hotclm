import { noticeBundle } from './_bundle.js';

/** F4 `turn_stalled`: the negotiation turn has sat with the counterparty too long. */

export const TurnStalledTemplates = noticeBundle({
  name: 'clm.turn_stalled',
  description: 'F4: the turn has been with the counterparty for more than 7 days. Sent to the contract owner.',
  variables: [
    { name: 'title', description: 'The contract title.' },
    { name: 'contract_number', description: 'The contract number.' },
    { name: 'turn_since', description: 'When the turn passed to the counterparty.' },
  ],
  en: {
    label: 'Waiting on the counterparty',
    subject: 'Waiting on the counterparty since {{ turn_since }}: {{ title }}',
    body: 'The turn on contract {{ contract_number }} has been with the counterparty for more than 7 days. Chase them, or take the turn back and record where the negotiation stands.',
  },
  zhCN: {
    label: '等待对方回复',
    subject: '自 {{ turn_since }} 起等待对方回复：{{ title }}',
    body: '合同 {{ contract_number }} 的谈判轮次在对方手里已超过 7 天。请催促对方，或把轮次收回，并记录谈判进展到哪一步。',
  },
});
