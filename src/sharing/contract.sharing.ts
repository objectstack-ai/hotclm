import { P } from '@objectstack/spec';
import { defineSharingRule } from '@objectstack/spec/security';
import { CONTRACT_STATUSES, EXECUTION_STATUSES, POST_APPROVAL_STATUSES, RECORDS_READ_ONLY_STATUSES } from './_lifecycle.js';
import { CLM_POSITION } from './positions.js';

/**
 * The sharing rules of DESIGN.md §04 — how legal, finance, records and the two
 * leadership rungs reach contracts they do not own (`clm_contract` is
 * `private`; the five children are `controlled_by_parent` and follow it).
 *
 * §04 lists six rows. Five are criteria rules and live here (as seven rows —
 * see the shapes below). The sixth,
 * `contract_manager_reports`, is not a rule at all: it is the
 * `own_and_reports` DEPTH scope on the `clm_requester` grant
 * (`src/profiles/requester.profile.ts`), exactly as the §04 table spells it.
 *
 * Three shapes the platform imposes on the table, none a change of meaning:
 *
 *  - A rule has ONE recipient. `contract_legal_all` names two positions, so it
 *    is two rows here, one per position, sharing the same criteria and level.
 *  - A rule has ONE access level. The records manager reads contracts from
 *    `approved` onward but edits them only from `signing` onward (ruling A on
 *    #100), so its window is two rows: `contract_records_execution` (edit,
 *    signing onward) and `contract_records_approved_read` (read, approved).
 *  - "全部" cannot be authored as an empty criteria: a match-all rule is refused
 *    at seed and by `defineRule`, and one that slipped through would match
 *    NOTHING (ADR-0049, `plugin-sharing`'s `isMatchAllCriteria`). "Every
 *    contract" is therefore spelled as `status in [every status]`, with the
 *    list read from the object so a new status cannot fall out of legal's
 *    reach silently.
 *
 * A `position` recipient expands once per rule at materialisation; a person
 * given the position after the contracts exist receives the grants on the
 * next re-materialisation (a write to the record, or
 * `POST /api/v1/sharing/rules/:id/evaluate`). The PR for card 04 records what
 * was measured.
 */

export const ContractLegalAllSharingRules = [
  defineSharingRule({
    name: 'contract_legal_all_counsel',
    label: 'Contracts — Legal Counsel (all)',
    // DESIGN.md §04 contract_legal_all, legal counsel's row.
    description: 'Legal counsel reads and edits every contract.',
    object: 'clm_contract',
    type: 'criteria',
    condition: P`record.status in ${CONTRACT_STATUSES}`,
    accessLevel: 'edit',
    sharedWith: { type: 'position', value: CLM_POSITION.legalCounsel },
  }),
  defineSharingRule({
    name: 'contract_legal_all_head',
    label: 'Contracts — Head of Legal (all)',
    // DESIGN.md §04 contract_legal_all, the head of legal's row.
    description: 'The head of legal reads and edits every contract.',
    object: 'clm_contract',
    type: 'criteria',
    condition: P`record.status in ${CONTRACT_STATUSES}`,
    accessLevel: 'edit',
    sharedWith: { type: 'position', value: CLM_POSITION.legalHead },
  }),
];

export const ContractFinancePostApprovalSharingRule = defineSharingRule({
  name: 'contract_finance_post_approval',
  label: 'Contracts — Finance (approved onward)',
  // DESIGN.md §04; the field lock is §13 Q1.
  description: 'The finance controller edits contracts from approved onward. The legal fields and the status stay locked for finance.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.status in ${POST_APPROVAL_STATUSES}`,
  accessLevel: 'edit',
  sharedWith: { type: 'position', value: CLM_POSITION.financeController },
});

export const ContractRecordsExecutionSharingRule = defineSharingRule({
  name: 'contract_records_execution',
  label: 'Contracts — Records (signing onward)',
  // DESIGN.md §04.
  description: 'The records manager edits contracts from signing onward, and only their execution and archive fields.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.status in ${EXECUTION_STATUSES}`,
  accessLevel: 'edit',
  sharedWith: { type: 'position', value: CLM_POSITION.recordsManager },
});

/**
 * Ruling A on #100: the records manager holds `execute_contract`, the gate on
 * 发起签署 (`approved → signing`), so it must be able to READ the approved
 * contract it is about to send for signature. Read only: the edit window stays
 * `contract_records_execution` above and the `clm_records` update row policy,
 * both from `signing` onward. The button still works on a row records can only
 * read, because the action body writes system-elevated and what binds the
 * caller is the route's caller-scoped read plus `requiredPermissions`
 * (src/actions/contract-lifecycle.actions.ts).
 */
export const ContractRecordsApprovedReadSharingRule = defineSharingRule({
  name: 'contract_records_approved_read',
  label: 'Contracts — Records (approved, read only)',
  description: 'The records manager reads approved contracts so it can start signing; it edits them only from signing onward.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.status in ${RECORDS_READ_ONLY_STATUSES}`,
  accessLevel: 'read',
  sharedWith: { type: 'position', value: CLM_POSITION.recordsManager },
});

export const ContractExecutiveRoutedSharingRule = defineSharingRule({
  name: 'contract_executive_routed',
  label: 'Contracts — Executive (routed)',
  // DESIGN.md §04.
  description: 'An executive reads the contracts the approval matrix routed to the executive rung.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.route_executive == true`,
  accessLevel: 'read',
  sharedWith: { type: 'position', value: CLM_POSITION.executive },
});

export const ContractGmRoutedSharingRule = defineSharingRule({
  name: 'contract_gm_routed',
  label: 'Contracts — General Manager (routed)',
  // DESIGN.md §04.
  description: 'The general manager reads the contracts the approval matrix routed to the general-manager rung.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.route_gm == true`,
  accessLevel: 'read',
  sharedWith: { type: 'position', value: CLM_POSITION.generalManager },
});

export const ClmSharingRules = [
  ...ContractLegalAllSharingRules,
  ContractFinancePostApprovalSharingRule,
  ContractRecordsExecutionSharingRule,
  ContractRecordsApprovedReadSharingRule,
  ContractExecutiveRoutedSharingRule,
  ContractGmRoutedSharingRule,
];
