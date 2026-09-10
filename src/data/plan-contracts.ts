// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { assertCount, rng } from './_shared.js';
import {
  APPROVAL_RULE_PLAN,
  CLAUSE_PLAN,
  CONTRACT_TYPE_PLAN,
  PARTY_PLAN,
  jurisdictionOf,
  routeFlagsFor,
  type ClausePlan,
  type RouteFlags,
} from './plan.js';

/**
 * The 120 contracts of DESIGN.md §10 and the five child families that hang off
 * them — structure only, no strings, no locale.
 *
 * ## Provenance: what a seeded row claims about its own past
 *
 * This is the card's trap, answered per status and recorded in the data rather
 * than only in a PR body. A seed is a system write, so `contract.hook.ts`
 * exempts it from the born-draft rule and a row CAN land in any state; nothing
 * refuses it. What no seed can do is produce the HISTORY that state normally
 * implies — F5 opens a `sys_approval_request` on entering `in_approval`, and
 * `skipTriggers` means F5 never fires over a seeded row. Even if it did, it
 * could not complete: rung 1 is `type: 'manager'`, and at seed time there is
 * nobody for it to resolve — every contract is launched by one of the three
 * business requesters DESIGN.md §10 leaves to the OPERATOR to create
 * (`keys.ts`), so on a fresh database no owner exists to have a manager
 * (measured on 17.4.0: 120 `owner_id` references unresolved after pass 2).
 * WHICH boot mints the dev admin is a separate fact, measured in exactly one
 * place — `scripts/demo.mjs` — and this argument does not rest on it: #21's
 * two-boot handover primes that account BEFORE the seed runs. `pnpm validate`
 * already warns that an approval node whose approvers resolve empty "waits
 * forever, and (lockRecord) the record stays locked with no in-product
 * recovery". Driving 42 contracts through the ladder at seed time would not be
 * slow; it would be 42 permanently locked records.
 *
 * So every row lands in its final state as system data, and the plan splits
 * the 72 executed contracts into two populations that say so:
 *
 *  - **24 negotiated** (`backfilled: false`) carry the artefacts a real run
 *    leaves behind: legal reviews with decisions, deviations, a completed
 *    signature round, and the stage timestamps in order. What they do NOT
 *    carry is a `sys_approval_request`, because none was ever opened.
 *  - **48 backfilled** (`backfilled: true`) claim nothing they do not have.
 *    They reach `active` with no `submitted_at`, no `review_started_at`, no
 *    `approved_at`, no review, no deviation and no signature round — which is
 *    exactly `clm_contract.is_backfilled`'s own definition ("an already-
 *    executed contract entered after the fact … starts active and skipped
 *    review and approval", DESIGN.md §13 Q8). A historical corpus loaded into
 *    a new system IS a backfill; marking it so is the honest reading, and it
 *    makes the distinction filterable instead of invisible.
 *
 * The 42 contracts at `in_approval` or beyond that are NOT backfilled carry
 * `approval_status` matching their status, so every surface inside the app
 * agrees with every other. The one surface that disagrees is the platform's:
 * `sys_approval_request` is empty, so the approval inbox and any dashboard
 * counting approval requests read zero. That is stated in the PR body and in
 * the README rather than left for a customer to find.
 */

export type ContractStatus =
  | 'draft' | 'submitted' | 'in_review' | 'in_approval' | 'approved'
  | 'signing' | 'active' | 'expired' | 'terminated' | 'cancelled';

/** DESIGN.md §10's status spread, in the table's own order. */
const STATUS_SPREAD: readonly (readonly [ContractStatus, number])[] = [
  ['draft', 10], ['submitted', 6], ['in_review', 12], ['in_approval', 8],
  ['approved', 4], ['signing', 6], ['active', 60], ['expired', 8],
  ['terminated', 4], ['cancelled', 2],
];

/** Day offsets relative to boot; negative is the past. */
export interface Timeline {
  readonly submittedAt: number | null;
  readonly reviewStartedAt: number | null;
  readonly approvedAt: number | null;
  readonly signedAt: number | null;
  readonly executedAt: number | null;
  readonly activatedAt: number | null;
  readonly closedAt: number | null;
  readonly startDate: number | null;
  readonly endDate: number | null;
}

