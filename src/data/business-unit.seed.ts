// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { SeedSchema } from '@objectstack/spec/data';

import { STRINGS } from './demo-locale.js';
import { DEPARTMENT_PLAN, SIGNING_ENTITY_PLAN } from './plan.js';

/**
 * The group's three legal entities — DESIGN.md §10's US parent with a European
 * and an Asia-Pacific subsidiary — and the seven departments that launch its
 * contracts, as rows of the platform's organisation object,
 * `sys_business_unit`.
 *
 * `clm_contract.our_entity` is a lookup to that object filtered to
 * `kind: 'company'` (#20, ruling C), so a signing entity is DATA: a customer
 * adds theirs in Setup → Business Units, and this demo plays the admin's part
 * by seeding the fictional group's. `clm_contract.department` is the same
 * shape filtered to `kind: 'department'` (#109), so the departments are rows
 * of the same object, under the US parent (`plan.ts` says why). The
 * parent/child link is the platform's own `parent_business_unit_id`, so the
 * org-chart view in Setup shows the group as one tree.
 *
 * ## Why `SeedSchema.parse` and not `defineSeed`
 *
 * `defineSeed` takes the object definition to check the record keys against,
 * and `sys_business_unit` is the platform's — this app neither declares it nor
 * depends on the package that does. Every key below is a declared field of
 * the installed `@objectstack/platform-objects` 18.1.0 definition (`name`,
 * `code`, `kind`, `parent_business_unit_id`, `active`), read there rather
 * than assumed. `department` is one of that definition's `kind` options
 * (`company · division · department · office · cost_center`).
 *
 * ## The key is `code`
 *
 * `code` is the platform's own natural key for a unit ("Short stable code …
 * Unique within tenant") and it is locale-blind, so `demo-en` and `demo-zh`
 * upsert the same ten rows and every contract resolves its `our_entity` and
 * its `department` against the same codes in either language. The
 * subsidiaries and the departments name their parent by code too; the loader
 * writes a self-referencing dataset row by row, in this order, so the parent
 * exists by the time a child names it — the companies come first.
 */
export const businessUnitSeed = SeedSchema.parse({
  object: 'sys_business_unit',
  mode: 'upsert',
  externalId: 'code',
  records: [
    ...SIGNING_ENTITY_PLAN.map((entity, index) => ({
      code: entity.code,
      name: STRINGS.signingEntities[index]!,
      kind: 'company',
      parent_business_unit_id: entity.parentCode,
      active: true,
    })),
    ...DEPARTMENT_PLAN.map((department, index) => ({
      code: department.code,
      name: STRINGS.departments[index]!,
      kind: 'department',
      parent_business_unit_id: department.parentCode,
      active: true,
    })),
  ],
});
