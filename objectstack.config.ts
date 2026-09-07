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
  // `approvals` is the Approval NODE (ADR-0019): `@objectstack/plugin-approvals`
  // registers the executor that opens `sys_approval_request`, holds the record
  // lock, mirrors the decision onto `approval_status` and resumes the run down
  // the matching branch label. MEASURED on 17.3.0, both directions, each boot
  // from a freshly built artifact (a stale `dist/objectstack.json` carries the
  // OLD `requires` and answers this question wrong): declared ⇒
  // `ApprovalsServicePlugin` is in the boot roster (36 plugins); omitted ⇒ it
  // is absent (35), and the ladder's first rung dies with the flow-run error
  // `No executor registered for node type 'approval'`. That failure is
  // invisible to the caller — the submitting PATCH still answers 200 and the
  // contract sits in `in_approval` with `approval_status: not_required`, no
  // `sys_approval_request` row, no lock, no approver; only the run history
  // and the server log carry it — which is exactly why the token is declared
  // rather than discovered.
  //
  // `messaging` backs the `notify` node (ADR-0012) — F5 tells the contract
  // owner about both terminal outcomes, F7 names the missing execution
  // formality to the legal owner. Measured the same way, and the answer cuts
  // the other way: with `messaging` REMOVED from this list,
  // `MessagingServicePlugin` still loads and the notify nodes still deliver.
  // It is in `PLATFORM_ALWAYS_ON_CAPABILITIES`, which `serve` appends for
  // every non-`minimal` preset, so no gate here has teeth. It is declared
  // because the app must state what it MEANS — a runtime that does not carry
  // that always-on slate degrades the notify node to a logged no-op — not
  // because anything caught its absence.
  //
  // `triggers` was the token card 05's note deferred to "the first card that
  // authors a flow a trigger launches (F5 in card 06)" — and this is that
  // card. It installs the record-change PROVIDER that binds a `record_change`
  // flow to the ObjectQL lifecycle hooks. Not optional and not silent:
  // `defineStack` REFUSES the stack without it, once per flow — "flow
  // 'contract_approval' declares a 'record_change' trigger but `requires` does
  // not include 'triggers' — no 'record_change' trigger would be registered,
  // so the flow would never auto-launch" (measured: `pnpm validate` exits 1
  // with three such issues). `approvals` additionally pulls `job` + `queue`
  // in ahead of itself, so its SLA escalation has durable scheduling.
  //
  // The rest arrive with the cards that need them (`analytics` for §09).
  // Capability expansion stays tight — a card names the token it adds
  // (AGENTS.md).
  requires: ['ui', 'auth', 'sharing', 'hierarchy-security', 'automation', 'triggers', 'approvals', 'messaging'],

  objects: Object.values(objects),
  // Lifecycle hooks (numbering, type-derived stamps, the state machines and
  // the display_name mirrors). A metadata `Hook` is only registered from
  // here — `hooks` is a top-level stack key, not an object key.
  hooks: allHooks,

  // Automation (DESIGN.md §06, cards 05 + 06): the intake screen flow (F1) and
  // the action that launches it, the approval ladder (F5), and the
  // signature/execution check (F7) with its insert-time twin. The routing (F2)
  // and the deviation gate (F6) are hooks above — F5 READS the `route_*` flags
  // F2 stamps and never re-derives them. `functions` holds the callables a
  // `script` node names by string, each pure: the intake refusal that fails a
  // run with a message, the routing-flag normaliser, and the
  // execution-formalities comparison.
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
