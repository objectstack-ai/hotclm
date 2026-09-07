<p align="center"><strong>HotCLM</strong></p>

# HotCLM

**Contract lifecycle management on [ObjectStack](https://github.com/objectstack-ai/objectstack) — buy-side, sell-side and everything in between, as typed metadata.**
Self-serve intake, a clause playbook, a data-driven approval matrix, e-signature and execution formalities, obligations and payment schedules: the whole lifecycle in one readable repository.

**基于 ObjectStack 的合同全生命周期管理。** 业务自助发起、条款库与偏离、审批矩阵、电子签与执行形式、履约义务、收付款计划 —— 全部是类型化元数据。

> Status: **M0 — scaffold and configuration domain.** See [DESIGN.md](./DESIGN.md) for the model and
> [docs/backlog](./docs/backlog/README.md) for what is being built next. Sibling app of
> [HotCRM](https://github.com/objectstack-ai/hotcrm): commercial terms stay in the CRM, legal state lives here.

## What it is

- **Ironclad-shaped, not OA-shaped.** A contract type *is* a workflow: intake fields, review, approval ladder, signing method, archive rules — configuration, not code.
- **Business users launch, legal controls.** One intake form per contract type; the approval matrix decides who signs off.
- **Contracts are data.** Obligations, payment schedules, renewals and deviations from the clause playbook are queryable records with reminders, not paragraphs in a PDF.
- **Global by default, local by configuration.** English-first UI with full `zh-CN`; multi-entity, multi-currency, governing law and jurisdiction on every contract; e-signature through DocuSign, Adobe Acrobat Sign or Dropbox Sign; a company seal, notarization or witnessing are execution formalities a contract type can require, not modules.
- **AI is a participant under governance.** Intake by chat or MCP, extraction of executed contracts, review memos for approvers, deviation detection against the playbook — every AI step proposes, a person confirms, and the audit trail records both.
- **Industry- and region-neutral by rule** — contract types, thresholds, execution formalities, currencies and payment terms live in seed data only.

## Quick start

```bash
pnpm install
pnpm dev          # REST + Console on http://localhost:3000 — an EMPTY app
pnpm demo         # the same app with the demo group loaded (English)
pnpm demo:zh      # the same rows, in Chinese
```

`pnpm dev` is deliberately empty: a standard product does not install somebody
else's contract book into a fresh deployment. `pnpm demo` is the opposite
intention — a fictional multi-entity group, six months of negotiation and a
book of contracts already in force, so every list has something on its first
screen. Sign in with `admin@objectos.ai` / `admin123`.

Point the two locales at different databases; they key their rows on localised
titles, so seeding one on top of the other gives you both books.

Every metadata change is gated:

```bash
pnpm validate     # protocol schema + CEL predicates + bindings
pnpm lint         # data-model conventions (reserved vocabulary, titles, master-detail)
pnpm typecheck
```

## Layout

| Path | Contents |
|---|---|
| `objectstack.config.ts` | `defineStack()` — the single entry point |
| `src/objects/` | `clm_*` business objects |
| `DESIGN.md` | Architecture authority — objects, permissions, audiences, automation, milestones |
| `AGENTS.md` | Conventions for humans and coding agents; read by the PM dispatch loop |
| `src/data/` | The demo dataset — `demo-en/` (default) and `demo-zh/`, selected by `OS_SEED_LOCALE` |
| `docs/backlog/` | Dispatch-ready work cards (each file is an issue body) |

## The demo dataset

`pnpm demo` loads 820 rows: nine contract types, a thirty-clause playbook, a
six-rule approval matrix, forty counterparties and 120 contracts with their
reviews, deviations, signature rounds, obligations and payment instalments.
Every date is relative to boot, so ten contracts always expire within the next
thirty days and the arrears lists are always in arrears.

### Users are not seeded — create them, then assign these positions

A seed cannot create a user, so `pnpm demo` produces exactly one account. To see
the permission model of [DESIGN.md](./DESIGN.md) §04 do anything, create
accounts in **Setup → Users** and assign the seven positions:

| Position | How many | What it changes |
|---|---|---|
| `clm_legal_counsel` | 2 | Receives contracts on submission (round-robin by open load) and owns review |
| `clm_legal_head` | 1 | Rung 2 of the approval ladder whenever `route_legal_head` is stamped |
| `clm_finance_controller` | 1 | Rung 2/3, and the only position that may edit bank details |
| `clm_executive` | 1 | Rung 4, and reads every contract with `route_executive` |
| `clm_general_manager` | 1 | Rung 5, and reads every contract with `route_gm` |
| `clm_records_manager` | 1 | Execution formalities, the executed copy and the archive number |
| (business requesters) | 3 | The default `clm_requester` set — launches contracts, sees their own |

**Name the three business requesters exactly** `Business Requester 1`,
`Business Requester 2` and `Business Requester 3`. The 120 contracts are dealt
across those three names by counterparty — 43 / 43 / 34 — so each one's
**我的合同 › Launched by Me** fills the moment the account exists. `owner_id` is
optional, so naming an account that is not there yet costs nothing and no row:
it simply stays empty. Every dataset is an upsert, so **create the accounts and
run `pnpm demo` again** and their contracts are handed over.

The dev admin is deliberately not one of them: it holds no `clm_*` permission
set, so `clm_requester.access` hides every 我的合同 item from it and
`GET /api/v1/meta/app/clm` serves it `navigation: []`. Contracts parked there
would belong to the one account that cannot open the screen they are for.

`clm_review.reviewer`, `clm_obligation.owner` and `clm_contract.legal_owner`
point at the dev admin instead, and have to: `reviewer` is required, so a name
that resolves to nothing takes the row with it, and the dev admin is the only
account that exists while the seed runs. Reassign them once the real accounts
are there.

### What the seeded rows do NOT carry, and why

The demo is loaded as **system data**, not driven through the flows. Two
consequences are worth knowing before you read a number:

- **No approval requests exist.** F5 (`contract_approval`) opens a
  `sys_approval_request` on entry to `in_approval`, and the seed loader
  suppresses record-change automation — so 42 contracts sit at `in_approval` or
  beyond with `approval_status` set and no request behind them. The approvals
  inbox is empty, and a dashboard counting approval requests will read zero
  while the contract list reads 42. The other 48 executed contracts carry
  `is_backfilled: true`, which is the model's own word for a contract that
  reached `active` without review or approval (DESIGN.md §13 Q8) — they claim
  no approval history because they have none.
- **No contract versions exist.** `clm_contract_version.file` is required and a
  file value is an opaque `sys_file` id minted by an upload, which a
  declarative seed cannot mint. Seeding a plausible-looking id would be a
  download that 404s, so the dataset seeds none: `version_count` reads an
  honest `0`. A seeded draft therefore cannot be submitted through the UI —
  the submission guard wants a first version — so drive the intake flow with a
  new contract of your own to see that path.

## License

Apache-2.0 — see [LICENSE](./LICENSE).
