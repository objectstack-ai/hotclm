// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { Deviation } from '../objects/deviation.object.js';
import { Review } from '../objects/review.object.js';
import { Signature } from '../objects/signature.object.js';

import { dayOffset } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { DEMO_USER, titleOfIndex } from './keys.js';
import { CONTRACT_PLAN, DEVIATION_PLAN, typeOf } from './plan-contracts.js';
import { REVIEW_PLAN, SIGNATURE_PLAN } from './plan-children.js';
import { contactEmailFor } from './plan.js';

/**
 * What negotiation leaves behind: 60 reviews, 25 deviations and 30 signature
 * rounds (DESIGN.md §10).
 *
 * ## `clm_review.reviewer` is why `pnpm demo` boots twice
 *
 * `reviewer` is `required: true` and is a `user` reference the loader resolves
 * against `sys_user.name`. The declarative seed runs BEFORE the dev admin is
 * minted — measured on 17.3.0: the seed's last write lands at T, the admin
 * account is created at T+1.8s — so on a first boot the name resolves to
 * nothing, the loader defers the column, and the engine refuses the row:
 *
 *     WARN  [SeedLoader] clm_review.reviewer is `required: true`, but record #1
 *           defers it to pass 2: 'Dev Admin' names no sys_user that exists yet.
 *     ERROR [SeedLoader] Failed to write clm_review record #1: Reviewer is required
 *
 * DESIGN.md §10 forbids seeding users, so the fixture cannot supply one. What
 * it can do is arrange for the account to already exist, which is what
 * `scripts/demo.mjs` does: a quiet priming boot with the seed OFF mints the
 * dev admin and founds the organization, then the real boot seeds against a
 * database where `Dev Admin` resolves in pass 1. Measured on the same
 * database: 13 ok / 4 errors on the first boot became 14 ok / 2 errors on the
 * second, with the review row landing and its `display_name` mirror reading
 * "Finance · Dev Admin".
 *
 * Every seeded reviewer is therefore the demo account itself. That is honest —
 * it is the only user in the database — and the README says which positions to
 * create and reassign to before the demo means anything as a permissions story.
 */

export const reviewSeed = defineSeed(Review, {
  externalId: ['contract', 'stage'],
  mode: 'upsert',
  records: REVIEW_PLAN.map((review) => ({
    contract: titleOfIndex(review.contractIndex),
    reviewer: DEMO_USER,
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
    decided_by: deviation.status === 'open' ? null : DEMO_USER,
    decided_at: deviation.decidedAt === null ? null : dayOffset(deviation.decidedAt),
  })),
});

/**
 * 30 signature rounds. `signers` is the §03 JSON shape — one row per
 * signatory, our side first — and `executed_file` is left empty for the same
 * reason `clm_contract_version` is not seeded at all: a `file` value is a
 * `sys_file` id minted by an upload, and a seeded placeholder would be a
 * download that 404s.
 */
export const signatureSeed = defineSeed(Signature, {
  externalId: ['contract', 'method'],
  mode: 'upsert',
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
      completed_at: signedAt,
      notes: STRINGS.signatureNotes[signature.noteIndex]!,
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
