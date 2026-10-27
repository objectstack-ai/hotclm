// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The seven positions and the five permission sets, as Setup lists them when
 * an administrator assigns a position or grants a set. Translatable since
 * `@objectstack/spec` 18.2; the source strings live in `src/sharing/positions.ts`
 * and `src/profiles/*.profile.ts`.
 */
import type { TranslationData } from '@objectstack/spec/system';

export const securitySurface: Pick<TranslationData, 'positions' | 'permissions'> = {
  positions: {
    clm_legal_counsel: {
      label: 'Legal Counsel',
      description: 'Reviews and negotiates contracts. Reads and edits every contract through the legal sharing rule; accepts submissions and runs the review.',
    },
    clm_legal_head: {
      label: 'Head of Legal',
      description: 'The legal rung of the approval ladder. Same contract reach as legal counsel; receives the review-overdue escalations.',
    },
    clm_finance_controller: {
      label: 'Finance Controller',
      description: 'The finance rung of the approval ladder. Edits contracts from approved onward with the legal fields and the status locked; owns the payment schedule.',
    },
    clm_executive: {
      label: 'Executive',
      description: 'Reads the contracts routed to the executive rung of the approval ladder.',
    },
    clm_general_manager: {
      label: 'General Manager',
      description: 'Reads the contracts routed to the general-manager rung of the approval ladder.',
    },
    clm_records_manager: {
      label: 'Records Manager',
      description: 'Execution registration, archive and the contract ledger: reads approved contracts to start signing; edits contracts from signing onward on the execution and archive fields only.',
    },
    clm_admin: {
      label: 'CLM Administrator',
      description: 'Maintains the configuration objects and holds full reach over every CLM object.',
    },
  },
  permissions: {
    clm_admin: {
      label: 'CLM Administrator',
      description: 'Full reach over every CLM object and the configuration objects: contract types, the clause playbook, the approval matrix, counterparties.',
    },
    clm_finance: {
      label: 'Finance',
      description: 'The finance controller: approved contracts, the payment schedule, finance reviews and counterparty banking details.',
    },
    clm_legal: {
      label: 'Legal',
      description: 'Legal counsel and the head of legal: every contract, every review, the clause playbook.',
    },
    clm_records: {
      label: 'Records',
      description: 'The records manager: execution registration, archive and the contract ledger.',
    },
    clm_requester: {
      label: 'Requester',
      description: 'Every employee: launches contracts, follows their own through review and approval, performs the obligations assigned to them.',
    },
  },
};
