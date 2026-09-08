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
        help: 'Generated on insert by contract.hook.ts as <type code>-<year>-<4-digit sequence>, one sequence per type per year (DESIGN.md §13 Q5). Regenerated only if the type changes while the contract is still a draft.',
      },
      title: {
        label: 'Title',
      },
      contract_type: {
        label: 'Contract Type',
        help: 'The workflow this contract runs: intake fields, review, execution method and formalities (DESIGN.md §02).',
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
        help: 'Lifecycle state. Transitions and their guards are enforced by contract.hook.ts (DESIGN.md §03 状态机); expired, terminated and cancelled are terminal.',
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
        help: 'An already-executed contract entered after the fact through the F16 executed_upload action (DESIGN.md §13 Q8) — the only writer. Such a contract starts active and skipped review and approval.',
      },
      archive_no: {
        label: 'Archive Number',
        help: 'Physical or records-management archive reference, assigned at archive time (F14).',
      },
      party: {
        label: 'Counterparty',
      },
      our_entity: {
        label: 'Our Signing Entity',
        help: 'Which of our legal entities signs. The shipped list is a single placeholder — a group with several legal entities replaces it with its own (DESIGN.md §01: signing entities are configuration, not schema).',
        options: {
          head_office: 'Head office',
        },
      },
      department: {
        label: 'Requesting Department',
        help: 'The business unit that launched the contract. A redundant scalar on the contract because RLS cannot cross objects (DESIGN.md §04); department-level sharing is a customer overlay (§13 Q2).',
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
        help: 'Total contract value in currency_code. The approval matrix bands on it (clm_approval_rule).',
      },
      currency_code: {
        label: 'Currency',
        help: 'ISO 4217 code. The organization-level default is a setting, not schema; the factory default is USD (DESIGN.md §01).',
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
        help: 'Same value set as HotCRM crm_contract.payment_terms so the F15 hand-off maps 1:1.',
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
        help: 'Maximum aggregate liability in currency_code. Empty means uncapped or not negotiated.',
      },
      start_date: {
        label: 'Start Date',
      },
      end_date: {
        label: 'End Date',
        help: 'The expiry job (F13) flags is_expiring renewal_notice_days before this date.',
      },
      term_months: {
        label: 'Term (months)',
      },
      auto_renew: {
        label: 'Auto-renews',
      },
      renewal_notice_days: {
        label: 'Renewal Notice (days)',
        help: 'Days before end_date by which a non-renewal notice must be given.',
      },
      renewed_from: {
        label: 'Renewed From',
        help: 'Set by the "start renewal" action on the new draft; renewal is a new contract, not a transition (DESIGN.md §03).',
      },
      parent_contract: {
        label: 'Parent Contract',
        help: 'The framework agreement this order sits under, or the main contract an amendment (category: amendment) modifies.',
      },
      is_expiring: {
        label: 'Expiring Soon',
        help: 'Stamped daily by the expiry job (F13) when end_date is within the renewal notice window.',
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
        help: 'ISO 639-1 code of the governing text.',
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
        help: 'Stamped from the contract type. Activation waits for a completed signature whose formalities_done covers every value here.',
        options: {
          countersigned_copy: 'Countersigned copy returned',
          company_seal: 'Company seal',
          notarized: 'Notarized',
          witnessed: 'Witnessed',
        },
      },
      summary: {
        label: 'Summary',
        help: 'Human-written summary of the deal. The AI summary lives in ai_summary and is adopted separately.',
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
        help: 'Mirror of the approval ladder (F5) decision node; written by the flow, never by hand.',
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
      archived_at: {
        label: 'Archived At',
      },
      ai_summary: {
        label: 'AI Summary',
        help: 'Adopted from an S2/S6 suggestion (DESIGN.md §07). Empty when nothing has been adopted, or when the ai capability is off.',
      },
      ai_risk_score: {
        label: 'AI Risk Score',
        help: '0 (no concern) to 100 (do not sign). Adopted from the S6 approver memo after legal review; never written directly by the model.',
      },
      ai_risk_rationale: {
        label: 'AI Risk Rationale',
      },
      ai_reviewed_at: {
        label: 'AI Reviewed At',
      },
      version_count: {
        label: 'Versions',
        help: 'Count of clm_contract_version rows on this contract.',
      },
      open_deviation_count: {
        label: 'Open Deviations',
        help: 'Count of clm_deviation rows still open. The in_review → in_approval guard reads the children directly (a guard must not trust a cached aggregate); this is the number people list and sort on.',
      },
      overdue_obligation_count: {
        label: 'Overdue Obligations',
        help: 'Count of clm_obligation rows in arrears. Moves only when the daily job (card 09) flips a child to overdue — the roll-up is recomputed by that write like any other.',
      },
      planned_amount: {
        label: 'Planned Amount',
        help: 'Sum of clm_payment_plan.planned_amount, in the contract currency. Compare with `amount`: that is the negotiated total, this is what the schedule actually adds up to.',
      },
      actual_amount: {
        label: 'Actual Amount',
        help: 'Sum of clm_payment_plan.actual_amount, in the contract currency — what has actually arrived against the schedule.',
      },
    },
    _actions: {
      accept_contract: {
        label: 'Accept for Review',
        description: 'Take a submitted contract into legal review.',
      },
      activate_contract: {
        label: 'Activate',
        description: 'Bring a signed contract into force. F9 stamps `activated_at` and builds the renewal reminder and payment schedule.',
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
      terminate_contract: {
        label: 'Terminate',
        description: 'End an active contract before its term runs out.',
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
        help: 'Stored mirror "v<version_no> · <kind>", stamped by mirror.hook.ts.',
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
        help: 'The version negotiation is currently on. The clean-version guard before signing reads this flag.',
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
