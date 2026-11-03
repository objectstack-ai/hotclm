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
 * `clm_contract_version` is planned last ({@link VERSION_PLAN}). Its `file` is
 * `required: true` (DESIGN.md §03) and a `file` value is the id of a stored
 * file, which only an upload used to mint — so until @objectstack 18.2.0 the
 * fixture seeded no versions at all. 18.2.0's `seedFile(path)`
 * (objectstack-ai/objectstack#25779, ruled D on #19) has the platform store a
 * file the package ships and write its id into the field, so every version now
 * carries a real, downloadable document from `fixtures/`.
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
    switch (role) {
      case 'overdue':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: -(2 + Math.floor(random() * 38)), status: 'overdue', completedAt: null };
      case 'due_soon_pending':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 1 + Math.floor(random() * 29), status: 'pending', completedAt: null };
      case 'due_soon_progress':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 1 + Math.floor(random() * 29), status: 'in_progress', completedAt: null };
      case 'done': {
        const dueDate = -(20 + Math.floor(random() * 280));
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate, status: 'done', completedAt: dueDate - 1 - Math.floor(random() * 4) };
      }
      case 'waived':
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: -(10 + Math.floor(random() * 190)), status: 'waived', completedAt: null };
      case 'future':
      default:
        return { contractIndex: contract.index, kind, titleIndex: slot, dueDate: 35 + Math.floor(random() * 460), status: 'pending', completedAt: null };
    }
  });
  assertCount('clm_obligation', plans.length, 200);
  return plans;
};

/**
 * Every obligation has an owner, and that is new (issue #64, ruled A).
 *
 * This fixture used to leave exactly one obligation with no `owner`, due seven
 * days after boot, so that F10 (`obligation_due`) would take its "nobody to
 * tell" edge on this corpus. That edge existed because `clm_obligation.owner`
 * was optional. The column is retired: the accountable person is now the
 * row's platform owner `owner_id`, and `owner_id` is never empty (the platform
 * stamps the acting user on a person's insert, the seed and F9 name one
 * explicitly, and nobody without the transfer grant can change it). So there
 * is no unowned obligation for F10 to be quiet about, and keeping one in the
 * fixture would assert a state the product can no longer reach.
 *
 * The edge itself belongs to the shared sweep (`_daily-sweep.ts`) and stays
 * exercised by F3, whose `legal_owner` may still be empty
 * (`UNASSIGNED_IN_REVIEW` in `plan-contracts.ts`). The row that carried it
 * here is now dealt like every other one, on its drawn due date.
 */
export const OBLIGATION_PLAN: readonly ObligationPlan[] = planObligations();

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

// ─────────────────────────────────────────────── clm_contract_version (300) ──

export type VersionKind = 'draft' | 'internal_redline' | 'counterparty_redline' | 'clean' | 'final_signed';

export interface VersionPlan {
  readonly contractIndex: number;
  readonly versionNo: number;
  readonly kind: VersionKind;
  readonly turn: 'internal' | 'counterparty';
  /** Exactly one row per contract carries it (#96, ruled 1A 2A). */
  readonly isCurrent: boolean;
  /**
   * Who filed it, as a role `keys.ts` resolves to an account: the requester
   * who launched the contract, its lawyer, or nobody — the two flows that file
   * an executed copy (F7, F16) stamp no `submitted_by`, so a seeded one does
   * not either.
   */
  readonly filedBy: 'owner' | 'legal' | null;
}

/**
 * The negotiation a contract still in review is in the middle of, by length,
 * ending on the side whose move it now is NOT: `current_turn: 'counterparty'`
 * means our redline is out and we are waiting, so the newest version is ours;
 * `'internal'` means their markup has come back, so the newest is theirs.
 * Every sequence opens on our draft and carries at least one counterparty
 * redline (DESIGN.md §10 「含对方红线」).
 */
const OPEN_ENDING_OURS: Record<3 | 4 | 5, readonly VersionKind[]> = {
  3: ['draft', 'counterparty_redline', 'internal_redline'],
  4: ['draft', 'internal_redline', 'counterparty_redline', 'internal_redline'],
  5: ['draft', 'counterparty_redline', 'internal_redline', 'counterparty_redline', 'internal_redline'],
};
const OPEN_ENDING_THEIRS: Record<3 | 4 | 5, readonly VersionKind[]> = {
  3: ['draft', 'internal_redline', 'counterparty_redline'],
  4: ['draft', 'counterparty_redline', 'internal_redline', 'counterparty_redline'],
  5: ['draft', 'internal_redline', 'counterparty_redline', 'internal_redline', 'counterparty_redline'],
};
/**
 * A negotiation that has closed: the counterparty's last markup was accepted
 * into a clean copy, which is what `approved → signing` requires to be current.
 */
const SETTLED: Record<3 | 4 | 5, readonly VersionKind[]> = {
  3: ['draft', 'counterparty_redline', 'clean'],
  4: ['draft', 'counterparty_redline', 'internal_redline', 'clean'],
  5: ['draft', 'counterparty_redline', 'internal_redline', 'counterparty_redline', 'clean'],
};

/** How many versions each kind of history gets, dealt by role bag like the families above. */
type VersionLength = 3 | 4 | 5;