export interface ContractPlan {
  readonly index: number;
  readonly typeIndex: number;
  readonly partyIndex: number;
  /** `null` unless a second contract of this type shares this counterparty. */
  readonly qualifierIndex: number | null;
  readonly status: ContractStatus;
  /** Reached `active` with no review and no approval — DESIGN.md §13 Q8. */
  readonly backfilled: boolean;
  /** Index of the parent contract in this array, for SOWs and amendments. */
  readonly parentIndex: number | null;
  readonly amount: number | null;
  readonly isAmountEstimated: boolean;
  readonly liabilityCap: number | null;
  readonly termMonths: number;
  readonly autoRenew: boolean;
  readonly renewalNoticeDays: number | null;
  readonly paymentTerms: 'net_15' | 'net_30' | 'net_60' | 'net_90' | 'due_on_receipt' | null;
  readonly confidentialityTermMonths: number | null;
  readonly riskLevel: 'low' | 'medium' | 'high' | null;
  readonly currentTurn: 'none' | 'internal' | 'counterparty';
  readonly turnSince: number | null;
  readonly hasLegalOwner: boolean;
  readonly timeline: Timeline;
  readonly route: RouteFlags;
  readonly approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  /** Ends within 30 days of boot — the renewal pipeline of DESIGN.md §10. */
  readonly expiringSoon: boolean;
}

// ─────────────────────────────────────────── which type, with which party ──

/**
 * The 120 (type, counterparty) pairs, in an order that guarantees a parent is
 * planned before the contract that points at it.
 *
 * The shape is a group's real book rather than a uniform sprinkle: sixteen
 * framework agreements with the customer base, statements of work underneath
 * them, order forms on top, then the inbound supplier and lease book, the
 * contractor engagements, and the confidentiality cover that precedes all of
 * it. `parentType` names which earlier contract the child hangs off.
 */
interface Pairing {
  readonly typeIndex: number;
  readonly partyIndex: number;
  /** Type index of the parent to link to for the same counterparty. */
  readonly parentTypeIndex?: number;
}

const PAIRINGS: Pairing[] = [];
// 16 master agreements, one per customer.
for (let party = 0; party < 16; party += 1) PAIRINGS.push({ typeIndex: 1, partyIndex: party });
// 16 statements of work, each under its customer's master agreement.
for (let party = 0; party < 16; party += 1) PAIRINGS.push({ typeIndex: 2, partyIndex: party, parentTypeIndex: 1 });
// 8 second statements of work for the largest accounts.
for (let party = 0; party < 8; party += 1) PAIRINGS.push({ typeIndex: 2, partyIndex: party, parentTypeIndex: 1 });
// 16 order forms.
for (let party = 0; party < 16; party += 1) PAIRINGS.push({ typeIndex: 3, partyIndex: party });
// 20 confidentiality agreements — customers, suppliers, contractors, and the
// two blocked counterparties, whose contracts never leave draft.
for (const party of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 17, 18, 19, 20, 21, 30, 31, 38, 39]) {
  PAIRINGS.push({ typeIndex: 0, partyIndex: party });
}
// 18 supplier agreements — the whole supplier base, four of them twice.
for (let party = 16; party < 30; party += 1) PAIRINGS.push({ typeIndex: 4, partyIndex: party });
for (let party = 16; party < 20; party += 1) PAIRINGS.push({ typeIndex: 4, partyIndex: party });
// 10 data-processing agreements.
for (const party of [9, 13, 24, 27, 19, 25, 2, 6, 10, 23]) PAIRINGS.push({ typeIndex: 5, partyIndex: party });
// 6 leases — facilities suppliers and the two public bodies.
for (const party of [16, 19, 23, 25, 36, 37]) PAIRINGS.push({ typeIndex: 6, partyIndex: party });
// 6 contractor engagements — the six individuals.
for (let party = 30; party < 36; party += 1) PAIRINGS.push({ typeIndex: 7, partyIndex: party });
// 4 amendments, each varying an agreement already in the book.
PAIRINGS.push({ typeIndex: 8, partyIndex: 0, parentTypeIndex: 1 });
PAIRINGS.push({ typeIndex: 8, partyIndex: 4, parentTypeIndex: 1 });
PAIRINGS.push({ typeIndex: 8, partyIndex: 16, parentTypeIndex: 4 });
PAIRINGS.push({ typeIndex: 8, partyIndex: 36, parentTypeIndex: 6 });
assertCount('clm_contract (pairings)', PAIRINGS.length, 120);

