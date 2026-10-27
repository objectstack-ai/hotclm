// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { Contract } from '../objects/contract.object.js';

import { dayOffset } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { contractTitle, legalOwnerOf, ownerOf, titleOfIndex } from './keys.js';
import { CONTRACT_PLAN, lawOf, renewalFlagged, typeOf, type ContractPlan } from './plan-contracts.js';
import { SIGNING_ENTITY_PLAN } from './plan.js';

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
 *  - `is_expiring` is the flag F12 itself left on its last run — `active`,
 *    and a notice deadline on a day BEFORE boot day — evaluated against the
 *    seeded dates by {@link renewalFlagged}, which says why a deadline of
 *    today is still unflagged;
 *  - `approval_status` mirrors the contract's own status, so every surface
 *    inside the app agrees. The surface that does not is the platform's:
 *    NO `sys_approval_request` exists behind any of these rows, because F5
 *    cannot run at seed time. See `plan-contracts.ts` for why, and the PR body
 *    for what card 10's dashboards will therefore show.
 */

/**
 * The columns the contract's lifecycle owns once the row exists — written when
 * the seed CREATES a contract, and left alone when a re-run of `pnpm demo`
 * matches one (`applyOn: 'create'`, issue #41).
 *
 * The set is the single-writer family `contract.object.ts` names (the stage
 * timestamps and routing flags, `approval_status`, `is_expiring`,
 * `archived_at`, `is_backfilled`), plus the three a transition writes beside
 * them: `status` itself, `termination_reason` (written by Terminate in the same
 * write as `terminated`) and `archive_no` (the records desk's number, which is
 * what stamps `archived_at`). Each has a writer after creation that is not the
 * fixture — F12 sets `is_expiring`, F13 moves `active` to `expired`, the state
 * machine and F2/F5/F14 stamp the rest — and the state machine refuses most of
 * the ways back, so a re-run that re-asserted them either walked a job's work
 * back silently or had the row refused and dropped whole.
 *
 * They travel as ONE set because they are one fact: a create-only `status`
 * beside an `always` `approved_at` would let a re-run blank the stamp of a
 * contract somebody approved since, which is a contract the write layer could
 * never have produced. The cost is stated in the README: these columns keep
 * the dates they were stamped with, while the fixture's own dates
 * (`start_date`, `end_date`, …) still slide forward on every re-run.
 *
 * `legal_owner` and `owner_id` are NOT here: they are how the book is dealt to
 * the demo staff, and a re-run re-dealing them is the behaviour, not a defect.
 */
const CREATE_ONLY = { applyOn: 'create' } as const;

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
  columns: {
    status: CREATE_ONLY,
    is_expiring: CREATE_ONLY,
    is_backfilled: CREATE_ONLY,
    route_legal_head: CREATE_ONLY,
    route_finance: CREATE_ONLY,
    route_executive: CREATE_ONLY,
    route_gm: CREATE_ONLY,
    approval_status: CREATE_ONLY,
    submitted_at: CREATE_ONLY,
    review_started_at: CREATE_ONLY,
    approved_at: CREATE_ONLY,
    signed_at: CREATE_ONLY,
    executed_at: CREATE_ONLY,
    activated_at: CREATE_ONLY,
    closed_at: CREATE_ONLY,
    termination_reason: CREATE_ONLY,
    archive_no: CREATE_ONLY,
    archived_at: CREATE_ONLY,
  },
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
      // Which of the group's three entities signs follows the governing law
      // (`plan.ts`): New York → the US parent, Germany → the EU subsidiary,
      // England and Wales → the APAC subsidiary. A code, resolved against the
      // `sys_business_unit` rows `business-unit.seed.ts` upserts on `code`.
      our_entity: SIGNING_ENTITY_PLAN[law.entityIndex]!.code,
      // The requesting department follows the contract type (`plan.ts`): a
      // code, resolved against the department-kind `sys_business_unit` rows
      // `business-unit.seed.ts` upserts on `code`, as `our_entity` is.
      department: type.department,
      // `owner_id` names a user the way `legal_owner` on the next line does —
      // a `lookup('sys_user')` resolved against `sys_user.name`. It replaces two claims that
      // stood here and were both false; each was re-measured on 17.3.0 before
      // this line was written, because a `(measured)` annotation that is not
      // one is worse than no comment at all.
      //
      //  - "a seed cannot name a user": it can, and this file already did on
      //    the next line. A name that no account carries resolves to nothing
      //    and lands NULL, silently — it never refuses the row.
      //  - "the runtime claims ownerless seeded rows for the dev admin once
      //    that account is minted": the routine is real
      //    (`claimSeedOwnership`, `@objectstack/plugin-security`). Through
      //    17.4 it ran only on the boot that PROMOTES the first human to
      //    platform admin — under `pnpm demo` the PRIMING boot, with no
      //    contract to claim — so the demo boot left all 120 NULL. From 17.5
      //    (17.7 widened it again) it also runs whenever a seed settles
      //    (`app:seeded`), against the existing platform admin. Since #28
      //    (PR #171) the requesters are declared demo staff
      //    (`objectstack.config.ts` `demoStaff`) that the platform creates on
      //    the demo boot BEFORE the seed runs, so the name resolves on the
      //    first `pnpm demo` (43 / 43 / 34, README). The name below is what
      //    decides the owner; the claim only fills a name no account carries.
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
      is_expiring: renewalFlagged(contract),

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
