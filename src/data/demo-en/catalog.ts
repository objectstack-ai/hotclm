// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { ClauseStrings, ContractTypeStrings } from '../strings.js';

/**
 * The English configuration catalogue: nine contract types, thirty playbook
 * clauses, six approval-matrix rule names (DESIGN.md §10).
 *
 * English is the source language (DESIGN.md §01). `../demo-zh/catalog.ts`
 * mirrors this file entry for entry; the interface in `../strings.ts` fixes
 * both lengths, so a bundle that drops or adds one does not compile.
 *
 * Nothing here names an industry. The group these contracts belong to is a
 * multi-entity holding company, and its business shows only in counterparty
 * names and descriptions — never in an object, a field, an option value or a
 * label (AGENTS.md, "Industry-neutral, always").
 */
export const CONTRACT_TYPES: readonly ContractTypeStrings[] & { length: 9 } = [
  {
    name: 'Mutual Non-Disclosure Agreement',
    description: 'Two-way confidentiality cover for evaluations, pilots and diligence. No commercial commitment.',
    summary: 'Mutual confidentiality cover with {party} ahead of commercial discussions.',
  },
  {
    name: 'Master Services Agreement',
    description: 'The umbrella terms every statement of work inherits: liability, IP, data protection, termination.',
    summary: 'Umbrella terms governing all engagements with {party}; individual work is ordered under a statement of work.',
  },
  {
    name: 'Statement of Work',
    description: 'Scope, deliverables, milestones and fees for one engagement under a master agreement.',
    summary: 'Scope and milestone schedule for the current engagement with {party}.',
  },
  {
    name: 'Order Form',
    description: 'A subscription or licence order under existing master terms. Quantities, term and price only.',
    summary: 'Subscription order placed with {party} under the existing master terms.',
  },
  {
    name: 'Supplier Agreement',
    description: 'Inbound goods or services: delivery, acceptance, warranty, price review and supplier obligations.',
    summary: 'Supply terms under which {party} delivers to the group, including acceptance and warranty cover.',
  },
  {
    name: 'Data Processing Agreement',
    description: 'Controller-to-processor terms: purpose limitation, sub-processors, transfers, audit and breach notice.',
    summary: 'Processing terms covering personal data shared with {party}, including transfer safeguards.',
  },
  {
    name: 'Lease Agreement',
    description: 'Premises or equipment lease: term, rent, review mechanism, repair, insurance and surrender.',
    summary: 'Lease of premises from {party}, with a fixed term and a scheduled rent review.',
  },
  {
    name: 'Independent Contractor Agreement',
    description: 'Engagement of an individual specialist: deliverables, rate, IP assignment and status warranties.',
    summary: 'Engagement of {party} as an independent specialist, with IP assigned to the group.',
  },
  {
    name: 'Amendment',
    description: 'A change to a contract already in force. Points at the parent contract and changes only what it names.',
    summary: 'Amendment to the agreement in force with {party}, varying the terms it names and nothing else.',
  },
] as const;

/**
 * Thirty clauses covering every `category` of the playbook, each category
 * carrying at least one `high` risk position (DESIGN.md §10).
 *
 * `standardText` is the position the group opens with; `fallbackText` is what
 * legal may concede without escalation; `positionNote` is the line that is not
 * crossed. A deviation record quotes the clause and records which of the three
 * the counterparty landed on.
 */