// ────────────────────────────────────────────────── the status assignment ──

/**
 * Deal the §10 status spread across the 120 pairings, then repair the one
 * constraint the deal cannot know about.
 *
 * `contract_state_machine` refuses submission with a `blocked` counterparty,
 * so the two contracts on blocked counterparties must not be past `draft`. The
 * repair swaps them with a `draft` or `cancelled` contract elsewhere rather
 * than re-dealing, so the spread stays exactly as §10 pins it — and
 * {@link assertSpread} proves it afterwards rather than trusting the swap.
 */
const dealStatuses = (): ContractStatus[] => {
  const bag: ContractStatus[] = [];
  for (const [status, count] of STATUS_SPREAD) for (let i = 0; i < count; i += 1) bag.push(status);
  const random = rng(0x5eed_08);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j] as ContractStatus, bag[i] as ContractStatus];
  }
  const isBlocked = (index: number) => PARTY_PLAN[(PAIRINGS[index] as Pairing).partyIndex]?.riskFlag === 'blocked';
  const preSubmission = (status: ContractStatus) => status === 'draft' || status === 'cancelled';
  for (let i = 0; i < bag.length; i += 1) {
    if (!isBlocked(i) || preSubmission(bag[i] as ContractStatus)) continue;
    const donor = bag.findIndex((status, j) => preSubmission(status) && !isBlocked(j));
    if (donor < 0) throw new Error('demo fixture: no pre-submission contract left to swap onto a blocked counterparty.');
    [bag[i], bag[donor]] = [bag[donor] as ContractStatus, bag[i] as ContractStatus];
  }

  // Second repair: `in_review` is only reachable by a contract whose TYPE asks
  // for legal review. `contract_state_machine` refuses `submitted → in_review`
  // twice over — "This contract type does not require legal review; a
  // submitted contract of this type goes straight to in_approval" and "Assign
  // a legal owner before the contract enters review" — and F2 never assigns a
  // `legal_owner` to a type that skips review. So a random deal that parks a
  // statement of work or an order form in `in_review` produces a row no
  // surface in this app could have made, AND a row F3's daily nudge selects
  // and can tell nobody about.
  //
  // That is not hypothetical: measured on the deal before this repair, 6 of
  // the 12 `in_review` contracts sat on the two types whose
  // `requiresLegalReview` is false, and those six ARE F3's "10 selected, 5
  // notified" reading (10 of the 12 fall in the over-30-day band; 5 of those
  // 10 were type-impossible and therefore ownerless). Property 1 at the top of
  // `plan.ts` — no row is in a state the write layer would have refused — is
  // what this repair enforces for the one edge the first two do not cover.
  //
  // Swapped, not re-dealt, so §10's spread survives and {@link assertSpread}
  // still proves it. The donor must be a legal-review type and must not be a
  // blocked counterparty, which is the first repair's invariant; the swap runs
  // BEFORE the formalities repair below so that repair still gets its pick.
  const reviewedAt = (index: number) =>
    CONTRACT_TYPE_PLAN[(PAIRINGS[index] as Pairing).typeIndex]?.requiresLegalReview === true;
  for (let i = 0; i < bag.length; i += 1) {
    if (bag[i] !== 'in_review' || reviewedAt(i)) continue;
    const donor = bag.findIndex((status, j) => status !== 'in_review' && reviewedAt(j) && !isBlocked(j));
    if (donor < 0) {
      throw new Error('demo fixture: no legal-review contract type left to hold an `in_review` status, which `contract_state_machine` refuses on every other type.');
    }
    [bag[i], bag[donor]] = [bag[donor] as ContractStatus, bag[i] as ContractStatus];
  }

  // Third repair: DESIGN.md §10 wants two signature rounds whose execution
  // formalities are not yet complete, and "not complete" is only a fact about
  // a contract whose TYPE asks for a formality at all. A random deal can leave
  // all six `signing` contracts on formality-free types (an NDA needs nothing
  // countersigned), so two of them are moved onto types that do — swapped, not
  // re-dealt, so the §10 spread survives and `assertSpread` still proves it.
  const formalitiesAt = (index: number) =>
    CONTRACT_TYPE_PLAN[(PAIRINGS[index] as Pairing).typeIndex]?.executionFormalities.length ?? 0;
  let withFormalities = bag.filter((status, i) => status === 'signing' && formalitiesAt(i) > 0).length;
  for (let i = 0; withFormalities < 2 && i < bag.length; i += 1) {
    if (bag[i] === 'signing' || formalitiesAt(i) === 0 || isBlocked(i)) continue;
    const donor = bag.findIndex((status, j) => status === 'signing' && formalitiesAt(j) === 0);
    if (donor < 0) break;
    [bag[i], bag[donor]] = [bag[donor] as ContractStatus, bag[i] as ContractStatus];
    withFormalities += 1;
  }
  if (withFormalities < 2) {
    throw new Error('demo fixture: fewer than two `signing` contracts carry execution formalities, so the two incomplete-formality signature rounds of DESIGN.md §10 cannot be produced.');
  }
  return bag;
};

