import { definePosition } from '@objectstack/spec/identity';

/**
 * The seven positions of DESIGN.md §04 — flat capability-distribution groups
 * (ADR-0090 D3): no parent, no hierarchy, no visibility roll-up. A position
 * grants nothing by itself. Capability reaches it through the
 * `sys_position_permission_set` bindings `src/security/bind-position-sets.ts`
 * writes on `kernel:bootstrapped`, and rows reach it through the sharing rules
 * in `contract.sharing.ts` that name the position as their recipient.
 *
 * There is deliberately no "employee" position. `clm_requester` is the set
 * every employee holds by default (§04), and a default is not a position —
 * see the distribution note at the top of `src/profiles/requester.profile.ts`.
 *
 * The names are exported as constants so the sharing rules, the bindings and
 * a future approval ladder (card 06) spell them from one place.
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
  }),
  definePosition({
    name: CLM_POSITION.legalHead,
    label: 'Head of Legal',
    description: 'The legal rung of the approval ladder. Same contract reach as legal counsel; receives the review-overdue escalations.',
  }),
  definePosition({
    name: CLM_POSITION.financeController,
    label: 'Finance Controller',
    description: 'The finance rung of the approval ladder. Edits contracts from approved onward with the legal fields and the status locked; owns the payment schedule.',
  }),
  definePosition({
    name: CLM_POSITION.executive,
    label: 'Executive',
    description: 'Reads the contracts routed to the executive rung of the approval ladder.',
  }),
  definePosition({
    name: CLM_POSITION.generalManager,
    label: 'General Manager',
    description: 'Reads the contracts routed to the general-manager rung of the approval ladder.',
  }),
  definePosition({
    name: CLM_POSITION.recordsManager,
    label: 'Records Manager',
    description: 'Execution registration, archive and the contract ledger: edits contracts from signing onward on the execution and archive fields only.',
  }),
  definePosition({
    name: CLM_POSITION.admin,
    label: 'CLM Administrator',
    description: 'Maintains the configuration objects and holds full reach over every CLM object.',
  }),
];
