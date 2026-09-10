// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { assertCount, rng } from './_shared.js';
import { CONTRACT_PLAN, typeOf, type ContractPlan, type ContractStatus } from './plan-contracts.js';

/**
 * The child families of DESIGN.md §10 — reviews, signature rounds, obligations
 * and payment instalments — planned as structure, without a string in sight.
 *
 * Every count and every sub-count in the §10 table is produced by a ROLE BAG:
 * a flat array holding exactly as many roles as the table asks for, dealt
 * deterministically across the eligible parents. The alternative — deriving a
 * status from a date and hoping the totals land — produces a fixture whose
 * "40 obligations due in the next 30 days" is 37 on one machine and 42 on
 * another. Here the ten overdue obligations are ten because ten roles were
 * put in the bag, and {@link assertCount} proves the bag emptied.
 *
 * `clm_contract_version` has NO plan here, and its absence is the one count in
 * §10 this card does not deliver. `clm_contract_version.file` is
 * `required: true` (DESIGN.md §03) and a `file` value is an opaque `sys_file`
 * id minted by an upload; a declarative seed cannot mint one. Measured: a
 * version row with `file` omitted is refused ("File is required"), a row whose
 * `file` is a URL is accepted but makes the platform refuse to attest its own
 * `adr-0104-file-references` migration, and a row whose `file` is an
 * id-shaped token is accepted silently and points at nothing. The third is the
 * one a seed could get away with, and it is the one AGENTS.md forbids — "a
 * capability the runtime does not deliver is hidden, not faked". So no
 * versions are seeded, `version_count` reads an honest 0, and the PR raises it
 * as a decision rather than papering over it.
 */

const isExecuted = (status: ContractStatus) => status === 'active' || status === 'expired' || status === 'terminated';

/** Deal a fixed multiset of roles into a deterministic order. */
const dealRoles = <T>(bag: readonly T[], seed: number): T[] => {
  const roles = [...bag];
  const random = rng(seed);
  for (let i = roles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [roles[i], roles[j]] = [roles[j] as T, roles[i] as T];
  }
  return roles;
};

const repeat = <T>(role: T, times: number): T[] => Array.from({ length: times }, () => role);

// ───────────────────────────────────────────────────────── clm_review (60) ──

export interface ReviewPlan {
  readonly contractIndex: number;
  readonly stage: 'legal' | 'finance' | 'compliance' | 'business';
  readonly decision: 'pending' | 'approved' | 'changes_requested' | 'rejected';
  readonly startedAt: number;
  readonly decidedAt: number | null;
  readonly commentIndex: number;
  /** Only a legal review carries an internal note; §04 hides it from the requester. */
  readonly internalNoteIndex: number | null;
  readonly riskLevelAssessed: 'low' | 'medium' | 'high' | null;
}