const assertSpread = (statuses: readonly ContractStatus[]): void => {
  for (const [status, expected] of STATUS_SPREAD) {
    const actual = statuses.filter((s) => s === status).length;
    if (actual !== expected) {
      throw new Error(`demo fixture: ${actual} contracts in '${status}', DESIGN.md §10 pins ${expected}.`);
    }
  }
};

/**
 * The two per-row invariants the three repairs exist to hold, proven after all
 * of them have run rather than trusted from the order they run in.
 *
 * Each repair swaps a pair, and a swap moves TWO rows — so a later repair can
 * in principle undo an earlier one's work. Counting statuses would not notice:
 * the spread is preserved by construction under any swap.
 */
const assertDealtStates = (statuses: readonly ContractStatus[]): void => {
  for (let i = 0; i < statuses.length; i += 1) {
    const pairing = PAIRINGS[i] as Pairing;
    const status = statuses[i] as ContractStatus;
    if (PARTY_PLAN[pairing.partyIndex]?.riskFlag === 'blocked' && status !== 'draft' && status !== 'cancelled') {
      throw new Error(`demo fixture: contract ${i} is on a blocked counterparty in '${status}'; contract_state_machine refuses to submit one at all.`);
    }
    if (status === 'in_review' && CONTRACT_TYPE_PLAN[pairing.typeIndex]?.requiresLegalReview !== true) {
      throw new Error(`demo fixture: contract ${i} is 'in_review' on a contract type that does not require legal review; contract_state_machine refuses that edge.`);
    }
  }
};

const STATUSES = dealStatuses();
assertSpread(STATUSES);
assertDealtStates(STATUSES);

const EXECUTED: readonly ContractStatus[] = ['active', 'expired', 'terminated'];
const isExecuted = (status: ContractStatus) => EXECUTED.includes(status);

/**
 * The first 24 executed contracts carry a negotiation history; the other 48
 * are the backfilled corpus. 24 is not arbitrary: DESIGN.md §10 pins
 * `clm_signature` at 30 rows, six of which belong to the six contracts still
 * in `signing`, which leaves exactly 24 completed signature rounds — and a
 * contract that reached `active` without one is, by the §03 guard's own
 * definition, a contract that did not get there through the signing gate.
 */
const NEGOTIATED_EXECUTED = 24;