export const CLAUSES: readonly ClauseStrings[] & { length: 30 } = [
  // ── liability (5) ───────────────────────────────────────────────────────
  {
    title: 'Aggregate liability cap',
    standardText: 'Each party’s total liability under this agreement is limited to the fees paid or payable in the twelve months before the claim.',
    fallbackText: 'The cap may rise to twice the fees paid in the preceding twelve months where the term exceeds two years.',
    positionNote: 'An uncapped general liability is never accepted. A super-cap above 2x requires the head of legal.',
  },
  {
    title: 'Exclusion of indirect loss',
    standardText: 'Neither party is liable for indirect, consequential or special loss, or for loss of profit, revenue or anticipated savings.',
    fallbackText: 'Loss of profit may be recoverable where it flows directly from a deliberate breach.',
    positionNote: 'The exclusion must remain mutual. A one-way exclusion favouring the counterparty is refused.',
  },
  {
    title: 'Uncapped liability carve-outs',
    standardText: 'The cap does not apply to death or personal injury caused by negligence, fraud, or a party’s indemnity for third-party IP claims.',
    fallbackText: 'A confidentiality breach may be added to the carve-outs where the exposure is genuinely symmetrical.',
    positionNote: 'Adding data-protection losses to the uncapped carve-outs is a head-of-legal decision, never a negotiator’s.',
  },
  {
    title: 'Indemnity for third-party IP claims',
    standardText: 'The supplier indemnifies the customer against claims that the deliverables infringe a third party’s intellectual property.',
    fallbackText: 'The indemnity may be conditioned on prompt notice and sole conduct of the defence.',
    positionNote: 'An indemnity capped below the general liability cap is not an indemnity; refuse it.',
  },
  {
    title: 'Insurance cover',
    standardText: 'Each party maintains professional indemnity and public liability cover appropriate to the value of the engagement.',
    fallbackText: 'Evidence of cover may be provided annually rather than on each request.',
    positionNote: 'Self-insurance in place of a policy is accepted only from a counterparty of investment grade.',
  },
  // ── payment (4) ─────────────────────────────────────────────────────────
  {
    title: 'Payment terms',
    standardText: 'Undisputed invoices are payable within thirty days of receipt of a valid invoice.',
    fallbackText: 'Sixty days is available to counterparties whose own terms are demonstrably longer.',
    positionNote: 'Beyond ninety days the finance controller must approve the working-capital impact.',
  },
  {
    title: 'Late payment interest',
    standardText: 'Interest accrues on overdue sums at the statutory rate from the due date until payment.',
    fallbackText: 'A grace period of ten business days before interest starts is acceptable.',
    positionNote: 'A waiver of all interest removes the only lever on a slow payer; do not agree it.',
  },
  {
    title: 'Price review',
    standardText: 'Prices are fixed for the first twelve months and may then be adjusted once a year by published inflation.',
    fallbackText: 'An index other than the published national measure may be used if it is public and verifiable.',
    positionNote: 'An uncapped annual increase at the supplier’s discretion is a high-risk position; escalate it.',
  },
  {
    title: 'Set-off',
    standardText: 'The customer may set off any sum owed by the supplier against sums payable under this agreement.',
    fallbackText: 'Set-off may be limited to undisputed and quantified sums.',
    positionNote: 'A complete prohibition on set-off is refused where the group is the paying party.',
  },
  // ── termination (4) ─────────────────────────────────────────────────────
  {
    title: 'Termination for convenience',
    standardText: 'Either party may terminate for convenience on ninety days’ written notice.',
    fallbackText: 'The notice period may extend to one hundred and eighty days where the supplier has invested in dedicated capacity.',
    positionNote: 'A term with no exit for convenience at all needs the head of legal and a documented reason.',
  },
  {
    title: 'Termination for material breach',
    standardText: 'Either party may terminate on notice if the other commits a material breach and fails to remedy it within thirty days.',
    fallbackText: 'The remedy period may extend to forty-five days for a breach that is capable of remedy.',
    positionNote: 'A remedy period longer than sixty days makes the right theoretical; refuse it.',
  },
  {
    title: 'Effect of termination',
    standardText: 'On termination the supplier returns or deletes group materials and provides reasonable exit assistance for sixty days.',
    fallbackText: 'Exit assistance may be chargeable at the rates in force immediately before termination.',
    positionNote: 'No exit assistance at all is a high-risk position for any operational service.',
  },
  {
    title: 'Automatic renewal',
    standardText: 'The term renews for successive twelve-month periods unless either party gives sixty days’ notice.',
    fallbackText: 'A ninety-day notice window is acceptable where the service is deeply integrated.',
    positionNote: 'An auto-renewal with a notice window shorter than thirty days is refused.',
  },
  // ── confidentiality (4) ─────────────────────────────────────────────────
  {
    title: 'Confidentiality obligation',
    standardText: 'Each party keeps the other’s confidential information confidential and uses it only for the purpose of this agreement.',
    fallbackText: 'Disclosure to professional advisers under equivalent obligations is permitted.',
    positionNote: 'A one-way obligation is accepted only where the group discloses nothing.',
  },
  {
    title: 'Confidentiality survival',
    standardText: 'Confidentiality obligations survive for three years after the agreement ends, and indefinitely for trade secrets.',
    fallbackText: 'Two years is acceptable for information with a short commercial life.',
    positionNote: 'A survival period under twelve months does not protect anything worth protecting.',
  },
  {
    title: 'Permitted disclosure',
    standardText: 'A party may disclose confidential information where required by law, giving notice where it is lawful to do so.',
    fallbackText: 'Notice may be waived where a regulator prohibits it.',
    positionNote: 'A right to disclose to any affiliate without an equivalent obligation is refused.',
  },
  {
    title: 'Return of materials',
    standardText: 'On request each party returns or destroys the other’s confidential information and confirms it has done so.',
    fallbackText: 'Archived copies retained by automated backup may be kept until routine deletion.',
    positionNote: 'A blanket right to retain everything "for record-keeping" is a high-risk position.',
  },
  // ── ip (4) ──────────────────────────────────────────────────────────────
  {
    title: 'Ownership of deliverables',
    standardText: 'Intellectual property in bespoke deliverables vests in the customer on payment.',
    fallbackText: 'The supplier may retain ownership and grant a perpetual, irrevocable licence instead.',
    positionNote: 'A licence limited to the term for bespoke work is refused; the group has paid for it.',
  },
  {
    title: 'Background intellectual property',
    standardText: 'Each party keeps its pre-existing intellectual property; a licence is granted only so far as the deliverables need it.',
    fallbackText: 'A wider licence may be granted for internal business use across the group.',
    positionNote: 'An assignment of background IP is never agreed.',
  },
  {
    title: 'Feedback and improvements',
    standardText: 'Feedback may be used freely by the supplier, but confers no rights over the customer’s data or materials.',
    fallbackText: 'Attribution may be waived where the feedback is anonymised.',
    positionNote: 'A clause converting group data into supplier IP is a high-risk position; escalate it.',
  },
  {
    title: 'Open-source components',
    standardText: 'The supplier discloses open-source components and warrants that no copyleft licence attaches to the deliverables.',
    fallbackText: 'Copyleft components may be used where they remain separable and are disclosed in writing.',
    positionNote: 'Undisclosed copyleft in a deliverable is grounds to refuse acceptance.',
  },
  // ── warranty (3) ────────────────────────────────────────────────────────
  {
    title: 'Service warranty',
    standardText: 'Services are performed with reasonable skill and care by suitably qualified personnel.',
    fallbackText: 'A defined remediation period may replace a strict conformity warranty.',
    positionNote: 'An "as is" disclaimer on a paid service is refused.',
  },
  {
    title: 'Compliance with law',
    standardText: 'Each party complies with the laws applicable to its performance, including sanctions and anti-bribery law.',
    fallbackText: 'A specific compliance schedule may replace the general undertaking.',
    positionNote: 'Removing the sanctions and anti-bribery undertakings is a high-risk position; escalate it.',
  },
  {
    title: 'Acceptance testing',
    standardText: 'Deliverables are accepted when they pass the agreed acceptance criteria, or after fifteen days of unnotified use.',
    fallbackText: 'Deemed acceptance may run from delivery where no criteria were agreed.',
    positionNote: 'Deemed acceptance on delivery, with no test window at all, is refused.',
  },
  // ── dispute (3) ─────────────────────────────────────────────────────────
  {
    title: 'Governing law',
    standardText: 'This agreement is governed by the law of the contracting entity’s jurisdiction.',
    fallbackText: 'A neutral third jurisdiction may be agreed where neither party will concede.',
    positionNote: 'A jurisdiction with no enforcement treaty with the contracting entity is a high-risk position.',
  },
  {
    title: 'Dispute escalation',
    standardText: 'Disputes are escalated to senior representatives of each party before any proceedings are issued.',
    fallbackText: 'The escalation window may be shortened to fifteen days for time-critical disputes.',
    positionNote: 'An escalation ladder longer than sixty days delays enforcement past usefulness.',
  },
  {
    title: 'Arbitration',
    standardText: 'Disputes not resolved by escalation are finally settled by arbitration under the rules of a recognised institution.',
    fallbackText: 'Court jurisdiction may replace arbitration where both parties sit in the same legal system.',
    positionNote: 'Ad hoc arbitration with no institutional rules is refused.',
  },
  // ── other (3) ───────────────────────────────────────────────────────────
  {
    title: 'Assignment and change of control',
    standardText: 'Neither party may assign without consent, which is not unreasonably withheld; group reorganisations are permitted.',
    fallbackText: 'Assignment to a purchaser of substantially the whole business may be permitted on notice.',
    positionNote: 'A free right to assign to a competitor of the group is a high-risk position; escalate it.',
  },
  {
    title: 'Subcontracting',
    standardText: 'The supplier remains responsible for subcontractors and notifies the customer before appointing one.',
    fallbackText: 'Notice may be given quarterly in a schedule rather than case by case.',
    positionNote: 'Unrestricted subcontracting without responsibility is refused.',
  },
  {
    title: 'Force majeure',
    standardText: 'Neither party is liable for failure caused by an event beyond its reasonable control, provided it mitigates and gives notice.',
    fallbackText: 'A termination right after ninety days of continued force majeure may be added.',
    positionNote: 'Payment obligations are never suspended by force majeure.',
  },
] as const;

/**
 * The six approval rules of DESIGN.md §10: three amount bands, each with and
 * without an accepted deviation. Only the NAMES are localised; the bands, the
 * flags and the priorities are structure and live in `../plan.ts`.
 */
export const APPROVAL_RULES: readonly string[] & { length: 6 } = [
  'Band A — up to 50,000, no deviation',
  'Band A — up to 50,000, with deviation',
  'Band B — 50,000 to 500,000, no deviation',
  'Band B — 50,000 to 500,000, with deviation',
  'Band C — above 500,000, no deviation',
  'Band C — above 500,000, with deviation',
] as const;
