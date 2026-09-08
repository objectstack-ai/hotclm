// The four analytics datasets of DESIGN.md §09 — the ONE semantic layer
// (ADR-0021). This barrel is spread into `defineStack({ datasets })` via
// `Object.values()`, so anything exported here is registered as a dataset;
// a helper belongs in the file that uses it.
//
// Every dashboard widget binds a dataset by name and selects dimensions and
// measures by name. "Contract value" is defined once, here, and means the same
// number on the legal workbench and the executive board.
export { ContractDataset } from './contract.dataset.js';
export { CycleTimeDataset } from './cycle-time.dataset.js';
export { ObligationDataset } from './obligation.dataset.js';
export { PaymentDataset } from './payment.dataset.js';
