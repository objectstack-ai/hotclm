// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The shape both locale bundles satisfy — `src/data/demo-en/` (the source
 * language) and `src/data/demo-zh/` (its translation).
 *
 * ## Why this is a TYPE and not a lookup table
 *
 * DESIGN.md §10 asks for a `demo-zh` that is "同构" with `demo-en`, and the
 * card sharpens it: row-for-row identical, only the human-readable strings
 * differ. There are two ways to get there.
 *
 * The first is a translation MAP keyed on the English string, resolved at
 * fixture-build time, which is what Duly does. It catches a missing
 * translation, but only when the line is reached, and only at runtime.
 *
 * The second is this: one set of GENERATORS that never sees a locale, fed a
 * bundle whose shape is fixed by an interface. Row-for-row identity is then
 * structural — both locales run the same plan through the same generators, so
 * they cannot produce different row counts, a different status spread or
 * different dates even in principle — and a missing or extra translation is a
 * TYPE error at `pnpm typecheck`, before anything is compiled or booted.
 *
 * The fixed-length tuples below are the other half of that. `readonly
 * [string, ...]` of a declared length means a bundle that translates 39 of the
 * 40 counterparties does not compile; a plain `readonly string[]` would have
 * failed at boot with an index out of range, or worse, silently reused a name.
 */

/** Exactly `N` strings — a bundle with the wrong number does not compile. */
type Strings<N extends number> = readonly string[] & { length: N };

export interface ContractTypeStrings {
  readonly name: string;
  readonly description: string;
  /** One sentence, `{party}` substituted with the counterparty's name. */
  readonly summary: string;
}

export interface ClauseStrings {
  readonly title: string;
  readonly standardText: string;
  readonly fallbackText: string;
  readonly positionNote: string;
}

export interface PartyStrings {
  readonly name: string;
  readonly legalRepresentative: string;
  readonly contactName: string;
  readonly address: string;
  readonly bankName: string;
}

export interface DemoStrings {
  /** DESIGN.md §10: nine contract types. */
  readonly contractTypes: readonly ContractTypeStrings[] & { length: 9 };
  /** DESIGN.md §10: thirty playbook clauses. */
  readonly clauses: readonly ClauseStrings[] & { length: 30 };
  /** DESIGN.md §10: six approval-matrix rules. */
  readonly approvalRules: Strings<6>;
  /** DESIGN.md §10: forty counterparties. */
  readonly parties: readonly PartyStrings[] & { length: 40 };
  /** Risk notes for the two `blocked` and the `watch` counterparties. */
  readonly riskNotes: Strings<3>;
  /** Distinguishes two contracts of the same type with the same counterparty. */
  readonly titleQualifiers: Strings<8>;
  /** Obligation titles, drawn per `kind`. */
  readonly obligationTitles: {
    readonly deliverable: Strings<6>;
    readonly payment: Strings<4>;
    readonly report: Strings<4>;
    readonly renewal: Strings<3>;
    readonly compliance: Strings<4>;
    readonly other: Strings<3>;
  };
  /** Payment-instalment release conditions. */
  readonly paymentConditions: Strings<6>;
  /** Reviewer comments, visible to the requester. */
  readonly reviewComments: Strings<8>;
  /** Legal's internal notes — field-level security hides these from the requester. */
  readonly reviewInternalNotes: Strings<6>;
  /** What the counterparty asked to change. */
  readonly deviationTexts: Strings<8>;
  /** Why the requester is asking for it. */
  readonly deviationJustifications: Strings<6>;
  /** Notes on a signature round. */
  readonly signatureNotes: Strings<4>;
  /**
   * Why each of the four `terminated` contracts was ended early.
   *
   * `clm_contract.termination_reason` is `requiredWhen` the status is
   * `terminated` (decision #6, ruled A on 2026-09-09), and ADR-0113's
   * transition gate refuses "an INSERT born inside the gate" — so a seeded
   * `terminated` row with no reason is REFUSED, not merely incomplete.
   * Measured before this existed: 4 contracts and their child rows were lost
   * from the fixture with `ValidationError: Termination Reason is required`
   * while the seed reported success for everything else.
   */
  readonly terminationReasons: Strings<4>;
  /** Version-negotiation notes, kept for the day versions can be seeded. */
  readonly jurisdictions: Strings<3>;
}
