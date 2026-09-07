# Release: docs site, screenshots, feature inventory, marketplace publish

Milestone: M4 · Labels: `pm:queue` · Blocked-by: 10, 11, 12, 13

## Scope
`apps/docs` (Fumadocs, standalone lockfile) + `content/docs/` (legal · finance · admin · publishing
guides, zh-Hans + en); `assets/screenshots/hotclm/<screen>/<locale>.png` with `meta.yaml`;
`docs/feature-inventory.md` (one line per feature, stable ids `CON-001 …`, source anchors);
`scripts/publish-marketplace.mjs`, `scripts/check-source-token-ratchet.mjs` (business ≤ 60k, UI ≤ 30k)
and `test/docs-*.test.ts` pins modeled on HotCRM; `docs/requirements/` with `TEMPLATE.md` and the
A/B/C/D disposition README.

## Acceptance
- A stranger clones and runs the app with one command; `pnpm verify` green; every README number is derived
  by a test from `src/`; marketplace one-click install works on a fresh environment.
- Every requirement line in the seeded requirements doc maps to a feature-inventory row and a test.

## Out of scope
Anything that widens the product — findings become new cards.
