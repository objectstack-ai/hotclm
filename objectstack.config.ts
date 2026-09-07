import { defineStack } from '@objectstack/spec';
import * as objects from './src/objects/index.js';

/**
 * HotCLM — contract lifecycle management on ObjectStack.
 *
 * Intake, clause playbook, approval matrix, sealing and e-signature,
 * obligations and payment schedules, renewals and archive — all as typed
 * metadata. See DESIGN.md for the model; docs/backlog/ for what lands next.
 */
export default defineStack({
  manifest: {
    id: 'app.objectstack.hotclm',
    namespace: 'clm',
    version: '0.1.0',
    type: 'app',
    name: 'HotCLM',
    description: 'Contract lifecycle management — intake, review, approval, signing, obligations and archive.',
    // Protocol major this app is authored against. The runtime checks the
    // range at load time and refuses a major-incompatible runtime with a
    // structured diagnostic instead of failing deep in a schema parse.
    engines: { protocol: '^17' },
  },

  // `ui` serves the Console so the app can be browsed as soon as it boots.
  // The remaining capabilities arrive with the cards that need them
  // (DESIGN.md §06: `automation` + `triggers` + `approvals` + `messaging`
  // for F1–F15, `sharing` for §04, `analytics` for §09). Capability
  // expansion is tight — a card names the token it adds (AGENTS.md).
  requires: ['ui'],

  objects: Object.values(objects),
});