// ──────────────────────────────────────────────────────────── the timeline ──

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const EMPTY_TIMELINE: Timeline = {
  submittedAt: null, reviewStartedAt: null, approvedAt: null, signedAt: null,
  executedAt: null, activatedAt: null, closedAt: null, startDate: null, endDate: null,
};

const timelineFor = (
  status: ContractStatus,
  backfilled: boolean,
  expiringSoon: boolean,
  requiresLegalReview: boolean,
  termMonths: number,
  r: () => number,
): Timeline => {
  const termDays = termMonths * 30;
  if (isExecuted(status)) {
    let endDate: number;
    if (expiringSoon) endDate = 3 + Math.floor(r() * 26);
    else if (status === 'expired') endDate = -(8 + Math.floor(r() * 80));
    else if (backfilled) endDate = 45 + Math.floor(r() * clamp(termDays - 75, 60, 800));
    else endDate = -(30 + Math.floor(r() * 140)) + termDays;
    const startDate = endDate - termDays;
    const signedAt = startDate - 3;
    const stamps = backfilled
      ? { submittedAt: null, reviewStartedAt: null, approvedAt: null }
      : {
          approvedAt: signedAt - 8,
          reviewStartedAt: requiresLegalReview ? signedAt - 33 : null,
          submittedAt: signedAt - 35,
        };
    return {
      ...stamps,
      signedAt,
      executedAt: signedAt,
      activatedAt: startDate,
      closedAt: status === 'terminated' ? -(10 + Math.floor(r() * 50)) : null,
      startDate,
      endDate,
    };
  }

  switch (status) {
    case 'draft':
      return EMPTY_TIMELINE;
    case 'submitted':
      return { ...EMPTY_TIMELINE, submittedAt: -(2 + Math.floor(r() * 7)) };
    case 'in_review': {
      const submittedAt = -(10 + Math.floor(r() * 50));
      return { ...EMPTY_TIMELINE, submittedAt, reviewStartedAt: submittedAt + 2 };
    }
    case 'in_approval': {
      const submittedAt = -(25 + Math.floor(r() * 45));
      return { ...EMPTY_TIMELINE, submittedAt, reviewStartedAt: requiresLegalReview ? submittedAt + 2 : null };
    }
    case 'approved': {
      const submittedAt = -(45 + Math.floor(r() * 50));
      return {
        ...EMPTY_TIMELINE,
        submittedAt,
        reviewStartedAt: requiresLegalReview ? submittedAt + 2 : null,
        approvedAt: -(4 + Math.floor(r() * 18)),
      };
    }
    case 'signing': {
      const submittedAt = -(60 + Math.floor(r() * 60));
      return {
        ...EMPTY_TIMELINE,
        submittedAt,
        reviewStartedAt: requiresLegalReview ? submittedAt + 2 : null,
        approvedAt: -(14 + Math.floor(r() * 20)),
      };
    }
    case 'cancelled':
    default:
      // Withdrawn before it ever went out, which is the only shape available
      // to a contract on a blocked counterparty.
      return EMPTY_TIMELINE;
  }
};

// ───────────────────────────────────── deviations, planned before routing ──

export interface DeviationPlan {
  readonly contractIndex: number;
  readonly clauseIndex: number;
  readonly status: 'open' | 'accepted' | 'rejected' | 'withdrawn';
  readonly requestedPosition: 'standard' | 'fallback' | 'custom';
  readonly textIndex: number;
  readonly justificationIndex: number;
  /** Day offset of the decision; `null` while the deviation is open. */
  readonly decidedAt: number | null;
}

/**
 * 25 deviations, 8 of them still open (DESIGN.md §10).
 *
 * The eight open ones sit on contracts in `in_review` and nowhere else, and
 * that is a guard, not a preference: `deviation_gate` (F6) refuses the edge
 * into `in_approval` while any deviation is open, so an open deviation on an
 * `in_approval` contract would be a state the write layer would never have
 * produced. Seeding is exempt from the gate; the plan applies it anyway.
 */
