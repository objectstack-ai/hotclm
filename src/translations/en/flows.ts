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

export const flowSurface: Pick<TranslationData, 'flows'> = {
  flows: {
    contract_intake: {
      label: 'Launch Contract',
      screens: {
        screen_core: {
          title: 'Contract details',
          fields: {
            intakeFields: { label: 'Intake fields' },
            title: { label: 'Title', placeholder: 'e.g. Mutual NDA with Acme' },
            our_entity: { label: 'Our signing entity' },
            department: { label: 'Requesting department' },
            amount: { label: 'Contract amount' },
            currency_code: { label: 'Currency' },
            is_amount_estimated: { label: 'Amount is an estimate' },
            start_date: { label: 'Start date' },
            end_date: { label: 'End date' },
            term_months: { label: 'Term (months)', placeholder: 'Instead of an end date' },
            summary: { label: 'Summary', placeholder: 'What the deal is, in a few sentences' },
            governing_law: { label: 'Governing law', placeholder: 'e.g. US-NY, England and Wales' },
            payment_terms: { label: 'Payment terms' },
            confidentiality_term_months: { label: 'Confidentiality term (months)' },
            auto_renew: { label: 'Auto-renews' },
            parent_contract: { label: 'Parent contract (record id)', placeholder: 'The framework or main contract this one sits under' },
          },
        },
        screen_party: {
          title: 'New counterparty',
          fields: {
            new_party_name: { label: 'Name' },
            new_party_kind: { label: 'Kind' },
            new_party_registration_no: { label: 'Registration / tax ID' },
            new_party_contact_name: { label: 'Contact name' },
            new_party_contact_email: { label: 'Contact email' },
          },
        },
        screen_document: {
          title: 'First version',
          fields: {
            draft_from_template: { label: 'Draft from template' },
          },
        },
        screen_upload: {
          title: 'Upload the first version',
        },
        screen_schedule: {
          title: 'Submit the contract',
          fields: {
            submit_now: { label: 'Submit now' },
          },
        },
      },
    },
  },
};
