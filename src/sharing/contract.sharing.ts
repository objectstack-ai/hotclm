import { P } from '@objectstack/spec';
import { defineSharingRule } from '@objectstack/spec/security';
import { CONTRACT_STATUSES, EXECUTION_STATUSES, POST_APPROVAL_STATUSES } from './_lifecycle.js';
import { CLM_POSITION } from './positions.js';

/**
 * The sharing rules of DESIGN.md §04 — how legal, finance, records and the two
 * leadership rungs reach contracts they do not own (`clm_contract` is
 * `private`; the five children are `controlled_by_parent` and follow it).
 *
 * §04 lists six rows. Five are criteria rules and live here. The sixth,
 * `contract_manager_reports`, is not a rule at all: it is the
 * `own_and_reports` DEPTH scope on the `clm_requester` grant
 * (`src/profiles/requester.profile.ts`), exactly as the §04 table spells it.
 *
 * Two shapes the platform imposes on the table, neither a change of meaning:
 *
 *  - A rule has ONE recipient. `contract_legal_all` names two positions, so it
 *    is two rows here, one per position, sharing the same criteria and level.
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
    description: 'DESIGN.md §04 contract_legal_all: legal counsel reads and edits every contract.',
    object: 'clm_contract',
    type: 'criteria',
    condition: P`record.status in ${CONTRACT_STATUSES}`,
    accessLevel: 'edit',
    sharedWith: { type: 'position', value: CLM_POSITION.legalCounsel },
  }),
  defineSharingRule({
    name: 'contract_legal_all_head',
    label: 'Contracts — Head of Legal (all)',
    description: 'DESIGN.md §04 contract_legal_all: the head of legal reads and edits every contract.',
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
  description: 'DESIGN.md §04: the finance controller edits contracts from approved onward; field-level security locks the legal fields and the status (§13 Q1).',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.status in ${POST_APPROVAL_STATUSES}`,
  accessLevel: 'edit',
  sharedWith: { type: 'position', value: CLM_POSITION.financeController },
});

export const ContractRecordsExecutionSharingRule = defineSharingRule({
  name: 'contract_records_execution',
  label: 'Contracts — Records (signing onward)',
  description: 'DESIGN.md §04: the records manager edits contracts from signing onward; field-level security limits the edit to the execution and archive fields.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.status in ${EXECUTION_STATUSES}`,
  accessLevel: 'edit',
  sharedWith: { type: 'position', value: CLM_POSITION.recordsManager },
});

export const ContractExecutiveRoutedSharingRule = defineSharingRule({
  name: 'contract_executive_routed',
  label: 'Contracts — Executive (routed)',
  description: 'DESIGN.md §04: an executive reads the contracts the approval matrix routed to the executive rung.',
  object: 'clm_contract',
  type: 'criteria',
  condition: P`record.route_executive == true`,
  accessLevel: 'read',
  sharedWith: { type: 'position', value: CLM_POSITION.executive },
});

export const ContractGmRoutedSharingRule = defineSharingRule({
  name: 'contract_gm_routed',
  label: 'Contracts — General Manager (routed)',
  description: 'DESIGN.md §04: the general manager reads the contracts the approval matrix routed to the general-manager rung.',
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
  ContractExecutiveRoutedSharingRule,
  ContractGmRoutedSharingRule,
];
