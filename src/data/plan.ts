// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { assertCount, pick, rng } from './_shared.js';

/**
 * The demo's STRUCTURE — every value that is not a human-readable string.
 *
 * This module never imports a locale bundle and never sees one. Statuses,
 * counts, amounts, day offsets, currencies, routing flags and every
 * parent/child link are decided here, once, and `demo-en` and `demo-zh` run
 * the identical plan through the identical generators. That is what makes the
 * two locales row-for-row identical by CONSTRUCTION rather than by review:
 * they cannot differ in row count, status spread or date, because neither
 * bundle is consulted for any of those.
 *
 * The counts are DESIGN.md §10's table, and {@link assertCount} holds each one
 * at compile time so a plan that drifts fails the build rather than the demo.
 *
 * ## Two properties this plan enforces that a hand-written fixture would not
 *
 * 1. **No row is in a state the write layer would have refused.** A blocked
 *    counterparty never appears on a contract past `draft` (the submission
 *    guard refuses one); an `open` deviation never appears on a contract at
 *    `in_approval` or beyond (the deviation gate refuses that edge); an
 *    obligation or instalment born `overdue` always has a due date in the
 *    past, which is what the daily job of card 09 measures. Seeding is exempt
 *    from those guards — it is a system write — and that is exactly why the
 *    plan has to apply them itself.
 * 2. **Every flow-owned value equals what the flow would have computed.**
 *    {@link routeFlagsFor} re-implements `contract_route`'s matching rules
 *    against {@link APPROVAL_RULE_PLAN} — the same matrix the seed installs —
 *    so a seeded `route_finance` is the matrix's answer, not an opinion.
 */

// ─────────────────────────────────────────── the group and its jurisdictions ─

/**
 * Where a counterparty sits, and what the group contracts with it in.
 *
 * DESIGN.md §10 wants USD, EUR and GBP, with governing law spread across
 * US-NY, England and Wales, and Germany. The mapping is by counterparty
 * country so the spread is a consequence of the customer base rather than a
 * sprinkle: the US parent's customers contract under New York law in dollars,
 * the EU subsidiary's under German law in euro, the APAC and UK book under
 * English law in sterling.
 */
export type CountryCode = 'US' | 'GB' | 'DE' | 'FR' | 'JP' | 'VG' | 'PA';

export interface Jurisdiction {
  readonly governingLaw: string;
  /** Index into the locale bundle's `jurisdictions` tuple. */
  readonly jurisdictionIndex: 0 | 1 | 2;
  readonly currency: 'usd' | 'eur' | 'gbp';
  readonly language: 'en' | 'de';
}

const NEW_YORK: Jurisdiction = { governingLaw: 'US-NY', jurisdictionIndex: 0, currency: 'usd', language: 'en' };
const ENGLAND: Jurisdiction = { governingLaw: 'England and Wales', jurisdictionIndex: 1, currency: 'gbp', language: 'en' };
const GERMANY: Jurisdiction = { governingLaw: 'Germany', jurisdictionIndex: 2, currency: 'eur', language: 'de' };

const JURISDICTION_BY_COUNTRY: Record<CountryCode, Jurisdiction> = {
  US: NEW_YORK,
  GB: ENGLAND,
  DE: GERMANY,
  // Neither the French nor the Japanese counterparty brings a fourth governing
  // law: the group's EU entity contracts under German law and its APAC book
  // under English law, which is the ordinary answer for a group with three
  // signing entities and more than three markets.
  FR: GERMANY,
  JP: ENGLAND,
  // The two blocked counterparties never reach a signed contract, so their
  // jurisdiction is only ever read on a draft.
  VG: NEW_YORK,
  PA: NEW_YORK,
};

// ─────────────────────────────────────────────────── clm_contract_type (9) ──

