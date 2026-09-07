// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { cel } from '@objectstack/spec';

/**
 * Helpers every `*.seed.ts` family in this directory shares.
 *
 * ## What a seed write actually is here — measured, not assumed
 *
 * The seed loader writes with `{ isSystem: true, skipTriggers: true,
 * seedReplay: true }`, and each of the three decides something this dataset
 * depends on. All three were measured against `@objectstack/*` 17.3.0 on a
 * throwaway database before a row of this demo was written; the PR body
 * carries the transcripts.
 *
 *  - **`isSystem` makes the seed a system write.** `contract.hook.ts` exempts
 *    system writes from the born-draft rule (`ctx.session?.isSystem !== true`),
 *    so a row lands directly in `active` instead of being refused. The same
 *    exemption is what lets `clm_obligation` / `clm_payment_plan` rows be born
 *    `overdue`, a state both child machines otherwise reserve for the daily
 *    job of card 09.
 *  - **`skipTriggers` suppresses record-change AUTOMATION, not lifecycle
 *    hooks.** F5 (`contract_approval`) and F7 (`signature_record`) never fire
 *    over these rows. The type stamp, the routing hook, the `display_name`
 *    mirrors and the roll-up recompute all DO — which is why nothing below
 *    authors `contract_number`, `category`, `direction`,
 *    `execution_formalities`, `display_name` or any of the five roll-ups.
 *  - **`seedReplay` skips platform state-machine entry guards.** The CLM
 *    machines are HOOKS on `beforeUpdate`, and a seed insert never reaches an
 *    update, so no transition table is consulted for a seeded row at all.
 *
 * ## The two rules that follow, and they are not style preferences
 *
 * 1. **A field a hook owns is never authored here.** The stamp would be
 *    overwritten on the way in, so authoring it creates a second source of
 *    truth that silently loses.
 * 2. **A field a FLOW owns is authored only where the seeded value equals
 *    what that flow would have computed.** `approval_status`, the four
 *    `route_*` flags and the stage timestamps are readonly and flow-written;
 *    a seed CAN write them (measured — the read-only strip does not apply to
 *    the seed path) and this dataset does, because a contract in `approved`
 *    whose `approved_at` is empty is a worse lie than one whose `approved_at`
 *    is the day the fixture says it was approved. The `route_*` flags are not
 *    guessed: {@link routeFlags} re-implements `contract_route`'s matching
 *    rules against the same seeded matrix, so the stamp equals the
 *    evaluation.
 */

/** `daysAgo(n)` as a runtime-built CEL expression. */
export const daysAgo = (n: number) => cel`daysAgo(${n})`;

/** `daysFromNow(n)` as a runtime-built CEL expression. */
export const daysFromNow = (n: number) => cel`daysFromNow(${n})`;

/**
 * A day offset relative to boot, in the one spelling the whole fixture uses.
 *
 * Negative is the past, positive the future, and `0` is today. Every date in
 * this demo goes through here: DESIGN.md §10 wants a demo that does not age,
 * and a fixed ISO date in a seed is a demo that is stale the week after it
 * ships. The loader evaluates the CEL at seed time, so re-running `pnpm demo`
 * on an existing database slides every row forward to the new boot day.
 */
export const dayOffset = (days: number) => (days < 0 ? daysAgo(-days) : daysFromNow(days));

/**
 * A deterministic 32-bit PRNG (mulberry32), used to give 120 contracts and
 * their 500-odd children variety without hand-writing every value.
 *
 * Determinism is load-bearing rather than tidy: every dataset below is
 * `mode: 'upsert'` and matched on a natural key, so a plan that produced
 * different values on the next boot would not update the row it wrote last
 * time — it would write a second one. A pure function of a fixed constant is
 * the same plan on every machine, every boot and both locales.
 */
export const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Pick deterministically from a list. */
export const pick = <T>(list: readonly T[], n: number): T => list[Math.abs(n) % list.length] as T;

/**
 * Refuse a duplicate natural key at COMPILE time.
 *
 * `mode: 'upsert'` matches on the natural key, so two rows sharing one key are
 * not a cosmetic collision: the second silently overwrites the first, the row
 * counts come out short, and nothing in the boot log says why. The generators
 * build titles from a type and a counterparty, which is exactly the kind of
 * composition that can collide as the plan grows — so the check runs when the
 * artifact is compiled, where a failure stops the build instead of shipping.
 */
export const assertUniqueKeys = (dataset: string, keys: readonly string[]): void => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `demo fixture: ${dataset} has ${duplicates.size} duplicate natural key(s) — ` +
        `${[...duplicates].slice(0, 5).join(', ')}. Every row must be uniquely identifiable ` +
        'or `mode: \'upsert\'` overwrites rows instead of inserting them.',
    );
  }
};

/** Refuse a row count that has drifted from the DESIGN.md §10 table. */
export const assertCount = (dataset: string, actual: number, expected: number): void => {
  if (actual !== expected) {
    throw new Error(
      `demo fixture: ${dataset} produced ${actual} rows, DESIGN.md §10 pins ${expected}. ` +
        'Fix the plan, or raise a decision card if the table itself is wrong.',
    );
  }
};
