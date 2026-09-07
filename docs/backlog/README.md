# Backlog — dispatch-ready work cards

Each file below is a complete issue body: paste it verbatim into a GitHub issue, add the label
`pm:queue`, and the PM dispatch loop (`AGENTS.md` → PM dispatch) can pick it up. The dispatch loop
honours `Blocked-by:` at selection time and never dispatches a card whose blockers are still open.

Card 01 (scaffold + configuration domain) landed with the initial commit. Cards 02–03 are the serial
bottleneck of M1: every later card depends on `clm_contract` and its children. **Once 02–04 merge,
five cards are unblocked at once** — 05, 06, 07, 09, 10 — which is the first point where parallel
dispatch is worth anything.

| Card | Title | Milestone | Blocked by |
|:--|:--|:--|:--|
| ~~01~~ | Scaffold · configuration domain (`clm_contract_type`, `clm_clause`, `clm_approval_rule`, `clm_party`) | M1 | **landed** |
| [02](./02-contract-domain.md) | Contract domain: `clm_contract`, `clm_contract_version`, `clm_review`, `clm_deviation`, `clm_signature` + state-machine hooks | M1 | — |
| [03](./03-post-signature-domain.md) | Post-signature domain: `clm_obligation`, `clm_payment_plan` + roll-ups | M1 | 02 |
| [04](./04-security.md) | Positions, permission sets, sharing rules, FLS, `onEnable` bindings | M1 | 02, 03 |
| [05](./05-intake-and-route.md) | F1 intake screen flow · F2 route hook · F6 deviation gate | M2 | 04 |
| [06](./06-approval-ladder.md) | F5 approval ladder · F7 signature record and formalities | M2 | 04 |
| [07](./07-views-and-app.md) | Views, contract detail page, the one App with five audience groups | M2 | 04 |
| [08](./08-seed-data.md) | Seed data: `demo-zh` (default) and `demo-en` | M2 | 03 |
| [09](./09-post-signature-jobs.md) | F9 activation · F10–F14 scheduled jobs (obligations, payments, renewal, expiry, archive) | M3 | 04 |
| [10](./10-analytics.md) | Four datasets, three dashboards | M3 | 08 |
| [11](./11-i18n.md) | Translations `en` (default) and `zh-CN` | M3 | 07 |
| [12](./12-esign-and-crm-handoff.md) | F8 e-signature connector · F15 HotCRM hand-off behind `CLM_COMPOSITION` | M4 | 06, 09 |
| [13](./13-ai-skills.md) | AI participation: S1–S6 skills, the pre-review memo, MCP tool surface, honest degradation | M4 | 05 |
| [14](./14-release.md) | Release: docs site, screenshots, feature inventory, marketplace publish | M4 | 10, 11, 12, 13 |

Every card inherits the same acceptance floor: `pnpm validate && pnpm lint && pnpm typecheck` green,
gate output pasted in the PR, one draft PR per card, no rider changes. Field lists, enum values and
transitions are pinned in [`DESIGN.md`](../../DESIGN.md) §03–§06 — a card that needs a value not
pinned there stops with `needs_decision` instead of inventing one.