const planDeviations = (statuses: readonly ContractStatus[]): DeviationPlan[] => {
  const random = rng(0x5eed_25);
  const inReview = statuses.map((s, i) => (s === 'in_review' ? i : -1)).filter((i) => i >= 0);
  const decided = statuses
    .map((s, i) => (s === 'in_approval' || s === 'approved' || s === 'signing' ? i : -1))
    .filter((i) => i >= 0);
  const plans: DeviationPlan[] = [];

  // Eight open deviations, one per in_review contract, drawn from clauses the
  // playbook marks high risk so the escalation is worth demonstrating.
  for (let n = 0; n < 8; n += 1) {
    const contractIndex = inReview[n] as number;
    plans.push({
      contractIndex,
      clauseIndex: [0, 2, 3, 7, 11, 16, 17, 24][n] as number,
      status: 'open',
      requestedPosition: n % 2 === 0 ? 'fallback' : 'custom',
      textIndex: n % 8,
      justificationIndex: n % 6,
      decidedAt: null,
    });
  }

  // Seventeen decided ones on contracts that have already left review.
  const OUTCOMES: DeviationPlan['status'][] = [
    'accepted', 'accepted', 'rejected', 'accepted', 'accepted', 'withdrawn', 'accepted',
    'rejected', 'accepted', 'accepted', 'rejected', 'accepted', 'withdrawn', 'accepted',
    'rejected', 'accepted', 'accepted',
  ];
  for (let n = 0; n < OUTCOMES.length; n += 1) {
    const contractIndex = decided[n % decided.length] as number;
    plans.push({
      contractIndex,
      // Two deviations on one contract must name different clauses: the
      // dataset's natural key is (contract, clause).
      clauseIndex: [1, 5, 8, 9, 12, 15, 20, 21, 23, 25, 26, 28, 29, 4, 6, 10, 13][n] as number,
      status: OUTCOMES[n] as DeviationPlan['status'],
      requestedPosition: n % 3 === 0 ? 'fallback' : n % 3 === 1 ? 'custom' : 'standard',
      textIndex: n % 8,
      justificationIndex: n % 6,
      decidedAt: -(3 + Math.floor(random() * 40)),
    });
  }
  assertCount('clm_deviation', plans.length, 25);
  return plans;
};

export const DEVIATION_PLAN: readonly DeviationPlan[] = planDeviations(STATUSES);

const acceptedClausesFor = (contractIndex: number): ClausePlan[] =>
  DEVIATION_PLAN.filter((d) => d.contractIndex === contractIndex && d.status === 'accepted')
    .map((d) => CLAUSE_PLAN[d.clauseIndex] as ClausePlan);

// ────────────────────────────────────────────────────── the contracts (120) ──