const planReviews = (): ReviewPlan[] => {
  const random = rng(0x5eed_3c);
  // Eligible: anything that reached review or beyond and still has a
  // negotiation history behind it. The backfilled corpus is excluded by
  // definition — it never went through review, which is what makes it a
  // backfill.
  const eligible = CONTRACT_PLAN.filter(
    (c) =>
      (['in_review', 'in_approval', 'approved', 'signing'] as ContractStatus[]).includes(c.status) ||
      (isExecuted(c.status) && !c.backfilled),
  );

  // Each contract offers its stages in priority order; the passes below take
  // one stage from every contract before any contract gets a second, so 60
  // reviews spread across the book instead of piling onto the first few.
  const stagesFor = (c: ContractPlan): ReviewPlan['stage'][] => {
    const stages: ReviewPlan['stage'][] = [];
    // A type that needs no legal review reached `in_approval` straight from
    // `submitted` (F2), so it has no legal review to show.
    if (typeOf(c).requiresLegalReview) stages.push('legal');
    if (c.route.route_finance) stages.push('finance');
    if (c.riskLevel === 'high') stages.push('compliance');
    stages.push('business');
    return stages;
  };

  const plans: ReviewPlan[] = [];
  for (let pass = 0; pass < 4 && plans.length < 60; pass += 1) {
    for (const contract of eligible) {
      if (plans.length >= 60) break;
      const stage = stagesFor(contract)[pass];
      if (stage === undefined) continue;
      const startedAt = contract.timeline.reviewStartedAt ?? contract.timeline.submittedAt ?? -5;
      // A contract still IN review has an open review; one that has left it
      // carries the approval that let it leave (the §03 guard on that edge).
      const open = contract.status === 'in_review' && pass === 0 && contract.index % 4 !== 0;
      const decision: ReviewPlan['decision'] = open
        ? contract.index % 8 === 3 ? 'changes_requested' : 'pending'
        : 'approved';
      plans.push({
        contractIndex: contract.index,
        stage,
        decision,
        startedAt,
        decidedAt: decision === 'pending' ? null : startedAt + 2 + Math.floor(random() * 5),
        commentIndex: (contract.index + pass) % 8,
        internalNoteIndex: stage === 'legal' ? (contract.index + pass) % 6 : null,
        riskLevelAssessed: stage === 'legal' ? contract.riskLevel : null,
      });
    }
  }
  assertCount('clm_review', plans.length, 60);
  return plans;
};

export const REVIEW_PLAN: readonly ReviewPlan[] = planReviews();

// ────────────────────────────────────────────────────── clm_signature (30) ──

export interface SignaturePlan {
  readonly contractIndex: number;
  readonly method: 'esign' | 'wet_ink';
  readonly provider: 'docusign' | 'adobe_sign' | 'dropbox_sign' | null;
  readonly status: 'sent' | 'completed';
  /** A subset of the type's `execution_formalities`; a completed round covers them all. */
  readonly formalitiesDone: readonly string[];
  readonly completedAt: number | null;
  readonly noteIndex: number;
  readonly signerCount: 2 | 3;
}

/**
 * 30 signature rounds: six `sent`, of which two carry an incomplete set of
 * execution formalities (DESIGN.md §10).
 *
 * Both sub-counts land on the six contracts in `signing`, and that placement
 * is forced rather than chosen. A `sent` envelope on an `active` contract
 * would contradict the §03 guard that lets a contract into `active` only on a
 * COMPLETED round; a completed round with formalities outstanding on an
 * `active` contract would contradict the same guard's second half, which
 * requires `formalities_done` to cover the type's `execution_formalities`. The
 * only status where either is a legal state is `signing` — which is also
 * precisely what §05's "待执行" list is for.
 *
 * The two incomplete rounds are wet-ink: our counterpart is sealed and out,
 * and the countersigned copy has not come back. The remaining 24 rounds are
 * completed with full coverage, one per negotiated executed contract.
 */
const planSignatures = (): SignaturePlan[] => {
  const random = rng(0x5eed_1e);
  const signing = CONTRACT_PLAN.filter((c) => c.status === 'signing');
  const withFormalities = signing
    .filter((c) => typeOf(c).executionFormalities.length > 0)
    .slice(0, 2)
    .map((c) => c.index);

  const plans: SignaturePlan[] = signing.map((contract) => {
    const formalities = typeOf(contract).executionFormalities;
    const incomplete = withFormalities.includes(contract.index);
    return {
      contractIndex: contract.index,
      method: incomplete ? 'wet_ink' : 'esign',
      provider: incomplete ? null : (['docusign', 'adobe_sign', 'dropbox_sign'][contract.index % 3] as SignaturePlan['provider']),
      status: 'sent',
      // Everything the type asks for EXCEPT the last one — the outstanding
      // formality the "待执行" list exists to surface.
      formalitiesDone: incomplete ? formalities.slice(0, -1) : [],
      completedAt: null,
      noteIndex: incomplete ? 3 : 0,
      signerCount: 2,
    };
  });

  for (const contract of CONTRACT_PLAN.filter((c) => isExecuted(c.status) && !c.backfilled)) {
    plans.push({
      contractIndex: contract.index,
      method: typeOf(contract).signMethod === 'wet_ink' ? 'wet_ink' : 'esign',
      provider: typeOf(contract).signMethod === 'wet_ink' ? null : (['docusign', 'adobe_sign', 'dropbox_sign'][contract.index % 3] as SignaturePlan['provider']),
      status: 'completed',
      formalitiesDone: typeOf(contract).executionFormalities,
      completedAt: contract.timeline.signedAt,
      noteIndex: typeOf(contract).signMethod === 'wet_ink' ? 2 : 1,
      signerCount: random() < 0.3 ? 3 : 2,
    });
  }
  assertCount('clm_signature', plans.length, 30);
  return plans;
};