export interface ContractTypePlan {
  readonly code: string;
  readonly category: 'nda' | 'sales' | 'purchase' | 'service' | 'lease' | 'employment' | 'framework' | 'dpa' | 'amendment' | 'other';
  readonly direction: 'sales' | 'purchase' | 'other';
  readonly requiresLegalReview: boolean;
  readonly executionFormalities: readonly ('countersigned_copy' | 'company_seal' | 'notarized' | 'witnessed')[];
  readonly signMethod: 'esign' | 'wet_ink' | 'either';
  readonly reviewSlaDays: number;
  readonly defaultTermMonths: number;
  readonly retentionYears: number;
  /** Only fields a launching requester may write (clm_contract_type.intake_fields). */
  readonly intakeFields: readonly ('governing_law' | 'payment_terms' | 'confidentiality_term_months' | 'auto_renew' | 'parent_contract')[];
  /** Contract value band, in the contract's own currency. `null` = no value. */
  readonly amountBand: readonly [number, number] | null;
  /** Whether contracts of this type carry an instalment schedule. */
  readonly hasPaymentSchedule: boolean;
  readonly department: 'sales' | 'procurement' | 'legal' | 'finance' | 'operations' | 'people' | 'it' | 'other';
}

export const CONTRACT_TYPE_PLAN: readonly ContractTypePlan[] = [
  { code: 'NDA', category: 'nda',       direction: 'other',    requiresLegalReview: true,  executionFormalities: [],                          signMethod: 'esign',   reviewSlaDays: 3,  defaultTermMonths: 24, retentionYears: 7,  intakeFields: ['governing_law', 'confidentiality_term_months'], amountBand: null,                hasPaymentSchedule: false, department: 'legal' },
  { code: 'MSA', category: 'framework', direction: 'sales',    requiresLegalReview: true,  executionFormalities: ['countersigned_copy'],       signMethod: 'esign',   reviewSlaDays: 5,  defaultTermMonths: 36, retentionYears: 10, intakeFields: ['governing_law', 'payment_terms', 'auto_renew'],  amountBand: [250_000, 4_000_000], hasPaymentSchedule: true,  department: 'sales' },
  { code: 'SOW', category: 'service',   direction: 'sales',    requiresLegalReview: false, executionFormalities: [],                          signMethod: 'esign',   reviewSlaDays: 3,  defaultTermMonths: 12, retentionYears: 10, intakeFields: ['payment_terms', 'parent_contract'],              amountBand: [40_000, 700_000],   hasPaymentSchedule: true,  department: 'sales' },
  { code: 'ORD', category: 'sales',     direction: 'sales',    requiresLegalReview: false, executionFormalities: [],                          signMethod: 'esign',   reviewSlaDays: 2,  defaultTermMonths: 12, retentionYears: 7,  intakeFields: ['payment_terms'],                                 amountBand: [6_000, 95_000],     hasPaymentSchedule: true,  department: 'sales' },
  { code: 'SUP', category: 'purchase',  direction: 'purchase', requiresLegalReview: true,  executionFormalities: ['countersigned_copy'],       signMethod: 'either',  reviewSlaDays: 5,  defaultTermMonths: 24, retentionYears: 10, intakeFields: ['governing_law', 'payment_terms', 'auto_renew'],  amountBand: [30_000, 1_400_000], hasPaymentSchedule: true,  department: 'procurement' },
  { code: 'DPA', category: 'dpa',       direction: 'other',    requiresLegalReview: true,  executionFormalities: ['countersigned_copy'],       signMethod: 'esign',   reviewSlaDays: 5,  defaultTermMonths: 36, retentionYears: 10, intakeFields: ['governing_law'],                                 amountBand: null,                hasPaymentSchedule: false, department: 'legal' },
  { code: 'LSE', category: 'lease',     direction: 'purchase', requiresLegalReview: true,  executionFormalities: ['notarized', 'witnessed'],   signMethod: 'wet_ink', reviewSlaDays: 10, defaultTermMonths: 60, retentionYears: 15, intakeFields: ['governing_law', 'auto_renew'],                   amountBand: [400_000, 2_600_000],hasPaymentSchedule: true,  department: 'operations' },
  { code: 'ICA', category: 'employment',direction: 'purchase', requiresLegalReview: true,  executionFormalities: ['countersigned_copy'],       signMethod: 'esign',   reviewSlaDays: 5,  defaultTermMonths: 12, retentionYears: 7,  intakeFields: ['payment_terms', 'confidentiality_term_months'],  amountBand: [18_000, 140_000],   hasPaymentSchedule: true,  department: 'people' },
  { code: 'AMD', category: 'amendment', direction: 'other',    requiresLegalReview: true,  executionFormalities: ['countersigned_copy'],       signMethod: 'esign',   reviewSlaDays: 3,  defaultTermMonths: 12, retentionYears: 10, intakeFields: ['parent_contract'],                               amountBand: [12_000, 260_000],   hasPaymentSchedule: true,  department: 'legal' },
];
assertCount('clm_contract_type', CONTRACT_TYPE_PLAN.length, 9);

