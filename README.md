<p align="center"><strong>HotCLM</strong></p>

# HotCLM

**Contract lifecycle management on [ObjectStack](https://github.com/objectstack-ai/objectstack) — buy-side, sell-side and everything in between, as typed metadata.**
Self-serve intake, a clause playbook, a data-driven approval matrix, sealing and e-signature, obligations and payment schedules: the whole lifecycle in one readable repository.

**基于 ObjectStack 的合同全生命周期管理。** 业务自助发起、条款库与偏离、审批矩阵、用印与电子签、履约义务、收付款计划 —— 全部是类型化元数据。

> Status: **M0 — scaffold and configuration domain.** See [DESIGN.md](./DESIGN.md) for the model and
> [docs/backlog](./docs/backlog/README.md) for what is being built next. Sibling app of
> [HotCRM](https://github.com/objectstack-ai/hotcrm): commercial terms stay in the CRM, legal state lives here.

## What it is

- **Ironclad-shaped, not OA-shaped.** A contract type *is* a workflow: intake fields, review, approval ladder, signing method, archive rules — configuration, not code.
- **Business users launch, legal controls.** One intake form per contract type; the approval matrix decides who signs off.
- **Contracts are data.** Obligations, payment schedules, renewals and deviations from the clause playbook are queryable records with reminders, not paragraphs in a PDF.
- **Built for the market it sells in.** Sealing requests (用印), a counterparty register with verification, and a `zh-CN`-first demo.
- **Industry-neutral by rule** — contract types, thresholds, seal kinds and payment terms live in seed data only.

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
