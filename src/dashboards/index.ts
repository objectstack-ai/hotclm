// The three dashboards of DESIGN.md §09 — 法务工作台 · 管理层 · 财务. This
// barrel is spread into `defineStack({ dashboards })` via `Object.values()`,
// so anything exported here is registered as a dashboard.
//
// Every widget on all three binds one of the four `src/datasets/` datasets and
// selects its dimensions and measures BY NAME (ADR-0021). No widget carries an
// inline query, and none declares a key the dataset renderer does not read.
export { LegalDashboard } from './legal.dashboard.js';
export { ExecutiveDashboard } from './executive.dashboard.js';
export { FinanceDashboard } from './finance.dashboard.js';
