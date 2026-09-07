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
  TITLE_QUALIFIERS,
} from './prose.js';

/**
 * `demo-en` — the English demo bundle, and the SOURCE language.
 *
 * DESIGN.md §01 makes English the source of every label, and this fixture
 * follows: `demo-zh` translates these rows, it is not a second dataset. The
 * two bundles are interchangeable by construction — both satisfy
 * {@link DemoStrings}, and every row is generated from `../plan.ts`, which
 * never sees a locale.
 */
export const EN: DemoStrings = {
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
  jurisdictions: JURISDICTIONS,
};