// ───────────────────────────────────────────────────────── clm_clause (30) ──

export interface ClausePlan {
  readonly category: 'liability' | 'payment' | 'termination' | 'confidentiality' | 'ip' | 'warranty' | 'dispute' | 'other';
  readonly riskLevel: 'low' | 'medium' | 'high';
  readonly appliesTo: readonly ContractTypePlan['category'][];
  readonly requiresLegalHead: boolean;
}

const COMMERCIAL: readonly ContractTypePlan['category'][] = ['sales', 'purchase', 'service', 'framework', 'lease', 'employment'];
const EVERYTHING: readonly ContractTypePlan['category'][] = ['nda', 'sales', 'purchase', 'service', 'lease', 'employment', 'framework', 'dpa', 'amendment', 'other'];

/** Positionally paired with the locale bundle's `clauses` array. */
export const CLAUSE_PLAN: readonly ClausePlan[] = [
  { category: 'liability',       riskLevel: 'high',   appliesTo: COMMERCIAL, requiresLegalHead: true },
  { category: 'liability',       riskLevel: 'medium', appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'liability',       riskLevel: 'high',   appliesTo: COMMERCIAL, requiresLegalHead: true },
  { category: 'liability',       riskLevel: 'high',   appliesTo: ['service', 'framework', 'purchase', 'sales'], requiresLegalHead: true },
  { category: 'liability',       riskLevel: 'low',    appliesTo: ['purchase', 'service', 'lease'], requiresLegalHead: false },
  { category: 'payment',         riskLevel: 'low',    appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'payment',         riskLevel: 'low',    appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'payment',         riskLevel: 'high',   appliesTo: ['framework', 'purchase', 'lease'], requiresLegalHead: true },
  { category: 'payment',         riskLevel: 'medium', appliesTo: ['purchase', 'framework'], requiresLegalHead: false },
  { category: 'termination',     riskLevel: 'medium', appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'termination',     riskLevel: 'low',    appliesTo: EVERYTHING, requiresLegalHead: false },
  { category: 'termination',     riskLevel: 'high',   appliesTo: ['service', 'framework', 'purchase'], requiresLegalHead: true },
  { category: 'termination',     riskLevel: 'medium', appliesTo: ['sales', 'service', 'framework', 'purchase'], requiresLegalHead: false },
  { category: 'confidentiality', riskLevel: 'low',    appliesTo: EVERYTHING, requiresLegalHead: false },
  { category: 'confidentiality', riskLevel: 'medium', appliesTo: EVERYTHING, requiresLegalHead: false },
  { category: 'confidentiality', riskLevel: 'medium', appliesTo: EVERYTHING, requiresLegalHead: false },
  { category: 'confidentiality', riskLevel: 'high',   appliesTo: ['nda', 'dpa', 'service', 'framework'], requiresLegalHead: true },
  { category: 'ip',              riskLevel: 'high',   appliesTo: ['service', 'framework', 'employment'], requiresLegalHead: true },
  { category: 'ip',              riskLevel: 'high',   appliesTo: ['service', 'framework', 'employment'], requiresLegalHead: true },
  { category: 'ip',              riskLevel: 'high',   appliesTo: ['service', 'sales', 'framework'], requiresLegalHead: true },
  { category: 'ip',              riskLevel: 'medium', appliesTo: ['service', 'sales', 'framework'], requiresLegalHead: false },
  { category: 'warranty',        riskLevel: 'medium', appliesTo: ['service', 'purchase', 'framework'], requiresLegalHead: false },
  { category: 'warranty',        riskLevel: 'high',   appliesTo: EVERYTHING, requiresLegalHead: true },
  { category: 'warranty',        riskLevel: 'low',    appliesTo: ['service', 'purchase'], requiresLegalHead: false },
  { category: 'dispute',         riskLevel: 'high',   appliesTo: EVERYTHING, requiresLegalHead: true },
  { category: 'dispute',         riskLevel: 'low',    appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'dispute',         riskLevel: 'medium', appliesTo: COMMERCIAL, requiresLegalHead: false },
  { category: 'other',           riskLevel: 'high',   appliesTo: EVERYTHING, requiresLegalHead: true },
  { category: 'other',           riskLevel: 'medium', appliesTo: ['service', 'purchase', 'framework'], requiresLegalHead: false },
  { category: 'other',           riskLevel: 'low',    appliesTo: EVERYTHING, requiresLegalHead: false },
];
assertCount('clm_clause', CLAUSE_PLAN.length, 30);