const buildContracts = (): ContractPlan[] => {
  const random = rng(0x5eed_c0);
  const contracts: ContractPlan[] = [];
  let executedRank = 0;
  // The ten contracts DESIGN.md §10 wants ending inside the next 30 days are
  // drawn from the backfilled corpus: a historical agreement coming up for
  // renewal is what a renewal pipeline is actually made of.
  let expiringLeft = 10;

  for (let index = 0; index < PAIRINGS.length; index += 1) {
    const pairing = PAIRINGS[index] as Pairing;
    const status = STATUSES[index] as ContractStatus;
    const type = CONTRACT_TYPE_PLAN[pairing.typeIndex]!;
    const executed = isExecuted(status);
    const backfilled = executed && executedRank++ >= NEGOTIATED_EXECUTED;
    const expiringSoon = status === 'active' && backfilled && expiringLeft > 0 && (expiringLeft -= 1) >= 0;

    const termMonths = type.defaultTermMonths + (random() < 0.3 ? 12 : 0);
    const amount = type.amountBand
      ? Math.round((type.amountBand[0] + random() * (type.amountBand[1] - type.amountBand[0])) / 500) * 500
      : null;

    // A second contract of the same type with the same counterparty needs a
    // qualifier: the natural key is the title, and two rows sharing one key
    // would silently overwrite each other on replay.
    const earlier = contracts.filter(
      (c) => c.typeIndex === pairing.typeIndex && c.partyIndex === pairing.partyIndex,
    ).length;
    const parentIndex =
      pairing.parentTypeIndex === undefined
        ? null
        : (contracts.find((c) => c.typeIndex === pairing.parentTypeIndex && c.partyIndex === pairing.partyIndex)?.index ?? null);

    const pastSubmission = status !== 'draft' && status !== 'cancelled';
    const assessed = pastSubmission && status !== 'submitted';
    const route: RouteFlags = backfilled || !pastSubmission
      ? { route_legal_head: false, route_finance: false, route_executive: false, route_gm: false }
      : routeFlagsFor(amount, acceptedClausesFor(index));

    const negotiating = status === 'in_review' && index % 3 === 0;
    contracts.push({
      index,
      typeIndex: pairing.typeIndex,
      partyIndex: pairing.partyIndex,
      qualifierIndex: earlier > 0 ? earlier - 1 : null,
      status,
      backfilled,
      parentIndex,
      amount,
      isAmountEstimated: type.category === 'framework',
      liabilityCap: amount === null ? null : Math.round(amount * (random() < 0.5 ? 1 : 2)),
      termMonths,
      autoRenew: type.intakeFields.includes('auto_renew') ? random() < 0.5 : false,
      renewalNoticeDays: executed || status === 'signing' ? [30, 60, 90][Math.floor(random() * 3)] as number : null,
      paymentTerms: type.intakeFields.includes('payment_terms')
        ? (['net_30', 'net_30', 'net_60', 'net_90', 'due_on_receipt'][Math.floor(random() * 5)] as ContractPlan['paymentTerms'])
        : null,
      confidentialityTermMonths: type.intakeFields.includes('confidentiality_term_months')
        ? ([24, 36, 60][Math.floor(random() * 3)] as number)
        : null,
      riskLevel: assessed ? (['low', 'medium', 'high', 'medium', 'low'][Math.floor(random() * 5)] as 'low' | 'medium' | 'high') : null,
      currentTurn: negotiating ? 'counterparty' : status === 'in_review' ? 'internal' : 'none',
      turnSince: negotiating ? -(9 + Math.floor(random() * 25)) : status === 'in_review' ? -(1 + Math.floor(random() * 5)) : null,
      // F2's own condition, mirrored: a legal owner exists exactly where
      // `contract_route` would have assigned one — the type asks for legal
      // review, the contract is past submission, and it is not still sitting
      // in the 待受理 queue (§05: "submitted 且未分配"). {@link handBackInReview}
      // then takes it away again from a deliberate few.
      hasLegalOwner: pastSubmission && type.requiresLegalReview && status !== 'submitted',
      route,
      timeline: timelineFor(status, backfilled, expiringSoon, type.requiresLegalReview, termMonths, random),
      // The mirror of the F5 decision node. Backfilled contracts skipped the
      // ladder entirely (F16), so theirs stays at the platform default.
      approvalStatus: backfilled
        ? 'not_required'
        : status === 'in_approval'
          ? 'pending'
          : ['approved', 'signing', 'active', 'expired', 'terminated'].includes(status)
            ? 'approved'
            : 'not_required',
      expiringSoon,
    });
  }
  assertCount('clm_contract', contracts.length, 120);
  return contracts;
};

