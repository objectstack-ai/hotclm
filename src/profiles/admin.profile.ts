import { definePermissionSet } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';
import { CONTRACT_STAMPED_FIELDS, readOnly } from './_grants.js';

/**
 * `clm_admin` — the CLM administrator (DESIGN.md §04): RCUD on every object,
 * write access to the four configuration objects that every other set only
 * reads, and all six action gates.
 *
 * `viewAllRecords` / `modifyAllRecords` on the private contract and its
 * children: an administrator reaches every row without a sharing rule, and
 * `modifyAllRecords` is what lets them reassign a contract's business owner
 * (`allowTransfer` is authored beside it so the capability is readable here
 * rather than implied). The super-user bits also bypass business row-level
 * security, which is why this set carries none of the write-window policies
 * the other four do — one here would be inert metadata.
 *
 * What even the administrator may not do by hand is write the fields §04 locks
 * for every position: the routing flags, the stage timestamps and the AI
 * fields have exactly one writer each (hooks, flows and the adopt action,
 * under a system context), and a hand edit would forge an audit trail.
 */
const full = { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true } as const;
const config = { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true } as const;

export const AdminSet = definePermissionSet({
  name: 'clm_admin',
  label: 'CLM Administrator',
  description: 'Full reach over every CLM object and the configuration objects: contract types, the clause playbook, the approval matrix, counterparties.',
  systemPermissions: [
    'clm_admin.access',
    'approve_contract',
    'execute_contract',
    'archive_contract',
    'terminate_contract',
    'manage_clauses',
    'manage_approval_rules',
  ],
  objects: {
    clm_contract:         { ...full, allowTransfer: true },
    clm_contract_version: full,
    clm_review:           full,
    clm_deviation:        full,
    clm_signature:        full,
    clm_obligation:       full,
    clm_payment_plan:     full,
    clm_party:            config,
    clm_contract_type:    config,
    clm_clause:           config,
    clm_approval_rule:    config,
  },
  fields: {
    ...readOnly(Contract, CONTRACT_STAMPED_FIELDS),
  },
});
