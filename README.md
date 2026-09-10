<p align="center"><strong>HotCLM</strong></p>

# HotCLM

**Contract lifecycle management on [ObjectStack](https://github.com/objectstack-ai/objectstack) — buy-side, sell-side and everything in between, as typed metadata.**
Self-serve intake, a clause playbook, a data-driven approval matrix, e-signature and execution formalities, obligations and payment schedules: the whole lifecycle in one readable repository.

**基于 ObjectStack 的合同全生命周期管理。** 业务自助发起、条款库与偏离、审批矩阵、电子签与执行形式、履约义务、收付款计划 —— 全部是类型化元数据。

> Status: **M1–M3 are in.** The model and the permission layer, intake, the approval ladder, signing
> and execution formalities, the post-signature reminder layer, the analytics and both locale bundles
> all land in this tree. **M4 is what remains** — e-signature, the HotCRM hand-off, the AI skills and
> the release: [DESIGN.md](./DESIGN.md) §11 is the milestone table, and cards 12 · 13 · 14 in
> [docs/backlog](./docs/backlog/README.md) are what is left in it. Sibling app of
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
| `clm_legal_counsel` | 2 | Receives contracts on submission (round-robin by open load) and owns review. **Name these two exactly** — see below |
| `clm_legal_head` | 1 | Rung 2 of the approval ladder whenever `route_legal_head` is stamped |
| `clm_finance_controller` | 1 | Rung 2/3, and the only position that may edit bank details |
| `clm_executive` | 1 | Rung 4, and reads every contract with `route_executive` |
| `clm_general_manager` | 1 | Rung 5, and reads every contract with `route_gm` |
| `clm_records_manager` | 1 | Execution formalities, the executed copy and the archive number |
| (business requesters) | 3 | The default `clm_requester` set — launches contracts, sees their own |

**Five of these accounts have to be named exactly**, because the fixture
references them by name:

| Name it exactly | Give it | It receives |
|---|---|---|
| `Business Requester 1` · `Business Requester 2` · `Business Requester 3` | the default `clm_requester` set | the 120 contracts' `owner_id`, dealt by counterparty — 43 / 43 / 34 |
| `Legal Counsel 1` · `Legal Counsel 2` | the `clm_legal_counsel` position | the `legal_owner` of every contract legal has accepted — 34 / 34 |

Each requester's **我的合同 › Launched by Me** and each lawyer's **法务工作台 ›
审查中** fills the moment the account exists. Both columns are optional
references, so naming an account that is not there yet costs nothing and no
row: it simply stays empty. Every dataset is an upsert, so **create the accounts
and run `pnpm demo` again** and their contracts are handed over. Get a name
wrong by one character and the column stays empty with no error — that is the
one thing to double-check.

The other five positions are named however you like; they are reached through
the position, not by name.

The dev admin is deliberately none of them: it holds no `clm_*` permission set,
so `clm_requester.access` hides every 我的合同 item from it,
`GET /api/v1/meta/app/clm` serves it `navigation: []`, and `clm_legal.access`
gates the legal workbench away too. A contract parked there — as a business
owner or as a legal owner — belongs to the one account that cannot open the
screen it is for, and its reminders go to somebody who cannot act on them.

`clm_review.reviewer` and `clm_obligation.owner` still point at the dev admin,
and `reviewer` has to: it is `required: true`, so a name that resolves to
nothing takes the row with it, and the dev admin is the only account that exists
while the seed runs. Reassign those two once the real accounts are there.

### Assigning a position from a script

Clicking through Setup → Users needs nothing more than the table above. Automating it does: the
assignment binds by the position's **name**, not by its id. Read that off the declaration, not off
the field name — `sys_user_position.position` is declared `text`, and its own description says what
it carries: *"Position machine name (references `sys_position.name`)."* The field name tells you
nothing here, because this object mixes both kinds freely: `user_id`, `granted_by`, `delegated_from`
and `certified_by` are all genuine lookups, and only three of its fourteen fields carry an `_id`
suffix at all. What makes the analogy tempting is the neighbouring API —
`sys_user_permission_set.permission_set_id` really is id-typed — so the one you would reach for by
analogy takes an id where this one does not.

```http
POST /api/v1/data/sys_user_position
{ "user_id": "…", "position": "clm_legal_counsel" }
```

A name-spelled row grants that position's own permission set **and** `clm_requester`, because every
position binds that set too (`src/security/bind-position-sets.ts`) — a lawyer holds `clm_legal` and
`clm_requester` both. To read back what an account actually ended up with:

```http
POST /api/v1/security/explain
{ "userId": "…", "object": "clm_contract", "operation": "read" }
```

`object` and `operation` are both required there — a body carrying only `userId` answers
`400 VALIDATION_FAILED`.

**An id in the `position` field is accepted, not refused.** Nothing resolves that column on write, so
a row spelled with the position's id is stored verbatim, matches no position and grants no permission
set — and the write still answers `201`, with no diagnostic anywhere to say so. The account lands in
the state the dev admin is in above: signed in, holding no `clm_*` set, served `navigation: []` and
empty lists, with nothing in the response that created it pointing at why. The silent acceptance is
the platform's — `objectstack-ai/objectstack#16712`, still open — so until that lands, the spelling is
the whole defence.

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