/**
 * 300 contract versions (DESIGN.md §10: 「谈判中的合同有 3 到 5 版，含对方红线」),
 * each holding a real file the package ships (`seedFile`, `fixtures/`).
 *
 * The count is not padded to reach 300; it is what the book's own shape
 * produces, and {@link assertCount} proves it lands there:
 *
 *  - **30 contracts in negotiation** (`in_review` 12, `in_approval` 8,
 *    `approved` 4, `signing` 6) carry 3 to 5 versions — 6 × 3, 12 × 4,
 *    12 × 5 = 126. Those still in review end on whichever side's paper the
 *    contract's `current_turn` says is out; the 18 past review end on a clean
 *    copy, because every one of them has been — or is about to be — sent for
 *    signature, and `approved → signing` refuses without a current clean
 *    version.
 *  - **24 negotiated executed contracts** carry that history plus the
 *    executed copy — 12 × 4, 12 × 5 = 108. The executed copy is
 *    `final_signed` and NOT current: `contract_version_current` would store it
 *    `false` anyway while other versions exist (#96, 2A), which is what F7
 *    writes too, so the clean copy stays the current one.
 *  - **48 backfilled contracts** carry exactly one version, the executed copy,
 *    current — the shape F16 (`executed_upload`) files and nothing more: a
 *    backfill claims no negotiation (`plan-contracts.ts`).
 *  - **18 contracts not yet past intake** (`draft` 10, `submitted` 6,
 *    `cancelled` 2) carry version 1, our draft, current. That is what makes a
 *    seeded draft submittable: the `draft → submitted` guard wants a first
 *    version or a type template, and before seed files existed the fixture
 *    could give it neither (#19).
 *
 * 126 + 108 + 48 + 18 = 300, and every contract has exactly one current
 * version (#96, ruled 1A 2A).
 */
const planVersions = (): VersionPlan[] => {
  const negotiating = CONTRACT_PLAN.filter((c) =>
    (['in_review', 'in_approval', 'approved', 'signing'] as ContractStatus[]).includes(c.status));
  const executedNegotiated = CONTRACT_PLAN.filter((c) => isExecuted(c.status) && !c.backfilled);
  const negotiatingLengths = dealRoles<VersionLength>(
    [...repeat<VersionLength>(3, 6), ...repeat<VersionLength>(4, 12), ...repeat<VersionLength>(5, 12)],
    0x5eed_7e,
  );
  const executedLengths = dealRoles<4 | 5>([...repeat<4 | 5>(4, 12), ...repeat<4 | 5>(5, 12)], 0x5eed_7f);
  assertCount('clm_contract_version (negotiating contracts)', negotiating.length, negotiatingLengths.length);
  assertCount('clm_contract_version (negotiated executed contracts)', executedNegotiated.length, executedLengths.length);

  const kindsFor = new Map<number, readonly VersionKind[]>();
  negotiating.forEach((contract, i) => {
    const length = negotiatingLengths[i]!;
    kindsFor.set(
      contract.index,
      contract.status !== 'in_review'
        ? SETTLED[length]
        : contract.currentTurn === 'counterparty' ? OPEN_ENDING_OURS[length] : OPEN_ENDING_THEIRS[length],
    );
  });
  executedNegotiated.forEach((contract, i) => {
    const length = executedLengths[i]!;
    kindsFor.set(contract.index, [...SETTLED[(length - 1) as 3 | 4], 'final_signed']);
  });

  const plans: VersionPlan[] = [];
  for (const contract of CONTRACT_PLAN) {
    const kinds: readonly VersionKind[] = kindsFor.get(contract.index) ?? (contract.backfilled ? ['final_signed'] : ['draft']);
    // The newest version is current, except that an executed copy never takes
    // the flag from a negotiation version (#96, 2A).
    const current = kinds.length > 1 && kinds[kinds.length - 1] === 'final_signed' ? kinds.length - 2 : kinds.length - 1;
    kinds.forEach((kind, i) => {
      plans.push({
        contractIndex: contract.index,
        versionNo: i + 1,
        kind,
        turn: kind === 'counterparty_redline' ? 'counterparty' : 'internal',
        isCurrent: i === current,
        filedBy: kind === 'final_signed' ? null : kind === 'draft' ? 'owner' : 'legal',
      });
    });
  }

  assertCount('clm_contract_version', plans.length, 300);
  // Proven, not assumed from the construction: one current version per
  // contract, a counterparty redline in every negotiation, and a current clean
  // copy wherever a contract is at or past `approved → signing`.
  for (const contract of CONTRACT_PLAN) {
    const own = plans.filter((v) => v.contractIndex === contract.index);
    const currents = own.filter((v) => v.isCurrent).length;
    if (currents !== 1) {
      throw new Error(`demo fixture: contract #${contract.index} has ${currents} current versions; #96 (ruled 1A 2A) allows exactly one.`);
    }
    if (kindsFor.has(contract.index) && !own.some((v) => v.kind === 'counterparty_redline')) {
      throw new Error(`demo fixture: contract #${contract.index} negotiated without a counterparty redline (DESIGN.md §10).`);
    }
    const signable = ['signing', 'active', 'expired', 'terminated', 'approved'].includes(contract.status) && !contract.backfilled;
    if (signable && !own.some((v) => v.kind === 'clean' && v.isCurrent)) {
      throw new Error(`demo fixture: contract #${contract.index} is ${contract.status} with no current clean version, which approved → signing refuses.`);
    }
    if (isExecuted(contract.status) && !own.some((v) => v.kind === 'final_signed')) {
      throw new Error(`demo fixture: contract #${contract.index} is ${contract.status} with no final_signed version, which signing → active refuses.`);
    }
  }
  return plans;
};

export const VERSION_PLAN: readonly VersionPlan[] = planVersions();
