import { defineStack } from '@objectstack/spec';
import * as objects from './src/objects/index.js';
import { allHooks } from './src/objects/hooks.js';
import * as actions from './src/actions/index.js';
import { allFlows, flowFunctions } from './src/flows/index.js';
import * as profiles from './src/profiles/index.js';
import { ClmPositions, ClmSharingRules } from './src/sharing/index.js';
import { registerClmPositionBindings, type BindHostContext } from './src/security/index.js';

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
  // `sharing` seeds the §04 sharing rules into `sys_sharing_rule` and
  // materialises their grants (card 04).
  //
  // `hierarchy-security` is the one enterprise-edition capability this app
  // declares. `clm_requester` authors `readScope` / `writeScope:
  // 'own_and_reports'` on `clm_contract` — the `contract_manager_reports` row
  // of DESIGN.md §04 and §13 Q2 — which is an ADR-0057 HIERARCHY scope
  // resolved by a service that ships only in `@objectstack/security-enterprise`.
  // Measured on `@objectstack/spec` 17.3.0 (card 04): `defineStack` refuses the
  // grant outright without the token ("uses readScope='own_and_reports', a
  // HIERARCHY scope. Declare `requires: ['hierarchy-security']`"), so the pair
  // is one declaration — move them together or not at all.
  //
  // Safe on an OPEN-edition boot: the token is in the platform's known
  // vocabulary, so the capability resolver takes its deliberate "stay quiet"
  // branch (no warning, no abort — HotCRM's config note measured the same
  // against the CLI's serve command). What the open edition then delivers is
  // the EDITION BOUNDARY: with no resolver present the scope fails CLOSED to
  // owner-only, so a requester reads exactly their own contracts and a manager
  // does not reach their reports' — the M1 acceptance measurement is taken on
  // that edition. On the enterprise edition the same metadata widens to the
  // manager chain. The app states what it MEANS; the edition supplies it.
  //
  // `automation` is the flow engine: it registers `flows`, runs the
  // `contract_intake` screen flow (F1, card 05) and resolves `functions`.
  // Measured as required on 17.3.0: without the token the flow-typed
  // `launch_contract` action is refused at dispatch (503, "flow action
  // unavailable"), because the automation service is never resolved.
  //
  // `triggers` is deliberately NOT declared yet. It installs the record-change
  // and schedule PROVIDERS that launch `record_change` / `schedule` flows;
  // this card's flow is a `screen` flow launched by its action, and F2 / F6
  // are hooks, not flows — so nothing here is ever fired by a trigger. The
  // token arrives with the first card that authors a flow a trigger launches
  // (F5 in card 06, the daily jobs in card 09), the same way `sharing` and
  // `hierarchy-security` arrived with card 04: measured, then declared.
  //
  // The rest arrive with the cards that need them (DESIGN.md §06:
  // `approvals` + `messaging` for F5–F15, `analytics` for §09). Capability
  // expansion stays tight — a card names the token it adds (AGENTS.md).
  requires: ['ui', 'auth', 'sharing', 'hierarchy-security', 'automation'],

  objects: Object.values(objects),
  // Lifecycle hooks (numbering, type-derived stamps, the state machines and
  // the display_name mirrors). A metadata `Hook` is only registered from
  // here — `hooks` is a top-level stack key, not an object key.
  hooks: allHooks,

  // Automation (DESIGN.md §06, card 05): the intake screen flow (F1) and the
  // action that launches it. The routing (F2) and the deviation gate (F6)
  // are hooks above. `functions` holds the one callable a `script` node
  // names — the refusal that fails a run with a message.
  flows: allFlows,
  actions: Object.values(actions),
  functions: flowFunctions,

  // Security (DESIGN.md §04, card 04): seven positions, five permission sets,
  // the sharing rules. Positions and sets are containers — the join rows that
  // make a position grant anything are written by `onEnable` below.
  positions: ClmPositions,
  permissions: Object.values(profiles),
  sharingRules: ClmSharingRules,
});

/**
 * Declaring a position and a permission set grants nobody anything until a
 * `sys_position_permission_set` row joins them, and that row cannot be a seed
 * (the seed loader runs before the security bootstrap creates the rows it
 * would reference). Bind them on `kernel:bootstrapped` instead — the shape
 * ATS ships. A module-level named export, which the CLI preserves beside the
 * default `defineStack()` export on the config-load path and grafts back onto
 * the app bundle on the artifact-boot path.
 */
export const onEnable = async (ctx: unknown): Promise<void> => {
  registerClmPositionBindings(ctx as BindHostContext);
};
