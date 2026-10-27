// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { STRINGS } from './demo-locale.js';
import { POST_APPROVAL_STATUSES } from '../sharing/_lifecycle.js';
import type { ObligationPlan, ReviewPlan, VersionPlan } from './plan-children.js';
import { CONTRACT_PLAN, type ContractPlan, type DeviationPlan } from './plan-contracts.js';
import { assertUniqueKeys } from './_shared.js';

/**
 * The natural keys every dataset in this directory is matched on.
 *
 * Each dataset runs `mode: 'upsert'` so `pnpm demo` is re-runnable on a
 * database that already holds the demo — the second run slides every
 * boot-relative date forward instead of writing a second copy of the book, and
 * leaves the columns the lifecycle owns as the jobs and the desks left them
 * (`applyOn: 'create'` in `contract.seed.ts` and `post-signature.seed.ts`). An
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

/**
 * The account the demo is driven as — the platform's dev admin.
 *
 * No REFERENCE names it any more. `clm_contract.legal_owner` left for
 * {@link LEGAL_OWNERS}, `clm_obligation.owner` for {@link obligationOwnerOf},
 * `clm_deviation.decided_by` for {@link deviationDeciderOf}, and the last one,
 * the `required` `clm_review.reviewer`, for {@link reviewerOf} (#186).
 * Enumerated rather than sampled: `grep -rn DEMO_USER src` over this tree
 * returns the declaration, this file's cross-references, and one thing that is
 * not a reference at all — the `our`-side entry of `clm_signature.signers`, a
 * JSON string that resolves against nothing.
 */
export const DEMO_USER = 'Dev Admin';

/**
 * Who launched each contract — the `业务承办 ×3` of DESIGN.md §10's persona
 * mix, as ACCOUNT NAMES the loader resolves against `sys_user.name`.
 *
 * ## A seed CAN name a user; only the platform admin fills the gap
 *
 * `clm_contract.owner_id` is a `lookup('sys_user')` exactly like `legal_owner`,
 * and `scripts/demo.mjs` sequences two boots so that a name resolves. The
 * security middleware that "stamps the acting user on any insert that leaves it
 * empty" stands aside for system writes at its first line
 * (`if (opCtx.context?.isSystem) return next()`), and a seed insert has no
 * acting user to stamp — but from 17.5 the seed-settle claim hands every row
 * left NULL to the platform admin, so an unresolved name ends on the dev admin,
 * not on nobody. `contract.seed.ts` carries the measurements.
 *
 * ## Why these three names and not {@link DEMO_USER}
 *
 * The dev admin holds no `clm_*` permission set, so `clm_requester.access`
 * gates every 我的合同 item away from it: measured on this fixture,
 * `GET /api/v1/meta/app/clm` serves that account `navigation: []`. Contracts
 * parked on it would be owned by the one account that can never open the
 * screen they are meant to fill. The accounts that CAN are DESIGN.md §10's
 * persona mix, which the stack declares as `demoStaff` and the platform
 * creates on the demo boot, so those are the names the deal uses.
 *
 * The two kinds of reference still differ in what a missing account costs.
 * `clm_review.reviewer` is `required: true`, so a name that resolves to
 * nothing costs the whole row. `owner_id` and `clm_contract.legal_owner` are
 * optional: measured on 17.3.0 for `owner_id` and re-measured on 17.4.0 for
 * `legal_owner`, an unresolvable name lands NULL, silently, and never refuses
 * the row. Since #28 (PR #171) the platform creates the demo staff on the
 * demo boot BEFORE the seed runs, so on `pnpm demo` every one of these names
 * resolves on the first run and no account is left for the operator to
 * create. The README names the accounts where the evaluator reads it.
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
 * The lawyers who accept contracts into review — the `clm_legal_counsel ×2` of
 * DESIGN.md §10's persona mix, as ACCOUNT NAMES resolved against
 * `sys_user.name` exactly like {@link CONTRACT_OWNERS}.
 *
 * ## Why not {@link DEMO_USER}, which is what this column held before
 *
 * Measured on this fixture at `a7b7db5`, one run of each scheduled job after
 * the README operator setup: **44 notification receipts, and every one of the
 * 5 that `legal_owner` addressed carried the dev admin.** A demo whose legal
 * reminders are the administrator writing to themselves under-demonstrates a
 * reminder layer that works — and the dev admin is the one account that cannot
 * act on them: it holds no `clm_*` permission set, so `clm_legal.access` gates
 * every 法务工作台 item away from it and 审查中 (`legal_owner == me`) is a
 * screen it can never open. That is the same argument {@link CONTRACT_OWNERS}
 * makes for `owner_id`, and it applies here for the same reason.
 *
 * `legal_owner` is `Field.user` and optional, so — like `owner_id` and unlike
 * the `required` `clm_review.reviewer` — a name no account carries lands NULL,
 * silently, and never refuses the row. These two are declared demo staff
 * (`demoStaff`, PR #171): the platform creates them on the demo boot before
 * the seed runs, so the contracts reach them on the first `pnpm demo`. The
 * README names them where the evaluator reads it.
 *
 * ## Why the counterparty decides, and what that does NOT claim
 *
 * F2 (`contract_route`) assigns `legal_owner` to the counsel with the FEWEST
 * OPEN contracts at the moment of submission. No fixture can replay that: the
 * answer depends on which contracts were still open on each of 69 different
 * historical days, and this corpus is loaded in one pass with no history to
 * count. So the deal states a rule it can defend instead of pretending to
 * reproduce F2's: the counterparty decides, so every contract with a given
 * party is reviewed by the lawyer who knows that account — which is how a real
 * legal desk works, gives each of the two a spread of types, statuses and
 * amounts, and is structure, so `demo-en` and `demo-zh` deal identically.
 */