// ────────────────────────────────────────────────── clm_approval_rule (6) ──

export interface ApprovalRulePlan {
  readonly amountMin: number | null;
  readonly amountMax: number | null;
  readonly onlyWithDeviation: boolean;
  readonly routeLegalHead: boolean;
  readonly routeFinance: boolean;
  readonly routeExecutive: boolean;
  readonly routeGm: boolean;
  readonly priority: number;
}

/**
 * Three amount bands, each with and without an accepted deviation
 * (DESIGN.md §10). Rung 1 — the requester's own manager — is not in the
 * matrix: F5 always climbs it, and the matrix decides only what comes above.
 * Band A without a deviation therefore routes nothing, which is the point of
 * a band: a small, clean contract stops at the line manager.
 */
export const APPROVAL_RULE_PLAN: readonly ApprovalRulePlan[] = [
  { amountMin: 0,       amountMax: 50_000,  onlyWithDeviation: false, routeLegalHead: false, routeFinance: false, routeExecutive: false, routeGm: false, priority: 10 },
  { amountMin: 0,       amountMax: 50_000,  onlyWithDeviation: true,  routeLegalHead: true,  routeFinance: false, routeExecutive: false, routeGm: false, priority: 11 },
  { amountMin: 50_000,  amountMax: 500_000, onlyWithDeviation: false, routeLegalHead: false, routeFinance: true,  routeExecutive: false, routeGm: false, priority: 20 },
  { amountMin: 50_000,  amountMax: 500_000, onlyWithDeviation: true,  routeLegalHead: true,  routeFinance: true,  routeExecutive: false, routeGm: false, priority: 21 },
  { amountMin: 500_000, amountMax: null,    onlyWithDeviation: false, routeLegalHead: false, routeFinance: true,  routeExecutive: true,  routeGm: false, priority: 30 },
  { amountMin: 500_000, amountMax: null,    onlyWithDeviation: true,  routeLegalHead: true,  routeFinance: true,  routeExecutive: true,  routeGm: true,  priority: 31 },
];
assertCount('clm_approval_rule', APPROVAL_RULE_PLAN.length, 6);

export interface RouteFlags {
  readonly route_legal_head: boolean;
  readonly route_finance: boolean;
  readonly route_executive: boolean;
  readonly route_gm: boolean;
}

/**
 * The routing stamp F2 would have written, computed here rather than guessed.
 *
 * `contract.hook.ts`'s `contract_route` reads every active rule whose
 * categories are empty or contain the contract's, whose direction is `any` or
 * equal, whose band contains the amount in `[min, max)`, and — for a
 * `only_with_deviation` rule — that the contract carries an ACCEPTED
 * deviation; the contract climbs the union of their rungs. `route_legal_head`
 * is additionally true when an accepted deviation is on a clause that
 * `requires_legal_head` (F6). Those five sentences are transcribed below.
 *
 * A seeded contract that skipped submission (the backfilled corpus, F16)
 * never met F2, so its flags stay false — which is also what the hook would
 * leave them.
 */
export const routeFlagsFor = (
  amount: number | null,
  acceptedDeviationClauses: readonly ClausePlan[],
): RouteFlags => {
  const value = amount ?? 0;
  const hasAccepted = acceptedDeviationClauses.length > 0;
  const flags = {
    route_legal_head: acceptedDeviationClauses.some((clause) => clause.requiresLegalHead),
    route_finance: false,
    route_executive: false,
    route_gm: false,
  };
  for (const rule of APPROVAL_RULE_PLAN) {
    if (rule.amountMin !== null && value < rule.amountMin) continue;
    if (rule.amountMax !== null && value >= rule.amountMax) continue;
    if (rule.onlyWithDeviation && !hasAccepted) continue;
    if (rule.routeLegalHead) flags.route_legal_head = true;
    if (rule.routeFinance) flags.route_finance = true;
    if (rule.routeExecutive) flags.route_executive = true;
    if (rule.routeGm) flags.route_gm = true;
  }
  return flags;
};

