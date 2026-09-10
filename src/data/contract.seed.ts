// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { Contract } from '../objects/contract.object.js';

import { dayOffset } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { contractTitle, legalOwnerOf, ownerOf, titleOfIndex } from './keys.js';
import { CONTRACT_PLAN, lawOf, typeOf, type ContractPlan } from './plan-contracts.js';

/**
 * The 120 contracts of DESIGN.md §10, in the status spread its table pins.
 *
 * ## What this file deliberately does NOT write
 *
 * `contract_number`, `category`, `direction` and `execution_formalities` are
 * stamped by `contract_type_stamp` on the way in, and lifecycle hooks DO run
 * over a seed write — so authoring them would create a second source of truth
 * that loses. The five roll-ups are recomputed by the engine on every child
 * write; seeding one would be exactly the "seeded number that looks computed"
 * AGENTS.md forbids. The four `ai_*` fields have one writer, the adopt action,
 * and no suggestion has been adopted here.
 *
 * ## What it writes although the field is `readonly`
 *
 * The stage timestamps, the four `route_*` flags, `approval_status`,
 * `is_expiring` and `is_backfilled` are readonly and flow-owned, and the seed
 * path can write all of them (measured: the read-only strip does not apply to
 * a system write). Each is written because the alternative is a worse lie —
 * an `approved` contract with an empty `approved_at` is not more honest than
 * one carrying the date the fixture says it was approved — and each is
 * COMPUTED rather than chosen:
 *
 *  - `route_*` comes from {@link routeFlagsFor}, which re-implements F2's
 *    matching rules against the same six rules this demo installs;
 *  - `is_expiring` is F12's own predicate — `active`, and `end_date` inside
 *    the renewal notice window — evaluated against the seeded dates;
 *  - `approval_status` mirrors the contract's own status, so every surface
 *    inside the app agrees. The surface that does not is the platform's:
 *    NO `sys_approval_request` exists behind any of these rows, because F5
 *    cannot run at seed time. See `plan-contracts.ts` for why, and the PR body
 *    for what card 10's dashboards will therefore show.
 */

/** F12's predicate, evaluated against the seeded dates rather than guessed. */
const isExpiring = (contract: ContractPlan): boolean =>
  contract.status === 'active' &&
  contract.timeline.endDate !== null &&
  contract.renewalNoticeDays !== null &&
  contract.timeline.endDate - contract.renewalNoticeDays <= 0;

/**
 * Six of the fourteen contracts in a terminal state have been through the
 * records desk; the other eight are what §05's "待归档" list is for.
 */
const TERMINAL: readonly ContractPlan['status'][] = ['expired', 'terminated', 'cancelled'];
const archived = new Set(
  CONTRACT_PLAN.filter((c) => TERMINAL.includes(c.status)).slice(0, 6).map((c) => c.index),
);

