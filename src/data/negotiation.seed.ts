// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { ContractVersion } from '../objects/contract-version.object.js';
import { Deviation } from '../objects/deviation.object.js';
import { Review } from '../objects/review.object.js';
import { Signature } from '../objects/signature.object.js';

import { dayOffset, fixtureFile } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { DEMO_USER, deviationDeciderOf, reviewerOf, titleOfIndex, versionFilerOf } from './keys.js';
import { CONTRACT_PLAN, DEVIATION_PLAN, typeOf } from './plan-contracts.js';
import { REVIEW_PLAN, SIGNATURE_PLAN, VERSION_PLAN } from './plan-children.js';
import { contactEmailFor } from './plan.js';

/**
 * What negotiation leaves behind: 300 contract versions, 60 reviews, 25
 * deviations and 30 signature rounds (DESIGN.md §10).
 *
 * ## `clm_review.reviewer` names the desk that decides the review
 *
 * `reviewer` is `required: true` and is a `user` reference the loader resolves
 * against `sys_user.name`, so a name no account carries costs the whole row.
 * Until #186 every review named the dev admin for that reason: it was the only
 * account at seed time, and `scripts/demo.mjs` primed it and checked its name
 * before the demo boot seeded anything. Since #28 (PR #171) the demo staff
 * (`demoStaff`) are created by the platform on the demo boot before the seed
 * runs, so each review is dealt to the person whose stage it is —
 * {@link reviewerOf} carries the rule and where it bends.
 */

/**
 * 300 contract versions, each holding a real demo document (`seedFile`, see
 * `_shared.ts`); which contract gets how many, of what kind, and which one is
 * current is {@link VERSION_PLAN} in `plan-children.ts`.
 *
 * Matched on `(contract, version_no)`, the object's own unique index.
 *
 * `is_current` is written when the seed CREATES a version and left alone after
 * that (`applyOn: 'create'`, the #41 treatment). Once a version exists the
 * flag is `contract_version_current`'s (#96): adding a version moves it onto
 * the new one. A re-run that re-asserted the fixture's flag would move it back
 * onto the fixture's version — and the hook would then un-mark the newer one —
 * walking a negotiation back to where the seed left it. `file` stays `always`:
 * the platform keeps a row's file on a re-run when the fixture is unchanged, so
 * a re-run stores nothing new.
 */
export const contractVersionSeed = defineSeed(ContractVersion, {
  externalId: ['contract', 'version_no'],
  mode: 'upsert',
  columns: {
    is_current: { applyOn: 'create' },
  },
  records: VERSION_PLAN.map((version) => {
    const contract = CONTRACT_PLAN[version.contractIndex]!;
    const notes = version.kind !== 'final_signed'
      ? STRINGS.versionNotes[version.kind]
      : contract.backfilled ? STRINGS.versionNotes.final_signed_backfill : STRINGS.versionNotes.final_signed_round;
    return {
      contract: titleOfIndex(version.contractIndex),
      version_no: version.versionNo,
      kind: version.kind,
      turn: version.turn,
      is_current: version.isCurrent,
      file: fixtureFile(version.kind, `v${version.versionNo}-${version.kind.replace(/_/g, '-')}.pdf`),
      submitted_by: versionFilerOf(version),
      notes,
    };
  }),
});

/**
 * 60 reviews, matched on `(contract, stage)`.
 *
 * `reviewer` is NOT `applyOn: 'create'`: like `legal_owner` and `owner_id`
 * (`contract.seed.ts`) it is how the book is dealt to the demo staff, so a
 * re-run re-deals it — which is also what moves the reviews of a database
 * seeded before #186 off the dev admin. `review_display_name` re-stamps the
 * `"<stage> · <reviewer>"` mirror on that write. Measured on 18.2.0: three
 * reviews reassigned to the dev admin read `Legal · Legal Counsel 1`,
 * `Finance · Finance Controller` and `Business · Business Requester 2` again
 * after one more `pnpm demo:zh`, and the re-run refused no row.
 *
 * `decision` and `decided_at` are not `applyOn: 'create'` either, so a re-run
 * puts a review someone decided back to the fixture's decision; the README
 * says so beside the deviations and signature rounds that share the limit.
 */
export const reviewSeed = defineSeed(Review, {
  externalId: ['contract', 'stage'],
  mode: 'upsert',
  records: REVIEW_PLAN.map((review) => ({
    contract: titleOfIndex(review.contractIndex),
    reviewer: reviewerOf(review),
    stage: review.stage,
    decision: review.decision,
    risk_level_assessed: review.riskLevelAssessed,
    comments: STRINGS.reviewComments[review.commentIndex]!,
    internal_note: review.internalNoteIndex === null ? null : STRINGS.reviewInternalNotes[review.internalNoteIndex]!,
    started_at: dayOffset(review.startedAt),
    decided_at: review.decidedAt === null ? null : dayOffset(review.decidedAt),
  })),
});

