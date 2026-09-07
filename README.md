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
pnpm dev          # REST + Console on http://localhost:3000
```

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
| `docs/backlog/` | Dispatch-ready work cards (each file is an issue body) |

## License

Apache-2.0 — see [LICENSE](./LICENSE).
