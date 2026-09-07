// The five permission sets of DESIGN.md §04, and nothing else: this barrel is
// spread into `defineStack({ permissions })` via `Object.values()`, so a helper
// exported here would be registered as a permission set. Helpers live in
// `_grants.ts` and are imported by the profiles directly.
export { RequesterSet } from './requester.profile.js';
export { LegalSet } from './legal.profile.js';
export { FinanceSet } from './finance.profile.js';
export { RecordsSet } from './records.profile.js';
export { AdminSet } from './admin.profile.js';
