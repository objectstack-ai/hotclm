// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { Obligation } from '../objects/obligation.object.js';
import { PaymentPlan } from '../objects/payment-plan.object.js';

import { assertUniqueKeys, dayOffset, fixtureFile } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { obligationOwnerOf, titleOfIndex } from './keys.js';
import { OBLIGATION_PLAN, PAYMENT_PLAN } from './plan-children.js';

/**
 * The post-signature book: 200 obligations and 300 payment instalments
 * (DESIGN.md §10), with 40 obligations and 30 instalments falling due inside
 * the next 30 days and 10 obligations and 12 instalments already in arrears.
 *
 * Every date is boot-relative, so the "next 30 days" is the next 30 days on
 * the machine the demo is running on rather than the one it was written on.
 * That is what the card means by a demo that does not age, and it is checkable
 * from outside: `$filter=due_date lt <today>` on the seeded rows should return
 * exactly the arrears count on any day of any year.
 */

const obligationTitle = (kind: keyof typeof STRINGS.obligationTitles, index: number): string => {
  const pool = STRINGS.obligationTitles[kind];
  return pool[index % pool.length]!;
};

const obligationRecords = OBLIGATION_PLAN.map((obligation) => ({
  contract: titleOfIndex(obligation.contractIndex),
  title: obligationTitle(obligation.kind, obligation.titleIndex),
  kind: obligation.kind,
  due_date: dayOffset(obligation.dueDate),
  // The desk that performs it — a requester for deliverables and reports, the
  // counterparty's lawyer for compliance filings, and `null` on the one row
  // `leaveUnassigned` keeps F10's "nobody to tell" edge alive with. See
  // `keys.ts` for why it is not the dev admin any more.
  owner: obligationOwnerOf(obligation),
  status: obligation.status,
  completed_at: obligation.completedAt === null ? null : dayOffset(obligation.completedAt),
  // Proof of performance on the 90 obligations that are done, and on no
  // other: an open obligation has nothing to prove yet, and a waived one was
  // let go rather than performed.
  evidence: obligation.status === 'done' ? fixtureFile('evidence', 'evidence.pdf') : null,
  notes: null,
}));

// (contract, title) is the natural key, so two obligations on one contract
// must not share a title. The plan gives each round-robin round a different
// `kind`, and therefore a different title pool — proven here rather than
// assumed, because a collision would silently halve a contract's obligations.
assertUniqueKeys(
  'clm_obligation',
  OBLIGATION_PLAN.map((o) => `${o.contractIndex}::${obligationTitle(o.kind, o.titleIndex)}`),
);

/**
 * What a re-run of `pnpm demo` leaves alone on a row it matches (issue #41):
 * the status and what the transition into it records. Written when the seed
 * creates the row, never again — `applyOn: 'create'`.
 *
 * `status` is the column the daily jobs own once the row exists: F10 moves an
 * obligation into `overdue`, F11 an instalment into `due` and `overdue`, and
 * nothing else may (both state machines refuse `overdue` from any non-system
 * write). Re-asserted on a re-run, it either walked the job back along a legal
 * edge — measured: the 18 part-paid instalments F11 had flagged went from
 * `overdue` back to `partial`, silently — or was refused, and the refused row
 * was dropped whole (a `paid` instalment cannot go back to `due`).
 *
 * The other columns move WITH the status: `completed_at` is stamped by
 * `obligation_state_machine` on `done`, and `actual_date` by
 * `payment_plan_state_machine` on `partial` / `paid`, in the same write as the
 * amount and invoice the finance desk records. Left `always`, a re-run would
 * blank the receipt of an instalment somebody has since paid.
 *
 * `evidence` is the obligation's half of that receipt: whoever marks an
 * obligation done attaches the proof, so a re-run that wrote the fixture's
 * empty value back would delete it.
 */
const CREATE_ONLY = { applyOn: 'create' } as const;

export const obligationSeed = defineSeed(Obligation, {
  externalId: ['contract', 'title'],
  mode: 'upsert',
  columns: {
    status: CREATE_ONLY,
    completed_at: CREATE_ONLY,
    evidence: CREATE_ONLY,
  },
  records: obligationRecords,
});

export const paymentPlanSeed = defineSeed(PaymentPlan, {
  externalId: ['contract', 'seq'],
  mode: 'upsert',
  columns: {
    status: CREATE_ONLY,
    actual_date: CREATE_ONLY,
    actual_amount: CREATE_ONLY,
    invoice_no: CREATE_ONLY,
  },
  records: PAYMENT_PLAN.map((instalment) => ({
    contract: titleOfIndex(instalment.contractIndex),
    seq: instalment.seq,
    planned_date: dayOffset(instalment.plannedDate),
    planned_amount: instalment.plannedAmount,
    condition: STRINGS.paymentConditions[instalment.conditionIndex]!,
    status: instalment.status,
    actual_date: instalment.actualDate === null ? null : dayOffset(instalment.actualDate),
    actual_amount: instalment.actualAmount,
    invoice_no: instalment.invoiceNo,
    notes: null,
  })),
});
