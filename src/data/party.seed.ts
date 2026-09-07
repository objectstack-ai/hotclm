// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineSeed } from '@objectstack/spec/data';

import { Party } from '../objects/party.object.js';

import { dayOffset, assertUniqueKeys } from './_shared.js';
import { STRINGS } from './demo-locale.js';
import { PARTY_PLAN, bankAccountFor, contactEmailFor, contactPhoneFor } from './plan.js';

/**
 * Forty counterparties (DESIGN.md §10), two of them `blocked`.
 *
 * `contact_phone` and `bank_account` are seeded deliberately rather than left
 * empty: DESIGN.md §04 masks both from `clm_requester` and `clm_records`, and
 * an empty column proves nothing about a mask. A demo where the field-level
 * security can be SEEN working is the point of seeding them.
 *
 * The two blocked counterparties are the other measurable thing in this file.
 * `contract_state_machine` refuses to submit a contract whose counterparty is
 * blocked, and `clm_contract.party` hides them from the picker — so the plan
 * keeps their contracts in `draft` and `cancelled`, and the guard can be
 * demonstrated by trying to submit one.
 */
assertUniqueKeys('clm_party', STRINGS.parties.map((party) => party.name));
assertUniqueKeys('clm_party (registration_no)', PARTY_PLAN.map((party) => party.registrationNo));

export const partySeed = defineSeed(Party, {
  externalId: 'name',
  mode: 'upsert',
  records: PARTY_PLAN.map((party, i) => ({
    name: STRINGS.parties[i]!.name,
    party_kind: party.kind,
    country_code: party.country,
    registration_no: party.registrationNo,
    legal_representative: STRINGS.parties[i]!.legalRepresentative,
    address: STRINGS.parties[i]!.address,
    contact_name: STRINGS.parties[i]!.contactName,
    contact_phone: contactPhoneFor(i),
    contact_email: contactEmailFor(i),
    bank_name: STRINGS.parties[i]!.bankName,
    bank_account: bankAccountFor(i),
    risk_flag: party.riskFlag,
    risk_note: party.riskNoteIndex === null ? null : STRINGS.riskNotes[party.riskNoteIndex]!,
    screening_status: party.screening,
    // A counterparty that has never been screened has no screening date; one
    // that has, was screened at some point in the last year.
    screened_at: party.screening === 'not_screened' ? null : dayOffset(-(20 + ((i * 13) % 320))),
    is_active: party.riskFlag !== 'blocked',
  })),
});