export const SIGNATURE_PLAN: readonly SignaturePlan[] = planSignatures();

// ──────────────────────────────────────────────────── clm_obligation (200) ──

export interface ObligationPlan {
  readonly contractIndex: number;
  readonly kind: 'deliverable' | 'payment' | 'report' | 'renewal' | 'compliance' | 'other';
  readonly titleIndex: number;
  readonly dueDate: number;
  readonly status: 'pending' | 'in_progress' | 'done' | 'overdue' | 'waived';
  readonly completedAt: number | null;
  /**
   * Whether `owner` names an account at all. False on exactly
   * {@link UNASSIGNED_OBLIGATIONS} rows — see {@link leaveUnassigned}; the
   * name itself is `keys.ts`'s {@link ../keys.ts obligationOwnerOf}.
   */
  readonly hasOwner: boolean;
}

type ObligationRole = 'overdue' | 'due_soon_pending' | 'due_soon_progress' | 'done' | 'future' | 'waived';

/**
 * 200 obligations: 40 falling due in the next 30 days and 10 already in
 * arrears (DESIGN.md §10).
 *
 * An `overdue` row always has a due date in the PAST. Both child machines
 * reserve `overdue` for the daily job of card 09 and refuse it from anyone
 * else — with an explicit `ctx.session?.isSystem !== true` exemption the seed
 * write satisfies. Being allowed to write it is not permission to write it
 * anywhere: the job measures arrears from `due_date`, so a seeded `overdue`
 * with a future due date would be a value the job would immediately contradict.
 */
const planObligations = (): ObligationPlan[] => {
  const random = rng(0x5eed_c8);
  const parents = CONTRACT_PLAN.filter((c) => isExecuted(c.status));
  const roles = dealRoles<ObligationRole>(
    [
      ...repeat<ObligationRole>('overdue', 10),
      ...repeat<ObligationRole>('due_soon_pending', 30),
      ...repeat<ObligationRole>('due_soon_progress', 10),
      ...repeat<ObligationRole>('done', 90),
      ...repeat<ObligationRole>('future', 45),
      ...repeat<ObligationRole>('waived', 15),
    ],
    0x5eed_c9,
  );
  assertCount('clm_obligation (roles)', roles.length, 200);

  // One kind per round-robin round, so the two or three obligations a contract
  // receives draw from DIFFERENT title pools and cannot collide on the
  // (contract, title) natural key.
  const KINDS: ObligationPlan['kind'][] = ['deliverable', 'report', 'compliance', 'renewal', 'payment', 'other'];

  const plans: ObligationPlan[] = roles.map((role, slot) => {
    const contract = parents[slot % parents.length]!;
    const round = Math.floor(slot / parents.length);
    const kind = KINDS[round % KINDS.length]!;
    // `hasOwner` is true for every row here; `leaveUnassigned` takes it away
    // from exactly one afterwards, so the deal below reads as the RULE and the
    // exception is stated once, where its reachability is proved.
    switch (role) {
      case 'overdue':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: -(2 + Math.floor(random() * 38)), status: 'overdue', completedAt: null, hasOwner: true };
      case 'due_soon_pending':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 1 + Math.floor(random() * 29), status: 'pending', completedAt: null, hasOwner: true };
      case 'due_soon_progress':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 1 + Math.floor(random() * 29), status: 'in_progress', completedAt: null, hasOwner: true };
      case 'done': {
        const dueDate = -(20 + Math.floor(random() * 280));
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate, status: 'done', completedAt: dueDate - 1 - Math.floor(random() * 4), hasOwner: true };
      }
      case 'waived':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: -(10 + Math.floor(random() * 190)), status: 'waived', completedAt: null, hasOwner: true };
      case 'future':
      default:
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 35 + Math.floor(random() * 460), status: 'pending', completedAt: null, hasOwner: true };
    }
  });
  assertCount('clm_obligation', plans.length, 200);
  return plans;
};