export const LEGAL_OWNERS: readonly string[] = [
  'Legal Counsel 1',
  'Legal Counsel 2',
];

/**
 * The lawyer who knows this counterparty — the one rule every column that
 * names a lawyer is dealt by, extracted so there is one of it. Enumerated,
 * those columns are three: `clm_contract.legal_owner` ({@link legalOwnerOf}),
 * the compliance share of `clm_obligation.owner`
 * ({@link obligationOwnerOf}) and `clm_deviation.decided_by`
 * ({@link deviationDeciderOf}).
 *
 * ⚠️ Being the counterparty's lawyer is NOT the same fact as owning that
 * contract's review: {@link legalOwnerOf} additionally requires that F2 would
 * have assigned one at all, and {@link obligationOwnerOf} and
 * {@link deviationDeciderOf} deliberately do not — a compliance filing under a
 * signed contract needs a lawyer, and an off-playbook clause needs a ruling
 * from one, whether or not that particular contract ever went through legal
 * review.
 */
const counselFor = (contract: ContractPlan): string =>
  LEGAL_OWNERS[contract.partyIndex % LEGAL_OWNERS.length]!;

/**
 * The lawyer who accepted this contract into review, by counterparty
 * relationship — or `null` where F2 would never have assigned one.
 *
 * `hasLegalOwner` is the fixture's mirror of F2's own condition, and the
 * ownerless rows it leaves are deliberate in two different ways. See
 * `plan-contracts.ts`: the type-and-status half (a draft, a `submitted`
 * contract nobody has picked up, a type that skips legal review) and the
 * handed-back half that keeps F3's "nobody to tell" edge exercised.
 */
export const legalOwnerOf = (contract: ContractPlan): string | null =>
  contract.hasLegalOwner ? counselFor(contract) : null;

