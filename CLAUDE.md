# CLAUDE.md

**[AGENTS.md](./AGENTS.md) is the source of truth for working in this repo — read it.**
Three rules there must never be missed:

## ⛔ Gate every metadata change

`pnpm validate && pnpm lint && pnpm typecheck && pnpm lint:i18n-gate` must all pass before a change
is reported as done. Metadata mistakes fail silently at runtime; the gates are the only place they
surface early.

## ⛔ Worktree-first, never `git stash`

One dedicated worktree per task (`git worktree add ../hotclm-issue-<n> -b claude/issue-<n>-<slug> origin/main`).
The stash stack is shared across worktrees — use a wip commit or a patch instead.

## ⛔ Claim the issue before you write any code

Assign the issue to yourself and post a `Claim:` comment naming your session and branch as the
**first action** of the task. An earlier claim from a different session means the issue is taken.

Architecture decisions live in **[DESIGN.md](./DESIGN.md)**; a card that conflicts with it stops and asks.
