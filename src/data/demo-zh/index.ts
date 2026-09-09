// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { DemoStrings } from '../strings.js';
import { APPROVAL_RULES, CLAUSES, CONTRACT_TYPES } from './catalog.js';
import { PARTIES } from './parties.js';
import {
  DEVIATION_JUSTIFICATIONS,
  DEVIATION_TEXTS,
  JURISDICTIONS,
  OBLIGATION_TITLES,
  PAYMENT_CONDITIONS,
  REVIEW_COMMENTS,
  REVIEW_INTERNAL_NOTES,
  RISK_NOTES,
  SIGNATURE_NOTES,
  TERMINATION_REASONS,
  TITLE_QUALIFIERS,
} from './prose.js';

/**
 * `demo-zh` —— 同一份演示数据的中文版本。
 *
 * DESIGN.md §01 规定英文是源语言，本 bundle 是它的翻译而不是第二份数据集：
 * 两者都实现 {@link DemoStrings}，而每一行都由 `../plan.ts` 生成，计划本身
 * 从不接触任何 locale。行数、状态分布与相对于启动时刻的日期因此在两种语言下
 * 完全相同 —— 不是靠人工核对，而是结构上不可能不同。
 */
export const ZH_CN: DemoStrings = {
  contractTypes: CONTRACT_TYPES,
  clauses: CLAUSES,
  approvalRules: APPROVAL_RULES,
  parties: PARTIES,
  riskNotes: RISK_NOTES,
  titleQualifiers: TITLE_QUALIFIERS,
  obligationTitles: OBLIGATION_TITLES,
  paymentConditions: PAYMENT_CONDITIONS,
  reviewComments: REVIEW_COMMENTS,
  reviewInternalNotes: REVIEW_INTERNAL_NOTES,
  deviationTexts: DEVIATION_TEXTS,
  deviationJustifications: DEVIATION_JUSTIFICATIONS,
  signatureNotes: SIGNATURE_NOTES,
  terminationReasons: TERMINATION_REASONS,
  jurisdictions: JURISDICTIONS,
};
