// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { ApprovalRule } from '../objects/approval-rule.object.js';
import { Clause } from '../objects/clause.object.js';
import { ContractType } from '../objects/contract-type.object.js';

import { STRINGS } from './demo-locale.js';
import { APPROVAL_RULE_PLAN, CLAUSE_PLAN, CONTRACT_TYPE_PLAN } from './plan.js';
import { assertUniqueKeys } from './_shared.js';

/**
 * The three configuration objects a contract runs against: the nine contract
 * types, the thirty-clause playbook and the six-rule approval matrix
 * (DESIGN.md §10).
 *
 * These are seeded FIRST and everything else depends on them. `clm_contract`
 * resolves `contract_type` against a type's `name`, and `clm_deviation`
 * resolves `clause` against a clause's `title`; the loader's topological sort
 * would hoist them regardless, but the barrel lists them first so the ordering
 * is legible without knowing that.
 *
 * `template_file` and `template_placeholders` are NOT seeded. A `file` value
 * is an opaque `sys_file` id minted by an upload, and a seed cannot mint one —
 * the same wall `clm_contract_version` runs into, and the same answer: an
 * id-shaped placeholder would point at nothing while looking like a document
 * the type ships with.
 */

const typeNames = STRINGS.contractTypes.map((type) => type.name);
assertUniqueKeys('clm_contract_type', typeNames);
assertUniqueKeys('clm_clause', STRINGS.clauses.map((clause) => clause.title));
assertUniqueKeys('clm_approval_rule', [...STRINGS.approvalRules]);

export const contractTypeSeed = defineSeed(ContractType, {
  externalId: 'name',
  mode: 'upsert',
  records: CONTRACT_TYPE_PLAN.map((type, i) => ({
    name: STRINGS.contractTypes[i]!.name,
    code: type.code,
    direction: type.direction,
    category: type.category,
    description: STRINGS.contractTypes[i]!.description,
    intake_fields: [...type.intakeFields],
    requires_legal_review: type.requiresLegalReview,
    execution_formalities: [...type.executionFormalities],
    sign_method: type.signMethod,
    review_sla_days: type.reviewSlaDays,
    default_term_months: type.defaultTermMonths,
    retention_years: type.retentionYears,
    is_active: true,
  })),
});

export const clauseSeed = defineSeed(Clause, {
  externalId: 'title',
  mode: 'upsert',
  records: CLAUSE_PLAN.map((clause, i) => ({
    title: STRINGS.clauses[i]!.title,
    category: clause.category,
    risk_level: clause.riskLevel,
    standard_text: STRINGS.clauses[i]!.standardText,
    fallback_text: STRINGS.clauses[i]!.fallbackText,
    position_note: STRINGS.clauses[i]!.positionNote,
    applies_to: [...clause.appliesTo],
    requires_legal_head: clause.requiresLegalHead,
    is_active: true,
  })),
});

export const approvalRuleSeed = defineSeed(ApprovalRule, {
  externalId: 'name',
  mode: 'upsert',
  records: APPROVAL_RULE_PLAN.map((rule, i) => ({
    name: STRINGS.approvalRules[i]!,
    // Empty `applies_to` and `direction: 'any'` mean "every contract": the
    // bands of DESIGN.md §10 are drawn on AMOUNT, and narrowing them by
    // category as well would leave contracts that match no rule at all.
    applies_to: [],
    direction: 'any' as const,
    amount_min: rule.amountMin,
    amount_max: rule.amountMax,
    only_with_deviation: rule.onlyWithDeviation,
    route_legal_head: rule.routeLegalHead,
    route_finance: rule.routeFinance,
    route_executive: rule.routeExecutive,
    route_gm: rule.routeGm,
    priority: rule.priority,
    is_active: true,
  })),
});