/**
 * 25 deviations, 8 still open — and every one of the eight sits on a contract
 * in `in_review`, because `deviation_gate` (F6) refuses the edge into
 * `in_approval` while any deviation is open. A seed is exempt from that gate;
 * the plan applies it anyway, so no seeded row is in a state the write layer
 * would have refused.
 *
 * The same rule decides `decided_by`: `deviation_state_machine` stamps the
 * acting user on any decision that leaves the column empty, so a decided
 * deviation always names a decider and an open one never does. WHICH lawyer it
 * names is {@link deviationDeciderOf}, and it is a lawyer because §04 gives
 * `clm_legal` the only non-admin `U` on this object.
 */
export const deviationSeed = defineSeed(Deviation, {
  externalId: ['contract', 'clause'],
  mode: 'upsert',
  records: DEVIATION_PLAN.map((deviation) => ({
    contract: titleOfIndex(deviation.contractIndex),
    clause: STRINGS.clauses[deviation.clauseIndex]!.title,
    deviation_text: STRINGS.deviationTexts[deviation.textIndex]!,
    requested_position: deviation.requestedPosition,
    justification: STRINGS.deviationJustifications[deviation.justificationIndex]!,
    status: deviation.status,
    decided_by: deviationDeciderOf(deviation),
    decided_at: deviation.decidedAt === null ? null : dayOffset(deviation.decidedAt),
  })),
});

/**
 * 30 signature rounds. `signers` is the §03 JSON shape — one row per
 * signatory, our side first.
 *
 * `executed_file` holds the demo executed copy on the 24 completed rounds —
 * the same document their contract's `final_signed` version holds, which is
 * the version F7 files from this column — and is empty on the six still out
 * for signature, where nothing has come back yet. It is written when the seed
 * CREATES the round and left alone after that (`applyOn: 'create'`, the #41
 * treatment): the records desk attaches the executed copy to an open round, and
 * a re-run that wrote the fixture's empty value back would delete it.
 */
export const signatureSeed = defineSeed(Signature, {
  externalId: ['contract', 'method'],
  mode: 'upsert',
  columns: {
    executed_file: { applyOn: 'create' },
  },
  records: SIGNATURE_PLAN.map((signature) => {
    const contract = CONTRACT_PLAN[signature.contractIndex]!;
    const party = STRINGS.parties[contract.partyIndex]!;
    const signedAt = signature.completedAt === null ? null : dayOffset(signature.completedAt);
    const signers = [
      {
        side: 'our',
        name: DEMO_USER,
        email: 'admin@objectos.ai',
        order: 1,
        status: signature.status === 'completed' ? 'signed' : 'sent',
        signed_at: signature.status === 'completed' ? signedAt : null,
      },
      {
        side: 'counterparty',
        name: party.legalRepresentative,
        email: contactEmailFor(contract.partyIndex),
        order: 2,
        status: signature.status === 'completed' ? 'signed' : 'sent',
        signed_at: signature.status === 'completed' ? signedAt : null,
      },
    ];
    if (signature.signerCount === 3) {
      signers.push({
        side: 'counterparty',
        name: party.contactName,
        email: contactEmailFor(contract.partyIndex),
        order: 3,
        status: signature.status === 'completed' ? 'signed' : 'sent',
        signed_at: signature.status === 'completed' ? signedAt : null,
      });
    }
    return {
      contract: titleOfIndex(signature.contractIndex),
      method: signature.method,
      provider: signature.provider,
      envelope_id: signature.provider === null ? null : `ENV-${String(70_000 + signature.contractIndex * 13)}`,
      signers,
      status: signature.status,
      formalities_done: [...signature.formalitiesDone],
      executed_file: signature.status === 'completed' ? fixtureFile('final_signed', 'executed-copy.pdf') : null,
      completed_at: signedAt,
    };
  }),
});

/**
 * Proven at compile time: a completed round covers every execution formality
 * its type asks for. That is the second half of the `signing → active` guard
 * in DESIGN.md §03, and a seeded row that failed it would be a contract the
 * state machine would never have let into `active`.
 */
for (const signature of SIGNATURE_PLAN) {
  if (signature.status !== 'completed') continue;
  const required = typeOf(CONTRACT_PLAN[signature.contractIndex]!).executionFormalities;
  const missing = required.filter((formality) => !signature.formalitiesDone.includes(formality));
  if (missing.length > 0) {
    throw new Error(
      `demo fixture: completed signature round on contract #${signature.contractIndex} is missing ` +
        `execution formalities ${missing.join(', ')}, so its contract could not have reached active.`,
    );
  }
}
