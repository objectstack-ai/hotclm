# docs/ — how HotCLM manages goals, requirements and work

Four layers, each with one job. Nothing lives in two of them.

| Layer | Where | What it holds | Changes how |
|---|---|---|---|
| **Direction** | [`ROADMAP.md`](./ROADMAP.md) | Releases, themes, what each release unlocks and what it depends on | Maintainer edits; a dated entry per change |
| **Requirements baseline** | [`design/00-设计方案.md`](./design/00-设计方案.md) | The complete business design; §待确认事项 becomes 已确认口径 when the maintainer answers | Versioned, append-only version record; V1.0 = the baseline for release 1.0 |
| **Engineering authority** | [`../DESIGN.md`](../DESIGN.md) | Names, enums, OWD, guards, flows, milestones — what a card may not contradict | Amended by decision; a card that conflicts stops with `needs_decision` |
| **Customer asks** | [`requirements/`](./requirements/) *(created with the first customer)* | One file per raw requirement, verbatim, with an A/B/C/D disposition (already supported · standard enhancement · customer overlay · decline) | File per ask; only B lands in `src/` |
| **Work** | [`backlog/`](./backlog/) → GitHub issues | Dispatch-ready cards; an issue exists only while a card is ready or in flight | Card → issue with `pm:queue` → draft PR → closed on merge |

## Why issues stay small

GitHub issues are for **work that is ready to dispatch, bugs, and `needs-user-decision` questions** — nothing else. Goals live in the roadmap, requirements in the versioned design documents, and "what exists" in the feature inventory (`feature-inventory.md`, created at M4 with stable ids `CON-001 …`). An issue that would restate a design chapter is a sign the chapter is missing, not a reason to open the issue.

Traceability runs through ids, not through issue links: a customer ask (`requirements/NNNN-slug.md`) → a design chapter (§) → a feature-inventory row (`CON-nnn`) → a test. The dispatch report and the PR body name the ids they touched.

## GitHub conventions

- **Milestones** `M1 数据与权限骨架` · `M2 发起与审批` · `M3 签后与分析` · `M4 集成与发布` mirror `DESIGN.md` §11; every issue carries one.
- **Labels**: `pm:queue` (ready) · `pm:dispatched` (in flight) · `needs-user-decision` (blocked on the maintainer) · `bug` · `platform-gap` (reported upstream, fixture in place).
- **`Blocked-by: #n`** in the issue body is honoured by the dispatch loop.
- One issue per PR, draft PRs, squash merges by the maintainer.
