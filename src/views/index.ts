// The view containers of DESIGN.md §05, and nothing else: this barrel is
// spread into `defineStack({ views })` via `Object.values()`, so a helper
// exported here would be registered as a view container.
//
// One file per object that a §05 navigation entry lands on. The five audience
// cuts over `clm_contract` are named `listViews` inside its one container, not
// five containers — a container is per OBJECT, and the console's view switcher
// reaches every named view from any list page of that object.
export { ContractViews } from './contract.view.js';
export { ObligationViews } from './obligation.view.js';
export { PaymentPlanViews } from './payment-plan.view.js';
export { PartyViews } from './party.view.js';
export { ContractTypeViews } from './contract-type.view.js';
export { ClauseViews } from './clause.view.js';
export { ApprovalRuleViews } from './approval-rule.view.js';
