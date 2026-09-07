// Positions and record-sharing rules (DESIGN.md §04). The lifecycle constants
// in `_lifecycle.ts` are shared with `src/profiles/` and imported from there
// directly; they are not stack metadata.
export { CLM_POSITION, ClmPositions } from './positions.js';
export type { ClmPositionName } from './positions.js';
export {
  ClmSharingRules,
  ContractExecutiveRoutedSharingRule,
  ContractFinancePostApprovalSharingRule,
  ContractGmRoutedSharingRule,
  ContractLegalAllSharingRules,
  ContractRecordsExecutionSharingRule,
} from './contract.sharing.js';
