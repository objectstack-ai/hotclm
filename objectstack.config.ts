import { defineStack } from '@objectstack/spec';
import * as objects from './src/objects/index.js';
import { allHooks } from './src/objects/hooks.js';
import * as actions from './src/actions/index.js';
import { allFlows, flowFunctions } from './src/flows/index.js';
import * as profiles from './src/profiles/index.js';
import { CLM_POSITION, ClmPositions, ClmSharingRules } from './src/sharing/index.js';
import { clmSeeds, demoSeedRequested } from './src/data/index.js';
import { CONTRACT_OWNERS, LEGAL_OWNERS } from './src/data/keys.js';
import * as apps from './src/apps/index.js';
import * as datasets from './src/datasets/index.js';
import * as dashboards from './src/dashboards/index.js';
import * as pages from './src/pages/index.js';
import * as views from './src/views/index.js';
import * as translations from './src/translations/index.js';

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
    engines: { protocol: '^18' },
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
  // `analytics` is the ADR-0021 semantic layer DESIGN.md §09's four datasets
  // and three dashboards run on. MEASURED on 17.3.0 before it was declared,
  // because the question the card asked first was whether it is
  // enterprise-gated the way `hierarchy-security` is. It is not, on either
  // count:
  //
  //   - `PLATFORM_CAPABILITY_PROVIDERS.analytics` is
  //     `{ package: '@objectstack/service-analytics', edition: 'open' }` — the
  //     open edition, where `hierarchy-security` reads
  //     `{ package: '@objectstack/security-enterprise', edition: 'enterprise' }`.
  //   - It needs no declaration to load. `analytics` is a member of
  //     `PLATFORM_ALWAYS_ON_CAPABILITIES`, so `serve` appends it for every
  //     non-`minimal` preset: `AnalyticsServicePlugin` was already in the boot
  //     roster (36 plugins) on `main` with this list unchanged, and
  //     `POST /api/v1/analytics/dataset/query` already answered.
  //
  // So this token has no gate behind it, exactly like `messaging` above, and
  // it is declared for the same reason: the app must state what it MEANS. A
  // runtime that does not carry the always-on slate serves no dataset at all,
  // and every widget on all three dashboards would render its error state.
  //
  // The rest arrive with the cards that need them. Capability expansion stays
  // tight — a card names the token it adds (AGENTS.md).
  requires: ['ui', 'auth', 'sharing', 'hierarchy-security', 'automation', 'triggers', 'approvals', 'messaging', 'analytics'],

  // Internationalization (DESIGN.md §01 全球优先, card 11). English is the
  // DEFAULT and the SOURCE language — every label is authored in English inline
  // on the metadata and `en` is the locale the inline strings ARE. `zh-CN` is a
  // complete second bundle, not a partial one.
  //
  // ⚠️ `fallbackLocale` is what makes this block dangerous as well as useful: a
  // key missing from `zh-CN` renders its English source string SILENTLY — no
  // error, no warning, no log line, and nothing on screen that distinguishes a
  // gap from a translation. `objectstack lint` will not fail on it either
  // (a non-default-locale miss is a WARNING there; measured — see
  // `scripts/check-lint-i18n-gate.mjs`). `pnpm lint:i18n-gate` is the only
  // instrument that fails the build on one, which is why removing that script
  // silently unpicks this whole block.
  //
  // The three keys below are the whole of `TranslationConfigSchema`. Four more
  // were removed at protocol 17 (`fileOrganization`, `messageFormat`,
  // `lazyLoad`, `cache`) because no runtime read them; the schema now rejects
  // them by name rather than dropping them, so this block cannot silently grow
  // a setting that does nothing.
  i18n: {
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-CN'],
    fallbackLocale: 'en',
  },

  // One bundle carrying both locales — `translations` is an array of bundles,
  // and a bundle is `Record<locale, TranslationData>`.
  translations: Object.values(translations),

  objects: Object.values(objects),
  apps: Object.values(apps),
  views: Object.values(views),
  pages: Object.values(pages),

  // Analytics (DESIGN.md §09, card 10). `datasets` is the ONE semantic layer
  // (ADR-0021): a dashboard widget names a dataset and picks its dimensions
  // and measures by name, so "contract value" is defined once and means the
  // same number on every surface. There are no hand-written cubes.
  datasets: Object.values(datasets),
  dashboards: Object.values(dashboards),
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
  // the sharing rules. Each position names the sets it distributes in its own
  // `permissionSets` (src/sharing/positions.ts).
  positions: ClmPositions,
  permissions: Object.values(profiles),

  // The eleven authorization tokens the five permission sets grant in
  // `systemPermissions` (ADR-0066 D1) — this app DEFINES them; it is not a
  // `requires:` service and adds no plugin. Two reasons to declare rather than
  // let the platform derive them from the sets:
  //
  //  - `clm_requester` is every member's default (`isDefault: true`, DESIGN.md
  //    §04 「所有员工默认」). The platform binds such a set to the `everyone`
  //    anchor only if it is low-privilege, and a `systemPermissions` token
  //    counts as high-privilege UNLESS the stack declares it here
  //    (`security-anchor-high-privilege`, ADR-0090 D5/D9; per token, and a
  //    platform token is never excused). Measured on 18.1.0: `isDefault: true`
  //    without this block fails `os lint`, `os validate` and the dev compile;
  //    with it all three pass and a member holding no position resolves
  //    `clm_requester` as the additive baseline.
  //  - A declared capability carries a label and package provenance; a derived
  //    one is an untitled name.
  //
  // Every token is org-scoped: each gates a CLM screen or action inside one
  // organization. Keep this list and the five `systemPermissions` arrays in
  // `src/profiles/*.profile.ts` in step — a token granted but not declared
  // here makes `clm_requester` high-privilege again the moment it is the one
  // granting it.
  capabilities: [
    { name: 'clm_requester.access',  scope: 'org', label: 'CLM: My Contracts',     description: 'Serves the My Contracts and Analytics groups of the CLM app.' },
    { name: 'clm_legal.access',      scope: 'org', label: 'CLM: Legal',            description: 'Serves the Legal group of the CLM app and the legal-only contract actions.' },
    { name: 'clm_finance.access',    scope: 'org', label: 'CLM: Finance',          description: 'Serves the Finance group of the CLM app.' },
    { name: 'clm_records.access',    scope: 'org', label: 'CLM: Records',          description: 'Serves the Records group of the CLM app.' },
    { name: 'clm_admin.access',      scope: 'org', label: 'CLM: Administration',   description: 'Serves the Administration group of the CLM app.' },
    { name: 'approve_contract',      scope: 'org', label: 'Approve contracts',     description: 'DESIGN.md §04 action gate for the approval ladder; which request a holder decides is the approval flow\'s assignment.' },
    { name: 'execute_contract',      scope: 'org', label: 'Execute contracts',     description: 'DESIGN.md §04 action gate for signing, activation and backfill of executed contracts.' },
    { name: 'archive_contract',      scope: 'org', label: 'Archive contracts',     description: 'DESIGN.md §04 action gate for archiving.' },
    { name: 'terminate_contract',    scope: 'org', label: 'Terminate contracts',   description: 'DESIGN.md §04 action gate for ending a contract in force.' },
    { name: 'manage_clauses',        scope: 'org', label: 'Manage clauses',        description: 'DESIGN.md §04 action gate for the clause playbook.' },
    { name: 'manage_approval_rules', scope: 'org', label: 'Manage approval rules', description: 'DESIGN.md §04 action gate for the approval matrix.' },
  ],

  sharingRules: ClmSharingRules,

  // The demo dataset (DESIGN.md §10, card 08). EMPTY unless `CLM_DEMO_SEED`
  // asked for it at compile time — `pnpm demo` sets it, `pnpm dev` does not,
  // and `src/data/index.ts` states why a sellable standard product does not
  // install somebody else's contract book into every fresh deployment.
  // `OS_SEED_LOCALE` chooses which language the fixture is written in.
  data: clmSeeds,

  // The demo staff (DESIGN.md §10's persona mix, issue #28 ruling D): the
  // people the demo dataset is dealt to. The app only DECLARES them; the
  // platform creates them (`demoStaff`, @objectstack 18.2). On a local
  // development boot `os dev` signs each one up after the dev admin, assigns
  // its position in the Default Organization, and only then runs the seed, so
  // `owner_id: 'Business Requester 1'` resolves on the first `pnpm demo`.
  // Idempotent: an address that already has an account is left as it is and
  // only its missing assignments are added.
  //
  // This is not a seeded user (§10 「用户不可种子」 stands). Nothing here is a
  // `sys_user` row in `data`, and `os build` drops the key from the artifact,
  // so no deployment ever boots with these accounts. A non-development boot
  // creates nothing and says why.
  //
  // Gated on the same switch as `data`: the staff exist for the demo book, and
  // `pnpm dev` is deliberately empty. `pnpm demo` sets `CLM_DEMO_SEED` for the
  // boot that loads this file, so the declaration and the rows that name it
  // always arrive together.
  //
  // No password: every demo account signs in with the development seed
  // password (`os dev --admin-password`, default `admin123`) — the platform
  // refuses a `password` key, so no credential is committed here.
  //
  // - The business requesters and the two counsel are named by the SAME
  //   constants the fixture deals rows by (`src/data/keys.ts`), so a name here
  //   cannot drift from the `owner_id` / `legal_owner` / `owner` /
  //   `decided_by` values that resolve against it. A requester holds no
  //   position: `clm_requester` is every member's default set (`isDefault`).
  // - The other six positions are staffed once each, so every rung of the
  //   approval ladder and every audience group of §05 has someone to sign in
  //   as. The fixture names none of them; they are reached through the
  //   position, not by name.
  //
  // ⚠️ A line manager cannot be declared: a `demoStaff` entry carries a
  // `position` and `permissionSets` and nothing else, and `sys_user.manager_id`
  // is an admin operation (README, "Rung 1 of the approval ladder is a
  // manager"). Setting the requesters' manager stays a manual Setup step.
  demoStaff: demoSeedRequested()
    ? [
        ...CONTRACT_OWNERS.map((name, i) => ({ name, email: `requester${i + 1}@example.com` })),
        ...LEGAL_OWNERS.map((name, i) => ({ name, email: `counsel${i + 1}@example.com`, position: CLM_POSITION.legalCounsel })),
        { name: 'Head of Legal',      email: 'legal.head@example.com', position: CLM_POSITION.legalHead },
        { name: 'Finance Controller', email: 'finance@example.com',    position: CLM_POSITION.financeController },
        { name: 'Executive',          email: 'executive@example.com',  position: CLM_POSITION.executive },
        { name: 'General Manager',    email: 'gm@example.com',         position: CLM_POSITION.generalManager },
        { name: 'Records Manager',    email: 'records@example.com',    position: CLM_POSITION.recordsManager },
        { name: 'CLM Administrator',  email: 'clm.admin@example.com',  position: CLM_POSITION.admin },
      ]
    : [],
});