/**
 * How many contracts in review are deliberately left with NO `legal_owner`.
 *
 * ## ⛔ This is test coverage. Do not "tidy it up" by giving them an owner.
 *
 * The six scheduled jobs of DESIGN.md §06 all end in a PARTITIONED decision:
 * `_daily-sweep.ts` sends the notification when someone can receive it and
 * takes a "Nobody to tell" edge when nobody can, so the run stays green rather
 * than failing a row over an unassignable notification. Card 09 (#39 / PR #42)
 * measured that edge working, and it is the only thing between one unassigned
 * row and a sweep that reports `acted: 0` for every row after it —
 * `loop-node.ts` iterates with a bare `await`, so the first failing row ends
 * the whole run.
 *
 * F3 (`legal_review_sla`), over-30 stage, is the ONLY place this corpus can
 * exercise that edge, and both halves of that sentence are load-bearing:
 *
 *  - F4 and F11 address `owner_id`, F12 and F13 address `owner_id` with the
 *    legal owner merely copied, and every contract carries an `owner_id`
 *    ({@link ../keys.ts}) — so none of them can ever go quiet.
 *  - F3's over-SIXTY stage copies `clm_legal_head`, so a row that has been in
 *    review past 60 days still has somebody to tell and takes the notify edge.
 *    Only the over-30 stage has `legal_owner` as its sole recipient.
 *
 * ⇒ Fill every `in_review` contract's legal owner and that edge is never taken
 * again by any job on this corpus; a regression in it would ship invisibly.
 *
 * ## Why ONE, and why one is also the MOST
 *
 * One row is what coverage costs. Every row beyond it is a reminder the demo
 * does not send — the exact defect this fixture change exists to fix — so the
 * set is deliberately the minimum that keeps the edge live, not a sprinkle.
 * Raising this constant is a one-line change and {@link handBackInReview}
 * re-proves reachability for whatever number it is given.
 *
 * ## Why these rows are legal and the ones this replaced were not
 *
 * `contract_state_machine` guards the TRANSITION into review ("Assign a legal
 * owner before the contract enters review"); nothing holds the column set
 * afterwards, and `legal_owner` is in the `parties` group, so it is not one of
 * the fields `_grants.ts` locks read-only — a lawyer handing a file back to the
 * queue clears it through the ordinary edit form. So an `in_review` contract
 * with no legal owner is a state this app reaches. An `in_review` contract on a
 * type that skips legal review is NOT, and the second repair in
 * {@link dealStatuses} is what stopped the fixture producing six of those.
 */
export const UNASSIGNED_IN_REVIEW = 1;

/**
 * Hand {@link UNASSIGNED_IN_REVIEW} contracts back to the queue — and prove
 * that F3's over-30 stage, and only that stage, will select them.
 *
 * The eligible band is `(-60, -30]` days: past F3's 30-day threshold so the
 * over-30 stage selects the row, and inside 60 so it is not selected by the
 * over-60 stage instead, whose `also: {legalHeads.userIds}` would give the
 * notification a recipient and take the notify edge. Longest review first,
 * because a file nobody has owned for eight weeks is the case the nudge is for.
 */
const handBackInReview = (contracts: readonly ContractPlan[]): ContractPlan[] => {
  const eligible = contracts
    .filter((contract) =>
      contract.status === 'in_review' &&
      contract.hasLegalOwner &&
      (contract.timeline.reviewStartedAt ?? 0) <= -30 &&
      (contract.timeline.reviewStartedAt ?? 0) > -60)
    .sort((a, b) => (a.timeline.reviewStartedAt ?? 0) - (b.timeline.reviewStartedAt ?? 0));
  if (eligible.length < UNASSIGNED_IN_REVIEW) {
    throw new Error(`demo fixture: ${eligible.length} contracts are in review between 30 and 60 days with a legal owner, so ${UNASSIGNED_IN_REVIEW} cannot be handed back — F3's over-30 stage would select none of them and its "nobody to tell" edge would stop being exercised.`);
  }
  const indexes = new Set(eligible.slice(0, UNASSIGNED_IN_REVIEW).map((contract) => contract.index));
  return contracts.map((contract) =>
    indexes.has(contract.index) ? { ...contract, hasLegalOwner: false } : contract);
};

export const CONTRACT_PLAN: readonly ContractPlan[] = handBackInReview(buildContracts());

/** The counterparty a contract is with. */
export const partyOf = (contract: ContractPlan) => PARTY_PLAN[contract.partyIndex]!;
/** The type a contract runs under. */
export const typeOf = (contract: ContractPlan) => CONTRACT_TYPE_PLAN[contract.typeIndex]!;
/** The jurisdiction a contract is governed by. */
export const lawOf = (contract: ContractPlan) => jurisdictionOf(contract.partyIndex);

export { APPROVAL_RULE_PLAN, CLAUSE_PLAN, CONTRACT_TYPE_PLAN, PARTY_PLAN };