/**
 * Who is accountable for PERFORMING an obligation — or `null` for the one row
 * this fixture deliberately leaves unassigned.
 *
 * ## Why not {@link DEMO_USER}, which is what this column held before
 *
 * Measured on `main` @ `2d63324`, clean database, README operator setup
 * performed, one run of each scheduled job: **all 200 obligations carried the
 * dev admin, and F10's were the only notification receipts still addressed to
 * it** — `clm_obligation_due_soon -> Dev Admin x2`, every other topic already
 * reaching a real account after #26 and #47. The argument against leaving them
 * there is the one {@link CONTRACT_OWNERS} makes for `owner_id` and
 * {@link LEGAL_OWNERS} makes for `legal_owner`, and it is sharper here than in
 * either: the dev admin holds no `clm_*` permission set, so `clm_requester`'s
 * `RU（本人负责）` row of DESIGN.md §04 grants it nothing, `clm_requester.access`
 * hides 我负责的履约 from it, and F10's reminder is the one kind of notice whose
 * whole point is that the person receiving it goes and does the thing.
 *
 * `owner` is optional (DESIGN.md §03, and the field's own description: "Empty
 * means unassigned, not the contract owner"), so like the other two optional
 * references a name no account carries lands NULL, silently, and never
 * refuses the row. The five accounts it names are declared demo staff
 * (`demoStaff`, PR #171), created by the platform on the demo boot before the
 * seed runs, so the obligations reach them on the first `pnpm demo`. The deal
 * names NO new account: it spends only the five the fixture already deals
 * contracts to.
 *
 * ## The rule: the desk that performs it, and the counterparty decides which
 *
 * A `compliance` obligation goes to the lawyer who knows that counterparty; a
 * `deliverable` or a `report` goes to the requester who launched the contract.
 * Both halves are grounded rather than picked:
 *
 *  - §04's permission matrix gives `clm_legal` **RCU** on `clm_obligation` —
 *    the only non-admin set that may CREATE one — and the four compliance
 *    titles this fixture draws from are all legal-and-compliance work (an
 *    insurance certificate, a sanctions re-screen, a data-transfer safeguard
 *    confirmation, an anti-bribery statement). Nobody in the business does
 *    those.
 *  - `clm_requester` holds `RU（本人负责）` and §05 puts 我负责的履约 in the
 *    我的合同 group every employee reaches, which is exactly what a delivery
 *    or a periodic report is: the launching desk's own work.
 *
 * ⚠️ And it deliberately does NOT make the obligation owner a copy of the
 * contract's `owner_id`. DESIGN.md §03 declines to default this column to the
 * contract owner; a fixture that put all 200 on the launching requester would
 * assert by construction the very thing §03 refuses to assert by default, and
 * a reader could no longer tell from the data that the two columns are
 * independent. Dealing the compliance third away from the business owner is
 * what makes that independence visible — and it is why `obligation_metrics`
 * (§09's third dataset, whose first dimension after status and kind is
 * `owner`) reads as five bars rather than one.
 *
 * ⚠️ Nothing here claims to reproduce a flow. No flow assigns this column:
 * F9 creates renewal obligations from the type's defaults and leaves the owner
 * to a person, and S5's `extract_obligations` proposes a 负责人 that a person
 * confirms (§07). The deal states a rule a legal desk would recognise, in the
 * same counterparty-relationship style {@link ownerOf} and {@link legalOwnerOf}
 * already use — so `demo-en` and `demo-zh` deal identically, no locale bundle
 * being consulted for any of it.
 */
export const obligationOwnerOf = (obligation: ObligationPlan): string | null => {
  if (!obligation.hasOwner) return null;
  const contract = CONTRACT_PLAN[obligation.contractIndex]!;
  return obligation.kind === 'compliance' ? counselFor(contract) : ownerOf(contract);
};