/**
 * How many obligations are deliberately left with NO `owner`.
 *
 * ## ⛔ This is test coverage. Do not "tidy it up" by giving it an owner.
 *
 * The same edge `UNASSIGNED_IN_REVIEW` protects in `plan-contracts.ts`, on the
 * other of the only two jobs that can reach it. `_daily-sweep.ts` partitions
 * every notifying row: `clm_notify_recipients` reports `hasRecipient`, and the
 * two out-edges (`HAS_RECIPIENT` / `NO_RECIPIENT`) are exact complements, so a
 * row nobody can be told about takes the quiet edge instead of failing the
 * step. That matters more than it sounds: `loop-node.ts` iterates with a bare
 * `await` and no `try`/`catch` of its own, so one failing row would end the
 * whole sweep and report `acted: 0` for every row after it.
 *
 * F10 is one of exactly two places this corpus can exercise that edge, and it
 * is the only one on `clm_obligation`:
 *
 *  - all three of F10's stages take `{obligation.owner}` as their SOLE
 *    recipient — no position is copied in, the way F3's over-60 stage copies
 *    `clm_legal_head` — so an unowned obligation has nobody to tell in any of
 *    them;
 *  - and `owner` is the one recipient column in the fixture the model itself
 *    licenses to be empty: DESIGN.md §03 declines to default it to the
 *    contract owner, and `_daily-sweep.ts` names that permission explicitly
 *    when it explains why `hasRecipient` exists at all.
 *
 * ⇒ Give all 200 an owner and F10's quiet edge is never taken again on this
 * corpus; a regression in it would ship invisibly.
 *
 * ## Why ONE, and why one is also the MOST
 *
 * One row is what coverage costs. Every row beyond it is a reminder the demo
 * does not send — the exact defect this deal exists to fix — so the set is the
 * minimum that keeps the edge live, not a sprinkle. Raising this constant is a
 * one-line change and {@link leaveUnassigned} re-proves reachability for
 * whatever number it is given.
 */
export const UNASSIGNED_OBLIGATIONS = 1;

/**
 * The day offset the unassigned row is due on: F10's `week` stage selects
 * `due_date` in the half-open `[T+7, T+8)` window.
 */
const F10_WEEK_DAY = 7;

/**
 * Leave {@link UNASSIGNED_OBLIGATIONS} obligations unowned — and prove F10
 * will actually select them, which is the whole difference between coverage
 * and a hole with a comment over it.
 *
 * ## Why the row's due date is CONSTRUCTED rather than drawn
 *
 * Measured on `main` @ `2d63324`, one `obligation_due` run on a
 * freshly seeded database: `week_select selected=2`, `today_select selected=0`,
 * `arrears_select selected=0`. The two zeroes are structural, not a bad day —
 * every stage filters `status IN (pending, in_progress)`, and this plan draws
 * every such row's due date from `1 + rng*29` or `35 + rng*460`, so no open
 * obligation is ever due today (the minimum is +1) or already past due (the
 * seeded arrears are born `overdue`, which no stage selects). The `week` stage
 * is therefore the ONLY one that can carry this edge on this corpus, and how
 * many rows land in its one-day window is a draw.
 *
 * So the row is placed at exactly {@link F10_WEEK_DAY} instead of being hoped
 * into the window. It is drawn from the `due_soon_pending` band — `pending`,
 * due in `[1, 29]` — so moving it inside that band leaves DESIGN.md §10's "40
 * due in the next 30 days" exactly where it was; taking a `future` row (+35 and
 * out) would have quietly made it 41.
 *
 * `deliverable` is preferred for the story rather than the mechanics: an
 * extracted commitment nobody has been made accountable for yet is precisely
 * the state §07's S5 leaves behind between "AI proposes a 负责人" and "a person
 * confirms". Any kind would exercise the edge; this one also explains itself
 * on screen.
 *
 * ⚠️ The proof is good on the BOOT DAY, which is what `dayOffset` means: every
 * date in this fixture is boot-relative, so a database seeded today and swept
 * tomorrow has the row at +6 and out of the window. Re-running `pnpm demo`
 * slides it back to +7, which is the same property the whole demo has.
 */
