// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { ApprovalRule } from '../objects/approval-rule.object.js';
import { Clause } from '../objects/clause.object.js';
import { ContractType } from '../objects/contract-type.object.js';

import { STRINGS } from './demo-locale.js';
import { APPROVAL_RULE_PLAN, CLAUSE_PLAN, CONTRACT_TYPE_PLAN } from './plan.js';
import { assertUniqueKeys, fixtureFile } from './_shared.js';

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
 * `template_file` is seeded on the six types drafted on our own paper and left
 * empty on the three drafted on the other side's (`plan.ts`, `ContractTypePlan`'s
 * `hasTemplate`), so the launch form's two ways to a first version — from the
 * template, or from an upload — each have a type to show them on. The file is
 * the demo template in `fixtures/`, stored by the platform for each type
 * (`seedFile`, see `_shared.ts`). It is written when the seed CREATES the type
 * and left alone after that (`applyOn: 'create'`): replacing a type's template
 * is the CLM administrator's job (DESIGN.md §03 「换模板就是换文件」), and a
 * re-run of `pnpm demo` that put the fixture back — or blanked a template an
 * administrator added to a type the fixture ships without one — would undo it.
 */

const typeNames = STRINGS.contractTypes.map((type) => type.name);
assertUniqueKeys('clm_contract_type', typeNames);
assertUniqueKeys('clm_clause', STRINGS.clauses.map((clause) => clause.title));
assertUniqueKeys('clm_approval_rule', [...STRINGS.approvalRules]);

export const contractTypeSeed = defineSeed(ContractType, {
  externalId: 'name',
  mode: 'upsert',
  columns: {
    template_file: { applyOn: 'create' },
  },
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
    template_file: type.hasTemplate ? fixtureFile('template', `${type.code}-template.pdf`) : null,
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