/**
 * Who decided this deviation — the lawyer who knows the counterparty — or
 * `null` while it is still open.
 *
 * ## Why not {@link DEMO_USER}, which is what this column held before
 *
 * Measured on `main` @ `3d11db8`, clean database, one `pnpm demo`: **25
 * deviations, 17 of them decided, and every one of the 17 carried the dev
 * admin** (`GET /api/v1/data/clm_deviation` → `{"total":25}`, `decided_by`
 * resolving to `Dev Admin` ×17, the 8 open ones NULL). So the 决定人 column of
 * every decided deviation said the administrator adjudicated it.
 *
 * That is a different cost from the one {@link CONTRACT_OWNERS},
 * {@link LEGAL_OWNERS} and {@link obligationOwnerOf} answer, and the
 * difference is worth stating rather than copying their argument across.
 * `decided_by` is an AUDIT STAMP, not a recipient: nothing is routed to it, no
 * reminder lands on an account that cannot act on it, and no screen is keyed
 * on it. What it does is claim who performed an act — and §04 gives the act to
 * legal, not to the administrator: on `clm_deviation`, `clm_requester` holds
 * `RC（本人合同）` and `clm_legal` is the only non-admin set with **U**, so
 * moving a deviation out of `open` is a lawyer's write and nobody else's.
 * A demo whose every deviation was decided by the dev admin tells an evaluator
 * that adjudicating the playbook is an administrative act.
 *
 * ## {@link counselFor} and not {@link legalOwnerOf}, which is the real choice
 *
 * Both name a lawyer; they differ on the rows where F2 never assigned one.
 * Enumerated on this fixture: the 17 decided deviations sit on 17 distinct
 * contracts, and **3 of those 17 are of a type whose `requiresLegalReview` is
 * false**, so `legalOwnerOf` returns `null` for them (contracts #17, #44, #48
 * — two `in_approval`, one `approved`).
 *
 * Dealing by {@link legalOwnerOf} would therefore leave 3 rows that are
 * `accepted`/`rejected`/`withdrawn`, carry a `decided_at`, and name nobody.
 * The write layer never produces that pair: `deviation_state_machine`
 * (`contract.hook.ts`) stamps `decided_by` with the acting user on any
 * decision that leaves it empty, so a decided deviation always has a decider.
 * This fixture's standing rule is that no seeded row is in a state the write
 * layer would have refused or would never have written — the same rule that
 * keeps all 8 open deviations on `in_review` contracts, because F6 would not
 * let an `in_approval` contract carry one.
 *
 * {@link counselFor} claims only what a lawyer's involvement needs: the
 * counterparty's lawyer looked at the clause and ruled on it. It does NOT
 * claim that contract went through a legal review, which is the extra fact
 * {@link legalOwnerOf} carries and the distinction `counselFor`'s own note
 * draws — the same reason {@link obligationOwnerOf} deals compliance work by
 * `counselFor` and not by `legalOwnerOf`. A deviation exists precisely where
 * somebody wanted off-playbook wording, and someone in legal answered, whether
 * or not the contract's type routes through review at all.
 *
 * ## No deliberate unassigned set here, and that is not an oversight
 *
 * {@link legalOwnerOf} and {@link obligationOwnerOf} both keep one deliberately
 * empty because a FLOW takes a "nobody to tell" edge over that column — F3 over
 * `legal_owner`, F10 over `owner` — and an empty column is what exercises it.
 * No flow reads `decided_by`: it is written once and displayed. An empty one
 * would exercise nothing and would instead assert the one thing this column
 * cannot mean, that a decided deviation was decided by nobody. So every decided
 * row names a lawyer and every open row is `null` — which is not an unassigned
 * set but the column's own semantics, and matches what the hook writes.
 *
 * ## Structure, and no new account
 *
 * The deal is {@link counselFor}, so it is the counterparty relationship the
 * fixture already deals `owner_id`, `legal_owner` and the compliance
 * obligations by: no locale bundle is consulted and `demo-en` and `demo-zh`
 * deal identically. It spends NO new account — the same two `Legal Counsel`
 * demo staff the contracts are dealt to, 10 / 7 across the 17, created by the
 * platform before the seed runs. Like the other optional references, a name
 * no account carries lands NULL (measured on 17.4.0) and never refuses the row.
 */
export const deviationDeciderOf = (deviation: DeviationPlan): string | null =>
  deviation.status === 'open' ? null : counselFor(CONTRACT_PLAN[deviation.contractIndex]!);

/**
 * The head of legal and the finance controller, as the ACCOUNT NAMES the
 * loader resolves `clm_review.reviewer` against.
 *
 * These two are the `name` of their `demoStaff` entries in
 * `objectstack.config.ts`, which spells them from here, so a rename moves
 * both (issue #191). `reviewer` is `required: true`, which is why they must
 * never drift: the loader refuses every review that names an account nobody
 * carries, and the seed reports success for the rest.
 */
export const LEGAL_HEAD = 'Head of Legal';
export const FINANCE_CONTROLLER = 'Finance Controller';