// ────────────────────────────────────────────────────────── clm_party (40) ──

export interface PartyPlan {
  readonly kind: 'company' | 'individual' | 'government' | 'other';
  readonly country: CountryCode;
  readonly riskFlag: 'none' | 'watch' | 'blocked';
  readonly screening: 'not_screened' | 'clear' | 'hit';
  /** Index into the bundle's `riskNotes`, or `null` for a counterparty with no note. */
  readonly riskNoteIndex: 0 | 1 | 2 | null;
  readonly registrationNo: string;
}

const company = (country: CountryCode, registrationNo: string): PartyPlan =>
  ({ kind: 'company', country, riskFlag: 'none', screening: 'clear', riskNoteIndex: null, registrationNo });

/**
 * Positionally paired with the locale bundle's `parties` array — index 0 here
 * describes index 0 there. DESIGN.md §10: customers, suppliers, individuals
 * and public bodies, with exactly two `blocked`.
 */
export const PARTY_PLAN: readonly PartyPlan[] = [
  company('US', 'REG-US-41007'), company('DE', 'HRB-20114'),   company('GB', 'GB-08841207'), company('GB', 'GB-07734118'),
  company('US', 'REG-US-41912'), company('DE', 'HRB-20887'),   company('GB', 'GB-09112044'), company('US', 'REG-US-42330'),
  company('DE', 'HRB-21455'),    company('US', 'REG-US-43117'), company('GB', 'GB-06620931'), company('US', 'REG-US-43901'),
  company('DE', 'HRB-22019'),    company('GB', 'GB-10233874'), company('US', 'REG-US-44508'), company('DE', 'HRB-22740'),
  company('DE', 'HRB-23188'),    company('GB', 'GB-05517402'), company('US', 'REG-US-45220'), company('DE', 'HRB-23902'),
  company('GB', 'GB-04412996'),
  // One counterparty under watch — the finance controller asked to be consulted.
  { kind: 'company', country: 'US', riskFlag: 'watch', screening: 'clear', riskNoteIndex: 2, registrationNo: 'REG-US-45877' },
  company('GB', 'GB-11004623'),  company('DE', 'HRB-24513'),   company('US', 'REG-US-46104'),
  { kind: 'company', country: 'DE', riskFlag: 'none', screening: 'not_screened', riskNoteIndex: null, registrationNo: 'HRB-25077' },
  company('GB', 'GB-09980112'),  company('US', 'REG-US-46833'),
  { kind: 'company', country: 'DE', riskFlag: 'none', screening: 'not_screened', riskNoteIndex: null, registrationNo: 'HRB-25610' },
  company('GB', 'GB-12220458'),
  // 30–35 · individuals engaged as independent contractors
  { kind: 'individual', country: 'US', riskFlag: 'none', screening: 'clear',        riskNoteIndex: null, registrationNo: 'TIN-US-8840112' },
  { kind: 'individual', country: 'GB', riskFlag: 'none', screening: 'clear',        riskNoteIndex: null, registrationNo: 'UTR-GB-4471902' },
  { kind: 'individual', country: 'DE', riskFlag: 'none', screening: 'clear',        riskNoteIndex: null, registrationNo: 'STNR-DE-1180443' },
  { kind: 'individual', country: 'FR', riskFlag: 'none', screening: 'not_screened', riskNoteIndex: null, registrationNo: 'SIRET-FR-77201884' },
  { kind: 'individual', country: 'JP', riskFlag: 'none', screening: 'clear',        riskNoteIndex: null, registrationNo: 'JP-CORP-6011204' },
  { kind: 'individual', country: 'GB', riskFlag: 'none', screening: 'not_screened', riskNoteIndex: null, registrationNo: 'UTR-GB-5590318' },
  // 36–37 · public bodies
  { kind: 'government', country: 'DE', riskFlag: 'none', screening: 'clear', riskNoteIndex: null, registrationNo: 'DE-PUB-HH-0041' },
  { kind: 'government', country: 'US', riskFlag: 'none', screening: 'clear', riskNoteIndex: null, registrationNo: 'US-PUB-MA-0117' },
  // 38–39 · the two blocked counterparties (DESIGN.md §10)
  { kind: 'other', country: 'VG', riskFlag: 'blocked', screening: 'hit', riskNoteIndex: 0, registrationNo: 'VG-OFF-990214' },
  { kind: 'other', country: 'PA', riskFlag: 'blocked', screening: 'hit', riskNoteIndex: 1, registrationNo: 'PA-OFF-330871' },
];
assertCount('clm_party', PARTY_PLAN.length, 40);

