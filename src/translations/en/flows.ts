/**
 * Screen-flow copy: the intake wizard (F1, `contract_intake`) — the flow's own
 * label, each screen's heading, and each field's label and placeholder.
 *
 * English is the source: every string here is the one authored inline in
 * `src/flows/contract-intake.flow.ts`, mirrored so the two bundles carry the
 * same keys. Addressed under the flow that owns it
 * (`flows.<flow>.screens.<node_id>`), as `TranslationDataSchema.flows` spells
 * it.
 */
import type { TranslationData } from '@objectstack/spec/system';
import { catalog } from './objects.catalog.js';
import { contract } from './objects.contract.js';

// A select screen field draws its options from the object field it asks for
// (`optionsOf()` in the flow), so its option words are that field's words.
const contractOptions = (field: string) => contract.clm_contract!.fields![field]!.options!;

export const flowSurface: Pick<TranslationData, 'flows'> = {
  flows: {
    contract_intake: {
      label: 'Launch Contract',
      successMessage: 'Contract launched.',
      screens: {
        screen_core: {
          title: 'Contract details',
          description: 'The core terms every contract carries, then the fields this contract type asks for.',
          fields: {
            intakeFields: { label: 'Intake fields' },
            title: { label: 'Title', placeholder: 'e.g. Mutual NDA with Acme' },
            amount: { label: 'Contract amount' },
            currency_code: { label: 'Currency', options: contractOptions('currency_code') },
            is_amount_estimated: { label: 'Amount is an estimate' },
            start_date: { label: 'Start date' },
            end_date: { label: 'End date' },
            term_months: { label: 'Term (months)', placeholder: 'Instead of an end date' },
            summary: { label: 'Summary', placeholder: 'What the deal is, in a few sentences' },
            governing_law: { label: 'Governing law', placeholder: 'e.g. US-NY, England and Wales' },
            payment_terms: { label: 'Payment terms', options: contractOptions('payment_terms') },
            confidentiality_term_months: { label: 'Confidentiality term (months)' },
            auto_renew: { label: 'Auto-renews' },
            parent_contract: { label: 'Parent contract (record id)', placeholder: 'The framework or main contract this one sits under' },
          },
        },
        screen_party: {
          title: 'New counterparty',
          description: 'No counterparty was picked. Create one here — legal keeps its risk flag and screening up to date afterwards.',
          fields: {
            new_party_name: { label: 'Name' },
            new_party_kind: { label: 'Kind', options: catalog.clm_party!.fields!.party_kind!.options! },
            new_party_registration_no: { label: 'Registration / tax ID' },
            new_party_contact_name: { label: 'Contact name' },
            new_party_contact_email: { label: 'Contact email' },
          },
        },
        screen_document: {
          title: 'First version',
          // The screen reads its sentence from the run: the type's template
          // decides which of two `templateNote` assignments it shows.
          description: '{{ templateNote }}',
          fields: {
            templateAvailable: { label: 'Template available' },
            draft_from_template: { label: 'Draft from template' },
          },
        },
        screen_upload: {
          title: 'Upload the first version',
          description: 'The document this contract starts from. It becomes version 1.',
        },
        screen_schedule: {
          title: 'Submit the contract',
          description: 'Choose whether to submit now. Submitting routes the contract to legal review or to approval, as its type decides.',
          fields: {
            submit_now: { label: 'Submit now' },
          },
        },
      },
    },
    contract_approval: {
      label: 'Contract Approval Ladder',
      approvals: {
        manager_review: { label: 'Direct Manager' },
        legal_finance_joint: { label: 'Head of Legal + Finance Controller (会签)' },
        legal_only: { label: 'Head of Legal' },
        finance_only: { label: 'Finance Controller' },
        executive_signoff: { label: 'Executive' },
        gm_signoff: { label: 'General Manager' },
      },
    },
  },
};
