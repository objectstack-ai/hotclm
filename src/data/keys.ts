// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { STRINGS } from './demo-locale.js';
import { CONTRACT_PLAN, type ContractPlan } from './plan-contracts.js';
import { assertUniqueKeys } from './_shared.js';

/**
 * The natural keys every dataset in this directory is matched on.
 *
 * Each dataset runs `mode: 'upsert'` so `pnpm demo` is re-runnable on a
 * database that already holds the demo — the second run slides every
 * boot-relative date forward instead of writing a second copy of the book. An
 * upsert is only as good as its key, so the keys are built HERE, once, and
 * both the parent row and every child that points at it call the same
 * function. A child that spelled its parent's title itself would resolve to
 * nothing the day a title changed, and the loader would report the row as
 * seeded with the reference silently null.
 *
 * A contract's key is its title, and a title is localised — so `demo-en` and
 * `demo-zh` key their rows differently, which is correct: they are the same
 * rows written in two languages, and a database seeded in one and re-seeded in
 * the other holds both books rather than a half-translated one. That is a
 * property of the two-locale design, not an accident of it; `pnpm demo` and
 * `pnpm demo:zh` are meant to be pointed at their own databases.
 */

/** The account the demo is driven as — the platform's dev admin. */
export const DEMO_USER = 'Dev Admin';

/**
 * `<type> — <counterparty>`, with a qualifier when a counterparty has more
 * than one contract of the same type.
 */
export const contractTitle = (contract: ContractPlan): string => {
  const type = STRINGS.contractTypes[contract.typeIndex]!;
  const party = STRINGS.parties[contract.partyIndex]!;
  const base = `${type.name} — ${party.name}`;
  return contract.qualifierIndex === null
    ? base
    : `${base} (${STRINGS.titleQualifiers[contract.qualifierIndex % STRINGS.titleQualifiers.length]})`;
};

/** The title of the contract a child row hangs off. */
export const titleOfIndex = (index: number): string => contractTitle(CONTRACT_PLAN[index]!);

// Proven when the artifact is compiled, in whichever locale is being compiled:
// a duplicate title would make two contracts one row on replay.
assertUniqueKeys('clm_contract', CONTRACT_PLAN.map(contractTitle));
