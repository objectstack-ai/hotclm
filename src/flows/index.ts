import type { Flow } from '@objectstack/spec/automation';
import { ContractIntakeFlow, refuseIntake } from './contract-intake.flow.js';

// F1–F15 of DESIGN.md §06 arrive card by card; this barrel is what
// `defineStack({ flows })` reads.
export { ContractIntakeFlow } from './contract-intake.flow.js';

export const allFlows: Flow[] = [ContractIntakeFlow];

/**
 * Named functions the flows' `script` nodes call by string
 * (`defineStack({ functions })`). Pure by contract: each returns or throws;
 * none writes.
 */
export const flowFunctions = {
  clm_intake_refuse: refuseIntake,
};
