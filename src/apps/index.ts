// The one App of ADR-0019 D3: this barrel is spread into
// `defineStack({ apps })` via `Object.values()`, so anything exported here is
// registered as an App.
export { ClmApp } from './clm.app.js';
