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

`pnpm demo` also turns on the platform's scheduled work, which is off by
default, so the daily reminder sweeps run on the demo book; a deployment that
wants those reminders in the inbox sets `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true`.

Point the two locales at different databases; they key their rows on localised
titles, so seeding one on top of the other gives you both books.

Every metadata change is gated:

```bash
pnpm validate        # protocol schema + CEL predicates + bindings
pnpm lint            # data-model conventions (reserved vocabulary, titles, master-detail)
pnpm typecheck
pnpm lint:i18n-gate  # every zh-CN key present — a missing one renders as English, silently
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

`pnpm demo` loads 830 rows: nine contract types, a thirty-clause playbook, a
six-rule approval matrix, three signing companies and seven departments, forty
counterparties and 120 contracts with their reviews, deviations, signature
rounds, obligations and payment instalments.
Every date is relative to boot, so ten contracts always expire within the next
thirty days and the arrears lists are always in arrears.

### Users are not seeded — create them, then assign these positions

A seed cannot create a user, so `pnpm demo` produces exactly one account. To see
the permission model of [DESIGN.md](./DESIGN.md) §04 do anything, create
accounts in **Setup → Users**, assign the seven positions, and give every business
requester a manager ([below](#rung-1-of-the-approval-ladder-is-a-manager)):

| Position | How many | What it changes |
|---|---|---|
| `clm_legal_counsel` | 2 | Receives contracts on submission (round-robin by open load) and owns review. **Name these two exactly** — see below |
| `clm_legal_head` | 1 | Rung 2 of the approval ladder whenever `route_legal_head` is stamped |
| `clm_finance_controller` | 1 | Rung 2/3, reads every contract with `route_finance`, and the only position that may edit bank details |
| `clm_executive` | 1 | Rung 4, and reads every contract with `route_executive` |
| `clm_general_manager` | 1 | Rung 5, and reads every contract with `route_gm` |
| `clm_records_manager` | 1 | Execution formalities, the executed copy and the archive number |
| `clm_admin` | 1 | Maintains the configuration objects and holds full reach over every CLM object: the only position that may write `clm_contract_type` and `clm_approval_rule`, and the only one the app's **Administration** group is served to |

**Three more accounts are business requesters, which is not a position.**
Every member of the organization holds `clm_requester` by default
([DESIGN.md](./DESIGN.md) §04): it is the app's default permission set, bound
to the platform's `everyone` anchor, so a requester needs no position and no
grant — creating the account is the whole of it. They launch contracts and see
their own. The seven positions above hold the same set the same way, on top of
their own.

**Five of the accounts above have to be named exactly**, because the fixture
references them by name:

| Name it exactly | Give it | It receives |
|---|---|---|
| `Business Requester 1` · `Business Requester 2` · `Business Requester 3` | nothing — every member already holds `clm_requester` | the 120 contracts' `owner_id`, dealt by counterparty — 43 / 43 / 34 · and the 143 delivery and reporting obligations under them — 50 / 53 / 40 |
| `Legal Counsel 1` · `Legal Counsel 2` | the `clm_legal_counsel` position | the `legal_owner` of every contract legal has accepted — 34 / 34 · all 56 compliance obligations, by the same counterparty relationship — 29 / 27 · and the `decided_by` of all 17 decided deviations — 10 / 7 |

Each requester's **我的合同 › Launched by Me** and **› My Obligations**, and each
lawyer's **法务工作台 › 审查中** and their own **My Obligations**, fill the moment
the account exists; a decided deviation's **Decided By** shows its lawyer on the
contract page's Deviations grid. All four columns are optional references, so
naming an account that is not there yet costs nothing and no row: it simply
stays empty.
Every dataset is an upsert, so **create the accounts and run `pnpm demo` again**
and their contracts and obligations are handed over. Get a name wrong by one
character and the column stays empty with no error — that is the one thing to
double-check in the names.

**Do that re-run before the daily jobs have run on the database.** Only a clean
database is guaranteed to come back as the known corpus: the fixture re-asserts
every column it declares, the job-written ones included, so once rows have
moved on — the jobs' work above all — a re-run does one of two things to each.

- **Where the state machine allows the way back, it walks the job's work back,
  silently.** The 18 part-paid instalments `payment_overdue` (F11) moved to
  `overdue` return to `partial` — a legal edge, so they count as ordinary
  `updated` rows with no error — and a reset `is_expiring` makes F12 send a
  renewal notice it has already sent.
- **Where it does not, the row is refused and dropped whole.** A contract that
  has since expired or been terminated is not moved back to `active`: the row
  shows as `errored` in the loader's `Seed loading completed` summary, and none
  of its other columns are written either.

The fix is the platform's — seed columns written on create only, upstream
`objectstack-ai/objectstack#25761`, still open — and until it lands, a fresh
database is the only way back to the corpus as shipped.

**One obligation is deliberately left with no owner** and is not a name you have
missed. F10 (`obligation_due`) reminds an obligation's owner and takes a "nobody
to tell" edge when there is none — the demo keeps exactly one unowned row, due
seven days after boot, so that edge stays exercised. `src/data/plan-children.ts`
proves it reachable and says why one is both the minimum and the maximum.

The other six positions are named however you like; they are reached through
the position, not by name.

The dev admin is deliberately none of them. Like every member it holds
`clm_requester`, so it sees 我的合同 and 分析 (`GET /api/v1/meta/app/clm` serves
it exactly those two groups), but it holds no position and no other `clm_*` set:
`clm_legal.access` gates the legal workbench away, and the finance, records and
administration groups stay hidden the same way. A row parked there still lands
on the wrong account — as a contract's legal owner it sits behind a workbench
the dev admin cannot open, and as a business owner or an obligation's owner it
fills the setup account's 我的合同 instead of the requester's — and its
reminders go to somebody who is not going to act on them.

