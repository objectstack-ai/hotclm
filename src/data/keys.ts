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
 * Who launched each contract — the `业务承办 ×3` of DESIGN.md §10's persona
 * mix, as ACCOUNT NAMES the loader resolves against `sys_user.name`.
 *
 * ## A seed CAN name a user; nothing else fills this column
 *
 * `clm_contract.owner_id` is a `lookup('sys_user')` exactly like `legal_owner`,
 * and `scripts/demo.mjs` sequences two boots so that a name resolves. Nothing
 * fills it otherwise: the security middleware that "stamps the acting user on
 * any insert that leaves it empty" stands aside for system writes at its first
 * line (`if (opCtx.context?.isSystem) return next()`), and a seed insert has no
 * acting user to stamp. `contract.seed.ts` carries both measurements.
 *
 * ## Why these three names and not {@link DEMO_USER}
 *
 * The dev admin holds no `clm_*` permission set, so `clm_requester.access`
 * gates every 我的合同 item away from it: measured on this fixture,
 * `GET /api/v1/meta/app/clm` serves that account `navigation: []`. Contracts
 * parked on it would be owned by the one account that can never open the
 * screen they are meant to fill. The accounts that CAN are the ones DESIGN.md
 * §10 has the operator create in Setup, so those are the names the deal uses.
 *
 * That is also why this field and `legal_owner` name different accounts, which
 * is not an inconsistency but the difference between the two references:
 * `clm_review.reviewer` is `required: true`, so a name that resolves to
 * nothing costs the whole row and it must be an account that exists AT SEED
 * TIME — the dev admin, the only one there is. `owner_id` is optional, so it
 * may name an account that does not exist yet: measured on 17.3.0, an
 * unresolvable name lands NULL, silently, and never refuses the row. Every
 * dataset is an upsert, so creating the accounts and running `pnpm demo` again
 * hands their contracts over. The README says so where the operator reads it.
 *
 * ## Why the counterparty decides
 *
 * A requester owns a RELATIONSHIP, not a random third of the book: every
 * contract with a given counterparty belongs to the same person, so each
 * requester's 我的合同 spans types, statuses and amounts the way a real desk
 * does. Dealing the 40 counterparties across the three accounts by their
 * position in `PARTY_PLAN` is the whole rule, and it is structure — no locale
 * bundle is consulted, so `demo-en` and `demo-zh` deal identically.
 */
export const CONTRACT_OWNERS: readonly string[] = [
  'Business Requester 1',
  'Business Requester 2',
  'Business Requester 3',
];

/** The requester who launched this contract, by counterparty relationship. */
export const ownerOf = (contract: ContractPlan): string =>
  CONTRACT_OWNERS[contract.partyIndex % CONTRACT_OWNERS.length]!;

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
