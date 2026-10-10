// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `clm_contract` and its document versions — 234 + 25 of this bundle's keys,
 * a third of the whole thing, so they get their own file on size alone.
 *
 * The contract carries the only `_actions` group in the bundle: the six header
 * actions of the record page plus the launch action, each with its label, its
 * description and — for the launch action — every parameter label the intake
 * dialog draws.
 */
import type { ObjectTranslationData } from '@objectstack/spec/system';

export const contract: Record<string, ObjectTranslationData> = {
  clm_contract: {
    label: 'Contract',
    pluralLabel: 'Contracts',
    description: 'A contract from intake to archive: parties, commercial and legal terms, lifecycle status and the stamps each stage leaves.',
    fields: {
      contract_number: {
        label: 'Contract Number',
        help: 'Generated when the contract is created: the type code, the year and a four-digit sequence (e.g. NDA-2026-0001), one sequence per type per year. Regenerated only if the type changes while the contract is still a draft.',
      },
      title: {
        label: 'Title',
      },
      contract_type: {
        label: 'Contract Type',
        help: 'The workflow this contract runs: intake fields, review, execution method and formalities.',
      },
      category: {
        label: 'Category',
        help: 'Stamped from the contract type; drives the approval matrix and the clause playbook.',
        options: {
          nda: 'NDA',
          sales: 'Sales',
          purchase: 'Purchase',
          service: 'Service',
          lease: 'Lease',
          employment: 'Employment / Contractor',
          framework: 'Framework',
          dpa: 'Data Processing (DPA)',
          amendment: 'Amendment',
          other: 'Other',
        },
      },
      direction: {
        label: 'Direction',
        help: 'Stamped from the contract type.',
        options: {
          sales: 'Sales',
          purchase: 'Purchase',
          other: 'Other',
        },
      },
      status: {
        label: 'Status',
        help: 'Where the contract is in its lifecycle. Status changes follow fixed rules; Expired, Terminated and Cancelled are final.',
        options: {
          draft: 'Draft',
          submitted: 'Submitted',
          in_review: 'In Review',
          in_approval: 'In Approval',
          approved: 'Approved',
          rejected: 'Rejected',
          signing: 'Signing',
          active: 'Active',
          expired: 'Expired',
          terminated: 'Terminated',
          cancelled: 'Cancelled',
        },
      },
      risk_level: {
        label: 'Risk Level',
        help: 'Assessed by legal during review; empty until assessed.',
        options: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        },
      },
      is_backfilled: {
        label: 'Backfilled',
        help: 'An already-signed contract recorded after the fact with Backfill Executed Contract. It starts active, without review or approval.',
      },
      archive_no: {
        label: 'Archive Number',
        help: 'Physical or records-management archive reference, assigned at archive time.',
      },
      party: {
        label: 'Counterparty',
      },
      our_entity: {
        label: 'Our Signing Entity',
        help: 'Which of our legal entities signs. The shipped list is a single placeholder — a group with several legal entities replaces it with its own.',
        options: {
          head_office: 'Head office',
        },
      },
      department: {
        label: 'Requesting Department',
        help: 'The business unit that launched the contract. Sharing contracts by department is a customer-specific extension, not part of the standard product.',
        options: {
          sales: 'Sales',
          procurement: 'Procurement',
          legal: 'Legal',
          finance: 'Finance',
          operations: 'Operations',
          people: 'People / HR',
          it: 'IT',
          other: 'Other',
        },
      },
      owner_id: {
        label: 'Business Owner',
        help: 'The requester who owns the contract on the business side.',
      },
      legal_owner: {
        label: 'Legal Owner',
        help: 'The lawyer who accepted the review. Required before a submitted contract enters review.',
      },
      current_turn: {
        label: 'Ball In Court',
        help: 'Whose move it is during negotiation.',
        options: {
          none: 'None',
          internal: 'Internal',
          counterparty: 'Counterparty',
        },
      },
      turn_since: {
        label: 'Turn Since',
      },
      amount: {
        label: 'Contract Amount',
        help: 'Total contract value, in the contract currency. The approval matrix bands on it.',
      },
      currency_code: {
        label: 'Currency',
        help: 'ISO 4217 code. The organization\'s default currency is a setting; out of the box it is USD.',
        options: {
          usd: 'USD — US Dollar',
          eur: 'EUR — Euro',
          gbp: 'GBP — Pound Sterling',
          cny: 'CNY — Renminbi',
          jpy: 'JPY — Japanese Yen',
        },
      },
      is_amount_estimated: {
        label: 'Amount Is Estimated',
        help: 'On for framework agreements and rate cards whose value is a forecast, not a commitment.',
      },
      payment_terms: {
        label: 'Payment Terms',
        help: 'The same values HotCRM uses for payment terms, so the two match one to one when a contract is handed over.',
        options: {
          net_15: 'Net 15',
          net_30: 'Net 30',
          net_60: 'Net 60',
          net_90: 'Net 90',
          due_on_receipt: 'Due on Receipt',
        },
      },
      liability_cap: {
        label: 'Liability Cap',
        help: 'Maximum aggregate liability, in the contract currency. Empty means uncapped or not negotiated.',
      },
      start_date: {
        label: 'Start Date',
      },
      end_date: {
        label: 'End Date',
        help: 'The contract is flagged Expiring Soon once this date is within its renewal notice period.',
      },
      term_months: {
        label: 'Term (months)',
      },
      auto_renew: {
        label: 'Auto-renews',
      },
      renewal_notice_days: {
        label: 'Renewal Notice (days)',
        help: 'Days before the end date by which a non-renewal notice must be given.',
      },
      renewed_from: {
        label: 'Renewed From',
        help: 'Set by Start Renewal on the new draft. A renewal is a new contract, not a status change.',
      },
      parent_contract: {
        label: 'Parent Contract',
        help: 'The framework agreement this order sits under, or the main contract an amendment modifies.',
      },
      is_expiring: {
        label: 'Expiring Soon',
        help: 'Set by the daily check once the end date is within the renewal notice period.',
      },
      governing_law: {
        label: 'Governing Law',
        help: 'ISO country or state, e.g. US-NY, DE, England and Wales.',
      },
      jurisdiction: {
        label: 'Jurisdiction',
        help: 'Courts or arbitral seat with jurisdiction over disputes.',
      },
      contract_language: {
        label: 'Contract Language',
        help: 'The language whose text governs the contract.',
        options: {
          en: 'English',
          zh: 'Chinese',
          ja: 'Japanese',
          de: 'German',
          fr: 'French',
          es: 'Spanish',
        },
      },
      confidentiality_term_months: {
        label: 'Confidentiality Term (months)',
        help: 'How long confidentiality obligations survive. Empty means not negotiated.',
      },
      execution_formalities: {
        label: 'Execution Formalities',
        help: 'Stamped from the contract type. Activation waits for a completed signing round whose Formalities Done covers every value here.',
        options: {
          countersigned_copy: 'Countersigned copy returned',
          company_seal: 'Company seal',
          notarized: 'Notarized',
          witnessed: 'Witnessed',
        },
      },
      summary: {
        label: 'Summary',
        help: 'Human-written summary of the deal. The AI summary is kept in its own field and adopted separately.',
      },
      route_legal_head: {
        label: 'Routes: Head of Legal',
      },
      route_finance: {
        label: 'Routes: Finance Controller',
      },
      route_executive: {
        label: 'Routes: Executive',
      },
      route_gm: {
        label: 'Routes: General Manager',
      },
      approval_status: {
        label: 'Approval Status',
        help: 'The outcome of the approval process. Set by the approval flow; do not edit it by hand.',
        options: {
          not_required: 'Not Required',
          pending: 'Pending',
          approved: 'Approved',
          rejected: 'Rejected',
        },
      },
      submitted_at: {
        label: 'Submitted At',
      },
      review_started_at: {
        label: 'Review Started At',
      },
      approved_at: {
        label: 'Approved At',
      },
      signed_at: {
        label: 'Signed At',
      },
      executed_at: {
        label: 'Executed At',
        help: 'When execution completed — the signature round was completed and its formalities were done.',
      },
      activated_at: {
        label: 'Activated At',
      },
      closed_at: {
        label: 'Closed At',
        help: 'Stamped on termination.',
      },
      termination_reason: {
        label: 'Termination Reason',
        help: 'Why the contract was ended before its term ran out. Required to terminate; asked once, by the Terminate action, and never on the intake form.',
      },
      archived_at: {
        label: 'Archived At',
      },
      ai_summary: {
        label: 'AI Summary',
        help: 'Adopted from an AI suggestion. Empty when nothing has been adopted, or when AI is turned off.',
      },
      ai_risk_score: {
        label: 'AI Risk Score',
        help: '0 (no concern) to 100 (do not sign). Adopted from the AI approver memo after legal review; never written directly by the AI.',
      },
      ai_risk_rationale: {
        label: 'AI Risk Rationale',
      },
      ai_reviewed_at: {
        label: 'AI Reviewed At',
      },
      version_count: {
        label: 'Versions',
        help: 'How many document versions this contract has.',
      },
      open_deviation_count: {
        label: 'Open Deviations',
        help: 'How many clause deviations are still open. Used for listing and sorting; sending for approval checks the deviations themselves, not this number.',
      },
      overdue_obligation_count: {
        label: 'Overdue Obligations',
        help: 'How many obligations are overdue. Only the daily check marks an obligation overdue.',
      },
      planned_amount: {
        label: 'Planned Amount',
        help: 'Total planned amount of the payment schedule, in the contract currency. Compare it with Contract Amount: that is the negotiated total, this is what the schedule actually adds up to.',
      },
      actual_amount: {
        label: 'Actual Amount',
        help: 'Total actual amount of the payment schedule, in the contract currency — what has actually arrived against the schedule.',
      },
    },
    _actions: {
      accept_contract: {
        label: 'Accept for Review',
        description: 'Take a submitted contract into legal review.',
      },
      activate_contract: {
        label: 'Activate',
        description: 'Bring a signed contract into force. F9 stamps `activated_at` and opens the renewal-reminder obligation.',
      },
      executed_upload: {
        label: 'Backfill Executed Contract',
        description: 'Record a contract that was signed before this system, or outside it: it is created directly in active with is_backfilled set, skipping review and approval, and the executed copy is filed as its final signed version.',
        successMessage: 'Executed contract recorded.',
        params: {
          contract_type: {
            helpText: 'The workflow this contract would have run. It still stamps the number, the category and the execution formalities.',
          },
          party: {
            helpText: 'The counterparty on the executed document.',
          },
          signed_date: {
            label: 'Signed On',
            helpText: 'The date on the executed document. It becomes both signed_at and executed_at.',
          },
          executed_file: {
            label: 'Executed Copy',
            helpText: 'The signed PDF or scan. It is filed as version 1, kind final_signed.',
          },
          archive_no: {
            helpText: 'Optional. The existing paper file reference, if this contract already has one.',
          },
        },
      },
      launch_contract: {
        label: 'Launch Contract',
        successMessage: 'Contract launched.',
        params: {
          contract_type: {
            label: 'Contract type',
            helpText: 'The workflow this contract runs: which fields are asked, whether legal reviews it, how it is executed.',
          },
          party: {
            label: 'Counterparty',
            helpText: 'Pick an existing counterparty, or leave empty to create one on the next step.',
          },
          title: {
            label: 'Title',
          },
          our_entity: {
            label: 'Our signing entity',
          },
          department: {
            label: 'Requesting department',
          },
          amount: {
            label: 'Contract amount',
          },
          currency_code: {
            label: 'Currency (ISO 4217, lowercase)',
          },
          is_amount_estimated: {
            label: 'Amount is an estimate',
          },
          start_date: {
            label: 'Start date',
          },
          end_date: {
            label: 'End date',
          },
          term_months: {
            label: 'Term (months)',
          },
          summary: {
            label: 'Summary',
          },
          governing_law: {
            label: 'Governing law',
          },
          payment_terms: {
            label: 'Payment terms',
          },
          confidentiality_term_months: {
            label: 'Confidentiality term (months)',
          },
          auto_renew: {
            label: 'Auto-renews',
          },
          parent_contract: {
            label: 'Parent contract (record id)',
          },
          new_party_name: {
            label: 'New counterparty: name',
          },
          new_party_kind: {
            label: 'New counterparty: kind',
          },
          new_party_registration_no: {
            label: 'New counterparty: registration / tax ID',
          },
          new_party_contact_name: {
            label: 'New counterparty: contact name',
          },
          new_party_contact_email: {
            label: 'New counterparty: contact email',
          },
          draft_from_template: {
            label: 'Draft version 1 from the type template',
          },
          first_version_file: {
            label: 'Version 1: uploaded file id',
          },
          submit_now: {
            label: 'Submit now',
          },
        },
      },
      send_for_approval: {
        label: 'Send for Approval',
        description: 'Close legal review and open the approval ladder (F5). Refused while any deviation is still open.',
      },
      start_signing: {
        label: 'Start Signing',
        description: 'Move an approved contract into signing.',
      },
      submit_contract: {
        label: 'Submit',
        description: 'Hand the draft to legal. Routing (F2) stamps the approval flags and either assigns a reviewer or sends it straight to approval.',
      },
      start_renewal: {
        label: 'Start Renewal',
        description: 'Create a renewal draft pre-filled from this contract and linked back to it. Renewal is a new contract, not a status change.',
        successMessage: 'Renewal draft created.',
      },
      terminate_contract: {
        label: 'Terminate',
        description: 'Terminate this contract? It is a terminal state — the contract cannot be reactivated, only renewed as a new one. The reason is required and is recorded on the contract.',
        params: {
          termination_reason: {
            helpText: 'Why the contract is ending early — counterparty breach, no longer needed, agreed between the parties. Legal and audit ask this first.',
          },
        },
      },
    },
    _views: {
      all_contracts: {
        label: 'All Contracts',
      },
      my_contracts: {
        label: 'My Contracts',
        description: 'Contracts I launched, grouped by where each one has got to.',
      },
      legal_intake: {
        label: 'Awaiting Intake',
        description: 'Submitted contracts no lawyer has taken yet.',
      },
      legal_in_review: {
        label: 'My Reviews',
        description: 'Contracts assigned to me for legal review.',
      },
      negotiating: {
        label: 'In Negotiation',
        description: 'Waiting on the counterparty — oldest turn first.',
      },
      status_kanban: {
        label: 'Status Board',
        description: 'Every contract by lifecycle status.',
      },
      expiry_calendar: {
        label: 'Expiry Calendar',
        description: 'When contracts run out.',
      },
      active_contracts: {
        label: 'Active Contracts',
        description: 'Contracts in force.',
      },
      pending_execution: {
        label: 'Awaiting Execution',
        description: 'Signed or signing — waiting on signatures and execution formalities.',
      },
      pending_archive: {
        label: 'Awaiting Archive',
        description: 'Closed contracts with no archive number yet.',
      },
      contract_register: {
        label: 'Contract Register',
        description: 'The full register — every field, exportable.',
      },
    },
    _sections: {
      identity: {
        label: 'Contract',
      },
      parties: {
        label: 'Parties & Owners',
      },
      commercial: {
        label: 'Commercial Terms',
      },
      term: {
        label: 'Term & Renewal',
      },
      legal: {
        label: 'Legal',
      },
      routing: {
        label: 'Routing & Approval',
      },
      lifecycle: {
        label: 'Lifecycle',
      },
      ai: {
        label: 'AI Review',
      },
      rollup: {
        label: 'Roll-ups',
      },
      archive: {
        label: 'Archive',
      },
    },
  },

  clm_contract_version: {
    label: 'Contract Version',
    pluralLabel: 'Contract Versions',
    description: 'A document version of a contract: draft, redline (ours or theirs), clean copy or final signed copy.',
    fields: {
      display_name: {
        label: 'Version',
        help: 'Filled in automatically from the version number and kind, e.g. "v2 · Clean".',
      },
      contract: {
        label: 'Contract',
      },
      version_no: {
        label: 'Version No.',
      },
      kind: {
        label: 'Kind',
        options: {
          draft: 'Draft',
          internal_redline: 'Internal Redline',
          counterparty_redline: 'Counterparty Redline',
          clean: 'Clean',
          final_signed: 'Final Signed',
        },
      },
      turn: {
        label: 'Turn',
        help: 'Which side produced this version.',
        options: {
          internal: 'Internal',
          counterparty: 'Counterparty',
        },
      },
      is_current: {
        label: 'Current',
        help: 'The version negotiation is currently on. A contract can go to signing only once its current version is a clean copy.',
      },
      file: {
        label: 'File',
      },
      submitted_by: {
        label: 'Submitted By',
      },
      notes: {
        label: 'Notes',
        help: 'What changed in this version, for the reviewer.',
      },
    },
    _sections: {
      version: {
        label: 'Version',
      },
      document: {
        label: 'Document',
      },
    },
  },
};
