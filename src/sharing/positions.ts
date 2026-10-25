import { definePosition } from '@objectstack/spec/identity';
import { AdminSet, FinanceSet, LegalSet, RecordsSet, RequesterSet } from '../profiles/index.js';

/**
 * The seven positions of DESIGN.md §04 — flat capability-distribution groups
 * (ADR-0090 D3): no parent, no hierarchy, no visibility roll-up. A position
 * grants nothing by itself. Capability reaches it through the permission sets
 * its definition names in `permissionSets` (ADR-0131 D3/D4, protocol 18), and
 * rows reach it through the sharing rules in `contract.sharing.ts` that name
 * the position as their recipient.
 *
 * Every position names its own set (if it has one) AND `clm_requester`: §04
 * makes that set every employee's default, the platform refuses to bind a set
 * carrying a system permission to the `everyone` anchor (see
 * `requester.profile.ts`), and the two leadership rungs hold no set of their
 * own — the object-level read on `clm_contract` that lets
 * `contract_executive_routed` / `contract_gm_routed` deliver rows comes from
 * this one. Up to 17.x the same pairs were `sys_position_permission_set` rows a
 * boot-time binder wrote; 18 retired that object, and the binding is now part
 * of the definition.
 *
 * There is deliberately no "employee" position. `clm_requester` is the set
 * every employee holds by default (§04), and a default is not a position —
 * see the distribution note at the top of `src/profiles/requester.profile.ts`.
 *
 * The names are exported as constants so the sharing rules and the approval
 * ladder (card 06) spell them from one place.
 */
export const CLM_POSITION = {
  legalCounsel:      'clm_legal_counsel',
  legalHead:         'clm_legal_head',
  financeController: 'clm_finance_controller',
  executive:         'clm_executive',
  generalManager:    'clm_general_manager',
  recordsManager:    'clm_records_manager',
  admin:             'clm_admin',
} as const;

export type ClmPositionName = (typeof CLM_POSITION)[keyof typeof CLM_POSITION];

export const ClmPositions = [
  definePosition({
    name: CLM_POSITION.legalCounsel,
    label: 'Legal Counsel',
    description: 'Reviews and negotiates contracts. Reads and edits every contract through the legal sharing rule; accepts submissions and runs the review.',
    permissionSets: [LegalSet.name, RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.legalHead,
    label: 'Head of Legal',
    description: 'The legal rung of the approval ladder. Same contract reach as legal counsel; receives the review-overdue escalations.',
    permissionSets: [LegalSet.name, RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.financeController,
    label: 'Finance Controller',
    description: 'The finance rung of the approval ladder. Edits contracts from approved onward with the legal fields and the status locked; owns the payment schedule.',
    permissionSets: [FinanceSet.name, RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.executive,
    label: 'Executive',
    description: 'Reads the contracts routed to the executive rung of the approval ladder.',
    permissionSets: [RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.generalManager,
    label: 'General Manager',
    description: 'Reads the contracts routed to the general-manager rung of the approval ladder.',
    permissionSets: [RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.recordsManager,
    label: 'Records Manager',
    description: 'Execution registration, archive and the contract ledger: reads approved contracts to start signing; edits contracts from signing onward on the execution and archive fields only.',
    permissionSets: [RecordsSet.name, RequesterSet.name],
  }),
  definePosition({
    name: CLM_POSITION.admin,
    label: 'CLM Administrator',
    description: 'Maintains the configuration objects and holds full reach over every CLM object.',
    permissionSets: [AdminSet.name, RequesterSet.name],
  }),
];