/**
 * Who a review belongs to — `clm_review.reviewer`, the person who decides it
 * (`review_decision_stamp` in `contract.hook.ts`: a review has no
 * `decided_by`, its reviewer IS the decider).
 *
 * ## Why not {@link DEMO_USER}, which is what this column held before
 *
 * Measured on `main` @ `37ce10c`, clean database, one `pnpm demo:zh`: **all 60
 * reviews named the dev admin** (`display_name` `Legal · Dev Admin` ×35,
 * `Finance · Dev Admin` ×23, `Business · Dev Admin` ×2). The column was dealt
 * that way while the dev admin was the only account at seed time and
 * `reviewer` is `required`, so any other name cost the row. Since #28 (PR #171)
 * the demo staff exist before the seed runs, so the constraint is gone and
 * the argument {@link LEGAL_OWNERS} makes for `legal_owner` applies: the dev
 * admin holds no `clm_*` set beyond the default, so a review on its desk is a
 * review nobody who can act on it is named for.
 *
 * ## The rule: the desk §04 gives the stage to
 *
 *  - **legal** — the contract's lawyer, {@link legalOwnerOf}: the counsel who
 *    accepted it into review is the one who reviews it. Where F2 assigned
 *    nobody (the contract handed back to the queue), the head of legal, who
 *    receives that queue's escalations.
 *  - **finance** — the finance controller, whose `clm_finance` holds
 *    `RCU（stage=finance）` on this object.
 *  - **compliance** — the head of legal: compliance is legal's work (the
 *    argument {@link obligationOwnerOf} makes for compliance obligations) and
 *    a high-risk contract's compliance sign-off is the senior lawyer's.
 *    The plan deals no compliance review today; the rule is stated so the
 *    first one has an owner.
 *  - **business** — the requester who launched the contract, {@link ownerOf}:
 *    the business review is the launching desk's own sign-off.
 *
 * ## Where the rule bends, measured on 18.2.0
 *
 * A finance review on a contract that has not reached `approved` goes to the
 * head of legal, not the finance controller. `clm_review` is
 * `controlled_by_parent`, so writing one needs EDIT on its contract, and
 * finance edits contracts only from `approved` onward
 * (`contract_finance_post_approval`); before that it READS the contracts the
 * matrix routed to it (`contract_finance_routed`) and no more. Measured: the
 * finance controller's `PATCH` of a finance review on an `in_review` or an
 * `in_approval` contract answers `403 PERMISSION_DENIED` ("requires edit
 * access to its master record"), the same write on an `active` contract `200`.
 * So on those rows the finance controller could neither have decided the
 * review it would be named for nor change it now; the head of legal can
 * (`review_legal_update_any_stage`, and `contract_legal_all_head` edits every
 * contract), and is the account the rule already falls back to. 7 of the 23
 * finance reviews sit on such a contract.
 *
 * A business review stays the requester's although a requester cannot change
 * it: `clm_requester` holds `R` on this object (§04), and both seeded business
 * reviews are already decided. The requester sees it on their own contract.
 *
 * Structure only, so `demo-en` and `demo-zh` deal identically, and every name
 * is declared demo staff (`demoStaff`), created by the platform before the
 * seed runs.
 */
export const reviewerOf = (review: ReviewPlan): string => {
  const contract = CONTRACT_PLAN[review.contractIndex]!;
  switch (review.stage) {
    case 'legal':
      return legalOwnerOf(contract) ?? LEGAL_HEAD;
    case 'finance':
      return POST_APPROVAL_STATUSES.includes(contract.status) ? FINANCE_CONTROLLER : LEGAL_HEAD;
    case 'compliance':
      return LEGAL_HEAD;
    case 'business':
      return ownerOf(contract);
  }
};

/**
 * Who filed a contract version (`clm_contract_version.submitted_by`), or
 * `null` for an executed copy.
 *
 * Version 1, our draft, is the launching requester's — what F1 stamps
 * (`current_user.id`) when a requester uploads it or starts from the type's
 * template. Every later version is legal's: there is no counterparty portal,
 * so the other side's markup arrives by email and the contract's lawyer files
 * it (DESIGN.md §03), along with our replies and the clean copy. A contract
 * with no lawyer — a type that skips legal review, or the one handed back to
 * the queue ({@link legalOwnerOf}) — has its later versions filed by the
 * requester, who is then the only person working it.
 *
 * An executed copy names nobody, because neither flow that files one stamps
 * the column: F7 (from a completed signature round) and F16 (a backfill) both
 * leave `submitted_by` empty. A seeded executed copy claims no more than the
 * flow that would have filed it.
 */
export const versionFilerOf = (version: VersionPlan): string | null => {
  if (version.filedBy === null) return null;
  const contract = CONTRACT_PLAN[version.contractIndex]!;
  return version.filedBy === 'owner' ? ownerOf(contract) : (legalOwnerOf(contract) ?? ownerOf(contract));
};

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