`clm_review.reviewer` is the one reference that still **has to** name the dev
admin: it is `required: true`, so a name that resolves to nothing takes the row
with it, and the dev admin is the only account that exists while the seed runs.
Reassign it once the real accounts are there.

### Rung 1 of the approval ladder is a manager

Every contract sent for approval opens on rung 1: the direct manager of the
contract's **owner** — the business requester who launched it, not the lawyer
who pressed **Send for Approval** — read from that account's
`sys_user.manager_id`. No seed, position or permission set fills that column,
so on an install set up from the tables above alone, no contract gets past
rung 1.

Set it in **Setup → Users → the user → ⋯ → Set Manager**, for each of the three
business requesters and for anyone else who launches contracts. Any other
account in the organization will do — the persona mix has no line managers of
its own, so point all three at one of the accounts above (the executive, say).
The manager needs nothing more: `approve_contract`, the gate a rung acts
through, is in `clm_requester`, which every account holds.

Skip it and the request opens on a slot nobody holds — `pending_approvers`
reads `manager:undefined` (upstream `objectstack-ai/objectstack#22558`) — and
the contract stays locked for approval. Setting the manager afterwards does not
reach a request that is already open: its approvers were resolved when the rung
opened. Only a platform admin moves it on, from **Setup → Approvals → Approvals
Inbox → All**, with **Override Reassign** (or Override Approve / Reject).

No rung sends its approver a message when it opens — nothing in their inbox,
no email. They see it waiting in the Console: the bell counts the approvals
waiting on them and **我的合同 › Waiting on Me** lists them. A reminder sent on
a request does arrive as a message; the missing one on opening is the
platform's, not this app's.

**The rung-1 manager reads the contract while the request waits on them, and
only then.** From @objectstack 18.2.0 the platform gives every person a pending
step waits on a read-only view of the one record the request is about
(upstream `objectstack-ai/objectstack#26180`); this app declares nothing for
it. So a manager who holds no position at all opens the request from
**我的合同 › Waiting on Me** and lands on the contract page itself, with
**通过 / 拒绝** above it. Every tab opens: the overview, **版本** (the version's
PDF opens), **审查与偏离**, **审批记录**, **履约与收付款**, **签署与归档** and **讨论**,
and each review, deviation, obligation, signature round and version opens on
its own page. Nothing can be changed: the page has no **编辑**, its **⋯** menu
offers only 添加到收藏 and 分享, and a write through the API answers
`403 PERMISSION_DENIED`.

The read ends with the step. Once the manager approves or rejects, the contract,
its child rows and its files are closed to them again — the page they decided
on reads 「未找到记录」 straight away, which means the step is over, not that
the record is gone. A contract of a report's that is not waiting on them (a
draft, or one already past rung 1) stays closed too: on the open edition
being the owner's manager grants no read. The scope that would
(`own_and_reports`, DESIGN.md §04 `contract_manager_reports`) is an
enterprise-edition hierarchy scope that the open edition resolves to
owner-only. The rungs after rung 1 are positions, and each reads the contracts
it approves.

### Assigning a position from a script

Clicking through Setup → Users needs nothing more than the table above. Automating it does: the
assignment binds by the position's **name**, not by its id. Read that off the declaration, not off
the field name — `sys_user_position.position` is declared `text`, and its own description says what
it carries: *"Position machine name (references `sys_position.name`)."* The field name tells you
nothing here, because this object mixes both kinds freely: `user_id`, `granted_by`, `delegated_from`
and `certified_by` are all genuine lookups, and only three of its fourteen fields carry an `_id`
suffix at all. The neighbouring object binds the same way: a direct permission-set grant is a
`sys_user_permission_set` row whose `permission_set` column is `text` and carries the set's **name**
(`{ "user_id": "…", "permission_set": "clm_legal" }`) — there is no id-typed column to reach for.

```http
POST /api/v1/data/sys_user_position
{ "user_id": "…", "position": "clm_legal_counsel" }
```

A name-spelled row grants the permission set that position names (`permissionSets` in
`src/sharing/positions.ts`). `clm_requester` does not come from the position but from membership — a
lawyer holds `clm_legal` and `clm_requester` both, and `security/explain` attributes the second to the
"additive baseline". To read back what an account actually ended up with:

```http
POST /api/v1/security/explain
{ "userId": "…", "object": "clm_contract", "operation": "read" }
```

`object` and `operation` are both required there — a body carrying only `userId` answers
`400 VALIDATION_FAILED`.

**An id in the `position` field is accepted, not refused.** Nothing resolves that column on write, so
a row spelled with the position's id is stored verbatim, matches no position and grants no permission
set — and the write still answers `201`, with no diagnostic anywhere to say so. The account lands where
a plain member does: signed in with `clm_requester` alone, served 我的合同 and 分析 but none of the
position's own groups, with nothing in the response that created it pointing at why. The silent acceptance is
the platform's — `objectstack-ai/objectstack#16712`, still open — so until that lands, the spelling is
the whole defence.

A manager is an admin operation, not a data write. **Set Manager** posts exactly this, as a platform
admin (the dev admin is one):

```http
POST /api/v1/auth/admin/set-user-manager
{ "userId": "…", "managerId": "…" }
```

The data API refuses the column outright: a `PATCH /api/v1/data/sys_user/…` carrying `manager_id`
answers `403 PERMISSION_DENIED`, because it edits only `name`, `image` and `locale` on a user.

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
