import { defineStack } from '@objectstack/spec';
import * as objects from './src/objects/index.js';
import { allHooks } from './src/objects/hooks.js';

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
    description: 'Contract lifecycle management — intake, review, approval, execution, obligations and archive. Global by default, AI-assisted under governance.',
    // Protocol major this app is authored against. The runtime checks the
    // range at load time and refuses a major-incompatible runtime with a
    // structured diagnostic instead of failing deep in a schema parse.
    engines: { protocol: '^17' },
  },

  // `ui` serves the Console; `auth` mounts the login surface and the platform
  // bootstrap that creates `sys_organization`. Both are required for the app to
  // be *browsable at all* — measured, not assumed: with `ui` alone the boot
  // logs "System started with degraded capabilities. Missing core services:
  // auth", the sharing seeder cannot enumerate organizations ("no such table:
  // sys_organization"), and the Console has no way to sign in. DESIGN.md §11
  // already prescribed `auth`; this is the implementation catching up, not a
  // capability expansion.
  //
  // The rest arrive with the cards that need them (DESIGN.md §06:
  // `automation` + `triggers` + `approvals` + `messaging` for F1–F15,
  // `sharing` for §04, `analytics` for §09). Capability expansion stays tight
  // — a card names the token it adds (AGENTS.md).
  requires: ['ui', 'auth'],

  objects: Object.values(objects),
  // Lifecycle hooks (numbering, type-derived stamps, the state machines and
  // the display_name mirrors). A metadata `Hook` is only registered from
  // here — `hooks` is a top-level stack key, not an object key.
  hooks: allHooks,
});