export const contractSeed = defineSeed(Contract, {
  externalId: 'title',
  mode: 'upsert',
  records: CONTRACT_PLAN.map((contract) => {
    const type = typeOf(contract);
    const law = lawOf(contract);
    const party = STRINGS.parties[contract.partyIndex]!;
    const t = contract.timeline;
    return {
      title: contractTitle(contract),
      contract_type: STRINGS.contractTypes[contract.typeIndex]!.name,
      party: party.name,
      status: contract.status,
      our_entity: 'head_office' as const,
      department: type.department,
      // `owner_id` names a user the way `legal_owner` on the next line does —
      // a `lookup('sys_user')` resolved against `sys_user.name` by the two-boot
      // handover `scripts/demo.mjs` sequences. It replaces two claims that
      // stood here and were both false; each was re-measured on 17.3.0 before
      // this line was written, because a `(measured)` annotation that is not
      // one is worse than no comment at all.
      //
      //  - "a seed cannot name a user": it can, and this file already did on
      //    the next line. A name that no account carries resolves to nothing
      //    and lands NULL, silently — it never refuses the row.
      //  - "the runtime claims ownerless seeded rows for the dev admin once
      //    that account is minted": the routine is real
      //    (`claimSeedOwnership`, `@objectstack/plugin-security`) but it runs
      //    on exactly one path — the boot that PROMOTES the first human to
      //    platform admin. Under `pnpm demo` that is the PRIMING boot, which
      //    runs with the demo off and has no contract to claim; the demo boot
      //    then reports `adminPromoted: false, reason: "already_have_admin"`
      //    and claims nothing. Measured both ways on one database: a single
      //    boot with the demo on logs `adminPromoted: true, ownershipClaimed:
      //    260` and owns all 120, `pnpm demo`'s second boot leaves all 120
      //    NULL. The annotation was true of the world before the two-boot
      //    handover landed, and that handover is what turned it off.
      //
      // Which requester owns which contract is {@link ownerOf} in `keys.ts`.
      owner_id: ownerOf(contract),
      // Which lawyer accepted it is {@link legalOwnerOf} in `keys.ts`, and
      // WHETHER one did is `hasLegalOwner` in `plan-contracts.ts`. Both halves
      // are deliberate and both leave rows empty on purpose: F2 assigns no
      // legal owner to a draft, to a `submitted` contract still in the 待受理
      // queue, or to a type that skips legal review — and two contracts in
      // review are handed back on purpose, so F3's "nobody to tell" edge stays
      // exercised (`UNASSIGNED_IN_REVIEW`). ⛔ Filling every row would delete
      // the coverage card 09 measured.
      legal_owner: legalOwnerOf(contract),

      amount: contract.amount,
      currency_code: law.currency,
      is_amount_estimated: contract.isAmountEstimated,
      liability_cap: contract.liabilityCap,
      payment_terms: contract.paymentTerms,

      start_date: t.startDate === null ? null : dayOffset(t.startDate),
      end_date: t.endDate === null ? null : dayOffset(t.endDate),
      term_months: contract.termMonths,
      auto_renew: contract.autoRenew,
      renewal_notice_days: contract.renewalNoticeDays,
      parent_contract: contract.parentIndex === null ? null : titleOfIndex(contract.parentIndex),
      is_expiring: isExpiring(contract),

      // Governing law is on the intake form of six of the nine types, and the
      // submission guard refuses a contract whose type asks for an intake
      // field it does not carry — so every contract has it, drafts included.
      // Measured: without it, submitting a seeded draft is refused with
      // "Intake fields required by the contract type are missing:
      // governing_law", which would have made the drafts un-submittable for a
      // reason that has nothing to do with the fixture's real limitation.
      governing_law: law.governingLaw,
      jurisdiction: STRINGS.jurisdictions[law.jurisdictionIndex]!,
      contract_language: law.language,
      confidentiality_term_months: contract.confidentialityTermMonths,
      risk_level: contract.riskLevel,
      summary: STRINGS.contractTypes[contract.typeIndex]!.summary.replace('{party}', party.name),

      current_turn: contract.currentTurn,
      turn_since: contract.turnSince === null ? null : dayOffset(contract.turnSince),

      route_legal_head: contract.route.route_legal_head,
      route_finance: contract.route.route_finance,
      route_executive: contract.route.route_executive,
      route_gm: contract.route.route_gm,
      approval_status: contract.approvalStatus,

      submitted_at: t.submittedAt === null ? null : dayOffset(t.submittedAt),
      review_started_at: t.reviewStartedAt === null ? null : dayOffset(t.reviewStartedAt),
      approved_at: t.approvedAt === null ? null : dayOffset(t.approvedAt),
      signed_at: t.signedAt === null ? null : dayOffset(t.signedAt),
      executed_at: t.executedAt === null ? null : dayOffset(t.executedAt),
      activated_at: t.activatedAt === null ? null : dayOffset(t.activatedAt),
      closed_at: t.closedAt === null ? null : dayOffset(t.closedAt),
      // Required to BE terminated, not merely expected: `termination_reason`
      // is `requiredWhen` the status is `terminated` (decision #6, ruled A),
      // and ADR-0113's transition gate refuses an insert born inside the gate.
      // Measured on this fixture without it: 4 contracts refused with
      // "Termination Reason is required", taking their reviews, signature
      // rounds and obligations with them, while the seed summary still read
      // like a clean load.
      termination_reason:
        contract.status === 'terminated'
          ? STRINGS.terminationReasons[contract.index % STRINGS.terminationReasons.length]!
          : null,

      // DESIGN.md §13 Q8's own definition: an already-executed contract
      // entered after the fact, which started active and skipped review and
      // approval. That is precisely what the 48 rows of the historical corpus
      // are, and saying so is what stops them claiming an approval nobody gave.
      is_backfilled: contract.backfilled,

      archive_no: archived.has(contract.index) ? `ARC-${String(2000 + contract.index)}` : null,
      archived_at: archived.has(contract.index) ? dayOffset(-(5 + (contract.index % 40))) : null,
    };
  }),
});