const leaveUnassigned = (plans: readonly ObligationPlan[]): ObligationPlan[] => {
  const dueSoonPending = plans
    .map((plan, slot) => ({ plan, slot }))
    .filter(({ plan }) => plan.status === 'pending' && plan.dueDate >= 1 && plan.dueDate <= 29);
  const eligible = [
    ...dueSoonPending.filter(({ plan }) => plan.kind === 'deliverable'),
    ...dueSoonPending.filter(({ plan }) => plan.kind !== 'deliverable'),
  ];
  if (eligible.length < UNASSIGNED_OBLIGATIONS) {
    throw new Error(
      `demo fixture: only ${eligible.length} obligations are pending and due inside the next 30 days, ` +
        `so ${UNASSIGNED_OBLIGATIONS} cannot be left unassigned inside that band — moving one in from ` +
        'anywhere else would change DESIGN.md §10\'s "40 due in the next 30 days", and leaving none ' +
        'unassigned would stop F10\'s "nobody to tell" edge being exercised anywhere in this corpus.',
    );
  }
  const slots = new Set(eligible.slice(0, UNASSIGNED_OBLIGATIONS).map(({ slot }) => slot));
  const dealt = plans.map((plan, slot) =>
    slots.has(slot) ? { ...plan, hasOwner: false, dueDate: F10_WEEK_DAY } : plan);

  // Re-proved AFTER the rewrite rather than assumed from it: the row has to be
  // selectable by F10's `week` stage, which reads BOTH columns.
  const quiet = dealt.filter((plan) => !plan.hasOwner);
  assertCount('clm_obligation (unassigned)', quiet.length, UNASSIGNED_OBLIGATIONS);
  for (const plan of quiet) {
    if (plan.dueDate !== F10_WEEK_DAY || (plan.status !== 'pending' && plan.status !== 'in_progress')) {
      throw new Error(
        `demo fixture: the unassigned obligation is ${plan.status} and due at day ${plan.dueDate}, so F10's ` +
          `week stage (status IN (pending, in_progress) AND due_date IN [T+${F10_WEEK_DAY}, T+${F10_WEEK_DAY + 1})) ` +
          'would not select it and its "nobody to tell" edge would stop being exercised.',
      );
    }
  }
  return dealt;
};

export const OBLIGATION_PLAN: readonly ObligationPlan[] = leaveUnassigned(planObligations());

// ─────────────────────────────────────────────────── clm_payment_plan (300) ──

export interface PaymentPlan {
  readonly contractIndex: number;
  readonly seq: number;
  readonly plannedDate: number;
  readonly plannedAmount: number;
  readonly status: 'planned' | 'due' | 'partial' | 'paid' | 'overdue';
  readonly actualDate: number | null;
  readonly actualAmount: number | null;
  readonly conditionIndex: number;
  readonly invoiceNo: string | null;
}

type PaymentRole = 'paid' | 'partial' | 'overdue' | 'due' | 'planned';

/**
 * 300 instalments: 30 falling due inside the next 30 days and 12 in arrears
 * (DESIGN.md §10).
 *
 * The schedule of each contract sums to that contract's `amount`, which is
 * what makes the `planned_amount` roll-up worth reading: it and `amount` are
 * two independent numbers that should agree, and a demo where they do is a
 * demo where the roll-up can be checked rather than believed. `actual_amount`
 * is only ever written on a `paid` or `partial` instalment, so the second
 * roll-up reads what has actually arrived.
 */
