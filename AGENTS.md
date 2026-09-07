# HotCLM — Agent Instructions

> Read by Claude Code, Cursor, Codex (`AGENTS.md`) and by the PM dispatch loop, which carries
> these rules into every developer dispatch. When a skill and this file disagree, **this file wins**.
> When this file and `DESIGN.md` disagree on architecture, **`DESIGN.md` wins** — fix this file.

## 🗣️ 沟通语言 / Communication Language

**始终使用中文与用户沟通。** 代码、标识符、提交信息、PR 标题/正文、代码注释保持英文。

## Project context

An **ObjectStack** application: contract lifecycle management (intake → review → approval → signing
and sealing → obligations and payments → renewal and archive) defined as typed metadata. A sellable
standard product, not a starter: every customer-specific need goes through `docs/requirements/`
triage (A already supported · B standard enhancement · C customer overlay · D decline) before it
touches `src/`.

- **Entry point:** `objectstack.config.ts` (`defineStack()`)
- **Spec package:** `@objectstack/spec` ^17 (Zod-first); protocol range pinned in `manifest.engines`
- **Architecture authority:** [`DESIGN.md`](./DESIGN.md) — objects, permissions, audiences, automation, milestones
- **Work cards:** [`docs/backlog/`](./docs/backlog/README.md) — each file is a dispatch-ready issue body
- **Sibling app:** [HotCRM](https://github.com/objectstack-ai/hotcrm). Commercial terms are the CRM's
  (`crm_contract`); legal state is ours (`clm_contract`). Never duplicate a field across the seam
  (DESIGN.md §01).

## Verify your work — after every metadata change

```bash
pnpm validate     # protocol schema + CEL predicates (record.<field> existence) + widget bindings
pnpm lint         # data-model conventions: reserved vocabulary, titles, master-detail, select options
pnpm typecheck
```

`validate` runs the same gates as `pnpm build` without emitting `dist/`. All three exit non-zero with a
located, corrective message. **Never report a change as done, and never open a PR, until all three pass.**
Paste the three green tails into the PR body.

## Naming — binding

| Context | Convention | Example |
|:--|:--|:--|
| Object `name` | `clm_` + `snake_case`; object name **is** the table name | `clm_contract` |
| Field keys / option values | `snake_case` / lowercase | `signed_at`, `in_review` |
| Config keys (TS props) | `camelCase` | `maxLength`, `defaultValue` |
| Metadata type names | singular | `'view'`, `'flow'` |
| Files | `{name}.{type}.ts` | `contract.object.ts`, `contract-intake.flow.ts` |
| Exports | `PascalCase`, barrel via `Object.values()` | `export { Contract } from './contract.object.js'` |

- **Industry-neutral, always.** No vertical vocabulary in any object, field, option value or label.
  Contract types, approval thresholds, seal kinds, payment terms and signing entities live in seed data.
- **Reserved platform words — never as field names:** `role`, `position`, `permission_set`,
  `business_unit` (ADR-0090 D3; `validate` refuses them as `security-role-word`). Use a domain word.
- **Never set `namespace` or `tableName` on an object.** Prefix lives in `name`.
- **Every object authors `sharingModel`** — `private` · `public_read` · `public_read_write` ·
  `controlled_by_parent`. Which one is decided in `DESIGN.md` §03/§04.
- **Every object resolves a title.** A stored `name`/`title` field, or a **stored** `display_name`
  mirror declared as `nameField` — never a formula (formulas are not searchable).
- **Numbers declare their four: decimals, min, max, unit.** No platform defaults on amounts or counts.
- **Predicates are CEL** and reference fields as `record.<field>`; a bare `<field>` is a silent `null`.
  `script` validations are inverted: the rule **fails when the expression is true**.
- **Uniqueness is an index, not a validation** — `indexes: [{ fields: [...], unique: 'organization' }]`.
- **State transitions are enforced in hooks**, never only hidden in the UI (DESIGN.md §03 状态机).
- **Honest capabilities.** No AI output that is a stub; no seeded number that looks computed.
  A capability the runtime does not deliver is hidden, not faked (the `templates` repo lesson).

## Structure

```
objectstack.config.ts   defineStack() — the single entry point
src/objects/            clm_*.object.ts + *.hook.ts    src/profiles/ src/sharing/  permission sets, positions, sharing, FLS
src/views/ src/pages/   *.view.ts / *.page.ts          src/flows/                  F1–F15 (DESIGN.md §06)
src/apps/               one App, five audience groups  src/skills/                 S1–S4 (DESIGN.md §07)
src/datasets/ src/dashboards/  analytics               src/mappings/               import projections
src/translations/       zh-CN (default), en            src/data/                   demo-zh/ · demo-en/
docs/backlog/           work cards                     docs/requirements/          customer requirement triage
```

## Delivery process — what the dispatch loop reads

| Topic | Rule |
|:--|:--|
| Default branch | `main` |
| Branch naming | `claude/issue-<n>-<slug>`, from `origin/main` |
| Worktree | **One dedicated worktree per task**: `git worktree add ../hotclm-issue-<n> -b claude/issue-<n>-<slug> origin/main`. Never edit a shared checkout. |
| Stash | ⛔ Never `git stash` — the stash stack is shared across worktrees. Use a wip commit or a patch. |
| Claim | Assign yourself and post `Claim: <session> · <branch>` before the first edit; an existing claim from another session means taken. |
| Commits | Imperative subject, scope prefix: `feat(objects): add clm_contract`, `fix(security): …`. Body says why. |
| PR | **Draft** PR against `main`, title = issue title, body: what changed · gate output · `Fixes #<n>`. One issue per PR. |
| Release notes | **None per PR.** `CHANGELOG.md` is written at release time by the maintainer. |
| Files a code PR never touches | `LICENSE` · `CHANGELOG.md` · `DESIGN.md` §01–§04 without a `needs-user-decision` first |
| Gates | `pnpm validate && pnpm lint && pnpm typecheck`. |
| Merge policy | Maintainer merges, **squash**. No self-merge, no auto-merge, no merging red or unreviewed PRs. |
| Capability expansion | **Tight.** No new runtime dependency, plugin, `requires:` capability or external service unless the card says so. Propose via `needs_decision`. |
| Platform gaps | **Report, never patch.** A platform limitation goes to objectstack-ai/objectstack as an issue (symptom, minimal repro, expected capability, platform version) and is appended to its `docs/PLATFORM_GAPS_FROM_TEMPLATES.md`. The app may carry an env-gated temporary fixture that names the platform issue. |
| Scope | Deliver the card, whole. Out-of-scope findings become new unassigned issues, not riders. |

### PM dispatch

The repository is its own backlog. Labels: `pm:queue` (ready), `pm:dispatched` (in flight),
`needs-user-decision` (blocked on the maintainer — never dispatch). `Blocked-by: #<n>` lines are
honoured at selection time. One issue per agent, in a dedicated worktree, returning the `dev-report` JSON.

**Stop instead of guessing** when a card underspecifies a public contract — an object or field name,
an enum value, an OWD, a permission scope — or conflicts with `DESIGN.md`: return `needs_decision`
with options, costs and a recommendation.

## AI skills

Install the ObjectStack authoring skills once per machine:

```bash
npx skills add objectstack-ai/objectstack/skills --skill '*' --agent claude-code -y
```

**Never `--all`** — it writes one copy of the bundle per agent runtime the CLI knows about.

| Skill | Load when |
|:--|:--|
| **objectstack-platform** | `defineStack()`, `requires:`, drivers, boot, plugins |
| **objectstack-data** | objects, fields, relationships, validations, indexes, hooks, RLS, seeds |
| **objectstack-ui** | views, apps, dashboards, actions, pages |
| **objectstack-automation** | flows, approvals, triggers, jobs, state machines |
| **objectstack-formula** | every CEL expression |
| **objectstack-i18n** | translation bundles, locale config |
| **objectstack-query** / **-api** / **-ai** | ObjectQL, REST/auth surface, MCP tools, skills |

> Skills give shape and intent; **the Zod sources under `node_modules/@objectstack/spec/src/**/*.zod.ts`
> are the truth.** Read them for exact field shapes before authoring.
