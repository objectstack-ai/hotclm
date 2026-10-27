import { noticeBundle } from './_bundle.js';

/** F7 `signature_record`: a completed signing round that cannot finish the contract. */

const TITLE = { name: 'title', description: 'The contract title.' };

export const ExecutionCopyMissingTemplates = noticeBundle({
  name: 'clm.execution_copy_missing',
  description: 'F7: every formality is done but no executed copy is attached. Sent to the legal owner, else the contract owner.',
  variables: [TITLE],
  en: {
    label: 'Executed copy missing',
    subject: 'Executed copy missing: {{ title }}',
    body: 'Every execution formality is done on the completed signing round, but no executed copy is attached, so no final signed version could be filed. Upload the executed document on the signature record.',
  },
  zhCN: {
    label: '缺少执行副本',
    subject: '缺少执行副本：{{ title }}',
    body: '这一签署轮次已经完成，执行形式也已全部做齐，但没有附上执行副本，因此无法归档终版签署件。请在签署记录上上传执行副本。',
  },
});

/**
 * The missing formalities arrive twice, once per language, because the list is
 * worked out in the flow and the words for each formality are the field's
 * option labels in that language (`signatureExecution`). Each member reads its own.
 */
export const ExecutionFormalitiesMissingTemplates = noticeBundle({
  name: 'clm.execution_formalities_missing',
  description: 'F7: the signing round completed with execution formalities still unrecorded. Sent to the legal owner, else the contract owner.',
  variables: [
    TITLE,
    { name: 'missing', description: 'The missing formalities, English option labels, comma-separated.' },
    { name: 'missing_zh_cn', description: 'The missing formalities, zh-CN option labels, separated by 、.' },
  ],
  en: {
    label: 'Execution formalities outstanding',
    subject: 'Execution formalities outstanding: {{ title }}',
    body: 'The signing round completed, but this contract cannot be activated until these execution formalities are recorded on the signature round: {{ missing }}.',
  },
  zhCN: {
    label: '执行形式未完成',
    subject: '执行形式未完成：{{ title }}',
    body: '签署轮次已经完成，但以下执行形式在签署记录上登记之前，这份合同不能生效：{{ missing_zh_cn }}。',
  },
});
