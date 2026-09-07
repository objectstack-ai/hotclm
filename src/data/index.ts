// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Seed } from '@objectstack/spec/data';

import { approvalRuleSeed, clauseSeed, contractTypeSeed } from './catalog.seed.js';
import { contractSeed } from './contract.seed.js';
import { deviationSeed, reviewSeed, signatureSeed } from './negotiation.seed.js';
import { partySeed } from './party.seed.js';
import { obligationSeed, paymentPlanSeed } from './post-signature.seed.js';

/**
 * The HotCLM demo dataset — one fictional multi-entity group (a US parent with
 * European and Asia-Pacific subsidiaries), six months of live negotiation, and
 * a book of contracts already in force (DESIGN.md §10).
 *
 * `demo-en` is the default and `demo-zh` is the same rows in Chinese. See
 * `demo-locale.ts` for the `OS_SEED_LOCALE` switch and `plan.ts` for why "the
 * same rows" is a structural guarantee rather than a promise: both locales run
 * one locale-blind plan through one set of generators.
 *
 * ── Order ─────────────────────────────────────────────────────────────────
 * The loader sorts datasets topologically by reference before it runs them, so
 * this array is written for a READER. Two things about it are load-bearing
 * anyway:
 *
 *  - **The configuration objects come first.** `clm_contract.contract_type`
 *    resolves against a type's `name` and `clm_deviation.clause` against a
 *    clause's `title`; a reference that resolves to nothing on a `required`
 *    column takes the whole row with it.
 *  - **`clm_contract` comes before its five children**, all of which reference
 *    it by title through the one function in `keys.ts`.
 *
 * ── clm_contract_version is missing, and that is deliberate ───────────────
 * DESIGN.md §10 asks for 300 contract versions. `clm_contract_version.file` is
 * `required: true` (§03) and a `file` value is an opaque `sys_file` id minted
 * by an upload; a declarative seed cannot mint one, and the three spellings a
 * seed could try were measured: omitted is refused ("File is required"), a URL
 * is accepted but makes the platform refuse to attest its own
 * `adr-0104-file-references` migration, and an id-shaped token is accepted
 * silently and points at nothing. The last is the one that would have shipped
 * quietly, and it is the one AGENTS.md forbids. So no versions are seeded,
 * `version_count` reads an honest 0 on every contract, and the PR raises the
 * §03/§10 conflict as a decision rather than resolving it here.
 *
 * ── Environment ───────────────────────────────────────────────────────────
 * Every dataset takes `Seed.env`'s default — `['prod', 'dev', 'test']` — so
 * the demo loads wherever the app is booted once it has been ASKED for, which
 * is what makes it testable as well as demonstrable. `env` decides which
 * deployments a seed is ELIGIBLE for; {@link DEMO_SEED_ENV_VAR} decides
 * whether this deployment wanted a demo at all.
 */
export const demoSeeds: Seed[] = [
  // 1. Configuration first — every contract resolves its type here, and every
  //    deviation its clause.
  contractTypeSeed,
  clauseSeed,
  approvalRuleSeed,

  // 2. The counterparties.
  partySeed,

  // 3. The contracts themselves, including the self-references (a statement of
  //    work under its master agreement, an amendment under its parent).
  contractSeed,

  // 4. The children, in the order a contract acquires them.
  reviewSeed,
  deviationSeed,
  signatureSeed,
  obligationSeed,
  paymentPlanSeed,
];

// ─── The demo is opt-in, and off by default ─────────────────────────────────
//
// `data` carries the demo only when `CLM_DEMO_SEED` is set. `pnpm demo` sets
// it; `pnpm dev` does not.
//
// This is a product decision, not a switch bolted on to route around a defect.
// HotCLM is a sellable standard product (AGENTS.md), and a standard product
// does not install 780 rows of a fictional group's contract book into every
// fresh deployment. Someone evaluating HotCLM FOR THEIR OWN LEGAL TEAM wants
// an empty app to put their own contract types into; handing them somebody
// else's counterparties to delete first is not a neutral default, it is a
// different product than the one they asked for. Someone evaluating THE IDEA
// wants the demo, fully populated, immediately. Those are two intentions, and
// they get two commands.
//
// "Off" means genuinely empty, not "empty of contracts". A default seed that
// still installed the nine contract types would be the same product mistake at
// a smaller scale — a customer's first act would be deleting a playbook they
// did not write — so the gate wraps the WHOLE array rather than filtering rows
// out of it.
//
// ── One mechanical detail: the flag is read at COMPILE time ────────────────
//
// The seed is baked into `dist/objectstack.json`, so this gate is evaluated
// when the artifact is compiled — not when the server starts — and `os dev`
// reuses an existing artifact instead of recompiling it. Both `pnpm dev` and
// `pnpm demo` therefore boot with `--compile`, so every boot's artifact
// matches the flags that boot was started with. Without that, `pnpm demo`
// followed by `pnpm dev` would silently serve the previous run's demo artifact
// and the default would not be a default.

/** The environment variable that asks for the demo dataset. */
export const DEMO_SEED_ENV_VAR = 'CLM_DEMO_SEED';

// The one Node global this app reads. `@types/node` is deliberately not a
// dependency of a metadata package, so the single property the gate needs is
// declared narrowly and locally rather than pulling the whole Node type
// surface in for it. Module-scoped, so it shadows nothing globally.
declare const process: { env: Record<string, string | undefined> };

/** Opt-in spellings. Anything else — including unset — means off. */
const OPT_IN = ['1', 'true', 'on', 'yes'];

/** Whether this compile was asked for the demo dataset. */
export const demoSeedRequested = (): boolean =>
  OPT_IN.includes((process.env[DEMO_SEED_ENV_VAR] ?? '').trim().toLowerCase());

/** What `defineStack({ data })` installs: nothing at all, unless asked. */
export const clmSeeds: Seed[] = demoSeedRequested() ? demoSeeds : [];

export { DEMO_SEED_ENV_VAR as CLM_DEMO_SEED_ENV_VAR };
export { SEED_LOCALE, SEED_LOCALE_ENV_VAR, type SeedLocale } from './demo-locale.js';