/** The jurisdiction the group contracts with this counterparty under. */
export const jurisdictionOf = (partyIndex: number): Jurisdiction =>
  JURISDICTION_BY_COUNTRY[(PARTY_PLAN[partyIndex] as PartyPlan).country];

export { JURISDICTION_BY_COUNTRY, pick, rng };

// ───────────────────────────────────────────── contact details, structural ──

/**
 * The domain half of each counterparty's contact address, and the country
 * dialling code for its phone number.
 *
 * These are STRUCTURE, not prose, and they live here rather than in the locale
 * bundles for one reason: `demo-zh` translates the counterparty's NAME, and an
 * address derived from a translated name would differ between the two locales
 * — which is exactly the row-for-row divergence the split exists to prevent.
 * A demo contact reads the same in both, and the `.example` TLD is the one
 * RFC 2606 reserves so nothing here can resolve to a real mailbox.
 */
const EMAIL_SLUGS: readonly string[] = [
  'aurora-systems', 'northwind-logistics', 'kestrel-analytics', 'solent-mfg',
  'meridian-retail', 'basalt-energy', 'halcyon-media', 'cobalt-pharma',
  'verdant-agri', 'stratus-cloud', 'lantern-financial', 'ironwood-construction',
  'pelagic-shipping', 'quillon-software', 'sable-insurance', 'tidewater-hospitality',
  'granite-facilities', 'beacon-print', 'vantage-staffing', 'corvus-security',
  'alder-legal', 'copperfield-travel', 'willow-catering', 'harborline-freight',
  'pinnacle-hardware', 'fernway-cleaning', 'bramble-supplies', 'onyx-datacentres',
  'summit-translation', 'redwood-recruitment',
  'm-lindgren', 'a-bello', 'h-sundberg', 'c-beauchamp', 'd-aoki', 'g-mbeki',
  'port-hamburg', 'ma-transit', 'ridgemont-trading', 'delta-ridge',
];
assertCount('clm_party (email slugs)', EMAIL_SLUGS.length, 40);

const DIALLING_CODE: Record<CountryCode, string> = {
  US: '+1 617 555', GB: '+44 20 7946', DE: '+49 40 5550', FR: '+33 1 7020',
  JP: '+81 3 5555', VG: '+1 284 555', PA: '+507 300',
};

export const contactEmailFor = (partyIndex: number): string =>
  `contact@${EMAIL_SLUGS[partyIndex]}.example`;

export const contactPhoneFor = (partyIndex: number): string =>
  `${DIALLING_CODE[(PARTY_PLAN[partyIndex] as PartyPlan).country]} ${String(1000 + partyIndex * 7).slice(-4)}`;

/**
 * A demo bank account number. Shaped per country so the field looks like what
 * it holds, and masked for `clm_requester` and `clm_records` by the field-level
 * security of DESIGN.md §04 — which is the reason to seed it at all: an empty
 * column proves nothing about a mask.
 */
export const bankAccountFor = (partyIndex: number): string => {
  const party = PARTY_PLAN[partyIndex] as PartyPlan;
  const tail = String(10_000_000 + partyIndex * 137);
  switch (party.country) {
    case 'DE': return `DE89 3704 0044 ${tail.slice(0, 4)} ${tail.slice(4)}`;
    case 'GB': return `GB29 NWBK 6016 1331 ${tail.slice(0, 4)}`;
    case 'FR': return `FR14 2004 1010 0505 ${tail.slice(0, 4)}`;
    case 'JP': return `JP-0001-${tail}`;
    default:   return `****${tail.slice(-4)}`;
  }
};