const planPayments = (): PaymentPlan[] => {
  const random = rng(0x5eed_12c);
  const parents = CONTRACT_PLAN.filter(
    (c) => (isExecuted(c.status) || c.status === 'signing') && typeOf(c).hasPaymentSchedule && c.amount !== null,
  );
  if (parents.length === 0) throw new Error('demo fixture: no contract can carry a payment schedule.');

  const roles = dealRoles<PaymentRole>(
    [
      ...repeat<PaymentRole>('overdue', 12),
      ...repeat<PaymentRole>('due', 30),
      ...repeat<PaymentRole>('paid', 90),
      ...repeat<PaymentRole>('partial', 18),
      ...repeat<PaymentRole>('planned', 150),
    ],
    0x5eed_12d,
  );
  assertCount('clm_payment_plan (roles)', roles.length, 300);

  // Instalments per contract: as even as 300 divides, remainder on the first
  // few. Computed rather than chosen so the total is exactly the §10 number
  // however the eligible set moves.
  const base = Math.floor(roles.length / parents.length);
  const remainder = roles.length - base * parents.length;
  if (base < 1) throw new Error('demo fixture: more contracts carry a schedule than there are instalments to give them.');

  const plans: PaymentPlan[] = [];
  let cursor = 0;
  for (let p = 0; p < parents.length; p += 1) {
    const contract = parents[p]!;
    const count = base + (p < remainder ? 1 : 0);
    const total = contract.amount ?? 0;
    const instalment = Math.round((total / count) * 100) / 100;

    // Draw this contract's roles, turn each into a date, then order the
    // schedule by date so `seq` counts forward in time the way an instalment
    // number does.
    const drawn = roles.slice(cursor, cursor + count);
    cursor += count;
    const dated = drawn.map((role) => {
      switch (role) {
        case 'paid': {
          const plannedDate = -(25 + Math.floor(random() * 380));
          return { role, plannedDate, actualDate: plannedDate + 1 + Math.floor(random() * 6), actualAmount: instalment };
        }
        case 'partial': {
          const plannedDate = -(15 + Math.floor(random() * 190));
          return { role, plannedDate, actualDate: plannedDate + 3 + Math.floor(random() * 9), actualAmount: Math.round(instalment * 0.5 * 100) / 100 };
        }
        case 'overdue':
          return { role, plannedDate: -(5 + Math.floor(random() * 65)), actualDate: null, actualAmount: null };
        case 'due':
          return { role, plannedDate: Math.floor(random() * 31), actualDate: null, actualAmount: null };
        case 'planned':
        default:
          return { role, plannedDate: 35 + Math.floor(random() * 560), actualDate: null, actualAmount: null };
      }
    });
    dated.sort((a, b) => a.plannedDate - b.plannedDate);

    // The last instalment absorbs the rounding so the schedule sums to the
    // contract amount exactly, which is what the `planned_amount` roll-up is
    // checked against.
    const drift = Math.round((total - instalment * count) * 100) / 100;
    dated.forEach((row, i) => {
      const plannedAmount = Math.round((instalment + (i === count - 1 ? drift : 0)) * 100) / 100;
      plans.push({
        contractIndex: contract.index,
        seq: i + 1,
        plannedDate: row.plannedDate,
        plannedAmount,
        status: row.role,
        actualDate: row.actualDate,
        actualAmount: row.actualAmount === null ? null : row.role === 'paid' ? plannedAmount : row.actualAmount,
        conditionIndex: (contract.index + i) % 6,
        invoiceNo: row.role === 'paid' || row.role === 'partial' ? `INV-${String(1000 + contract.index * 7 + i)}` : null,
      });
    });
  }
  assertCount('clm_payment_plan', plans.length, 300);
  return plans;
};

export const PAYMENT_PLAN: readonly PaymentPlan[] = planPayments();
