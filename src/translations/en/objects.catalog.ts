// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Configuration objects — the rows an administrator maintains: contract types,
 * the clause playbook, the approval matrix and counterparties.
 *
 * Split axis, and why these four sit together: they are the objects whose rows
 * are CONFIGURATION rather than transactions, so they are edited by one
 * audience (Administration in the app's navigation) and change on a different
 * cadence from the contract itself.
 */
import type { ObjectTranslationData } from '@objectstack/spec/system';

export const catalog: Record<string, ObjectTranslationData> = {
  clm_contract_type: {
    label: 'Contract Type',
    pluralLabel: 'Contract Types',
    description: 'A kind of contract and the workflow it runs: intake fields, review, execution method and formalities, template.',
    fields: {
      name: {
        label: 'Name',
      },
      code: {
        label: 'Code',
        help: 'Short uppercase prefix used in contract numbering (e.g. NDA, PUR, SAL).',
      },
      direction: {
        label: 'Direction',
        options: {
          sales: 'Sales',
          purchase: 'Purchase',
          other: 'Other',
        },
      },
      category: {
        label: 'Category',
        help: 'Process category — drives the approval matrix and the clause playbook. Not the commercial type HotCRM uses.',
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
      description: {
        label: 'Description',
      },
      intake_fields: {
        label: 'Intake Fields',
        help: 'Optional contract fields the launch form shows (and requires) for this type. Core fields are always asked. Only fields a launching requester may write belong here.',
        options: {
          governing_law: 'Governing Law',
          payment_terms: 'Payment Terms',
          confidentiality_term_months: 'Confidentiality Term',
          auto_renew: 'Auto Renewal',
          parent_contract: 'Parent Contract',
        },
      },
      requires_legal_review: {
        label: 'Requires Legal Review',
        help: 'When off, a submitted contract of this type goes straight to approval (DESIGN.md §03 状态机).',
      },
      execution_formalities: {
        label: 'Execution Formalities',
        help: 'Formalities activation waits for, recorded on the signature record. Company seal, notarization and witnessing are regional or deed-type requirements; most types need none.',
        options: {
          countersigned_copy: 'Countersigned copy returned',
          company_seal: 'Company seal',
          notarized: 'Notarized',
          witnessed: 'Witnessed',
        },
      },
      sign_method: {
        label: 'Signing Method',
        help: 'How this type is normally executed. E-signature goes through the configured provider (DocuSign, Adobe Acrobat Sign, Dropbox Sign, or a regional provider); wet ink records an uploaded executed copy.',
        options: {
          esign: 'E-signature',
          wet_ink: 'Wet ink',
          either: 'Either',
        },
      },
      review_sla_days: {
        label: 'Review SLA (days)',
        help: 'Calendar days legal has to finish review before the overdue reminder fires (F3).',
      },
      template_file: {
        label: 'Template',
        help: 'The document a first version is drafted from. No rendering engine exists on the platform yet — the launch form hands the template and its placeholder list to the drafter (DESIGN.md §12).',
      },
      template_placeholders: {
        label: 'Template Placeholders',
        help: 'Array of { key, label, type, required } — the same shape as DocumentTemplate.placeholders in @objectstack/spec.',
      },
      default_term_months: {
        label: 'Default Term (months)',
      },
      retention_years: {
        label: 'Retention (years)',
        help: 'How long an archived contract of this type is kept before it may be disposed of.',
      },
      is_active: {
        label: 'Active',
        help: 'Inactive types are hidden from the launch form; existing contracts keep them.',
      },
    },
    _views: {
      all_contract_types: {
        label: 'Contract Types',
      },
    },
    _sections: {
      identity: {
        label: 'Identity',
      },
      workflow: {
        label: 'Workflow',
      },
      template: {
        label: 'Template',
      },
      terms: {
        label: 'Defaults & Retention',
      },
    },
  },

  clm_clause: {
    label: 'Clause',
    pluralLabel: 'Clause Library',
    description: 'A playbook clause: standard wording, fallback wording, risk level and the contract categories it applies to.',
    fields: {
      title: {
        label: 'Title',
      },
      category: {
        label: 'Category',
        options: {
          liability: 'Liability',
          payment: 'Payment',
          termination: 'Termination',
          confidentiality: 'Confidentiality',
          ip: 'IP',
          warranty: 'Warranty',
          dispute: 'Dispute',
          other: 'Other',
        },
      },
      risk_level: {
        label: 'Risk Level',
        options: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        },
      },
      standard_text: {
        label: 'Standard Wording',
        help: 'The position the company opens with.',
      },
      fallback_text: {
        label: 'Fallback Wording',
        help: 'The position legal will accept without escalation. Empty means the standard wording is the only acceptable one.',
      },
      position_note: {
        label: 'Walk-away Note',
        help: 'What the company will not accept on this clause, in plain words for the negotiator.',
      },
      applies_to: {
        label: 'Applies To',
        help: 'Contract categories this clause is expected in. Empty means every category.',
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
      requires_legal_head: {
        label: 'Deviation Needs Head of Legal',
        help: 'An accepted deviation from this clause routes the contract through the head-of-legal rung (F6).',
      },
      is_active: {
        label: 'Active',
      },
    },
    _views: {
      all_clauses: {
        label: 'Clause Library',
      },
    },
    _sections: {
      identity: {
        label: 'Clause',
      },
      wording: {
        label: 'Positions',
      },
      scope: {
        label: 'Scope',
      },
    },
  },

  clm_approval_rule: {
    label: 'Approval Rule',
    pluralLabel: 'Approval Matrix',
    description: 'One row of the approval matrix: which contracts it matches and which rungs of the approval ladder they climb.',
    fields: {
      name: {
        label: 'Name',
      },
      applies_to: {
        label: 'Contract Categories',
        help: 'Empty means every category.',
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
        options: {
          any: 'Any',
          sales: 'Sales',
          purchase: 'Purchase',
          other: 'Other',
        },
      },
      amount_min: {
        label: 'Amount From',
        help: 'Inclusive lower bound of the contract amount this rule matches. Empty means no lower bound.',
      },
      amount_max: {
        label: 'Amount To',
        help: 'Exclusive upper bound. Empty means no upper bound.',
      },
      only_with_deviation: {
        label: 'Only With Deviation',
        help: 'Match only contracts carrying at least one accepted clause deviation.',
      },
      priority: {
        label: 'Priority',
        help: 'Lower runs first. Every matching rule contributes its rungs; the union is what the contract climbs.',
      },
      route_legal_head: {
        label: 'Head of Legal',
      },
      route_finance: {
        label: 'Finance Controller',
      },
      route_executive: {
        label: 'Executive',
      },
      route_gm: {
        label: 'General Manager',
      },
      is_active: {
        label: 'Active',
      },
    },
    _validations: {
      approval_rule_amount_band: {
        message: 'Amount From must be below Amount To.',
      },
    },
    _views: {
      all_approval_rules: {
        label: 'Approval Matrix',
      },
    },
    _sections: {
      match: {
        label: 'Matches',
      },
      route: {
        label: 'Routes Through',
      },
    },
  },

  clm_party: {
    label: 'Counterparty',
    pluralLabel: 'Counterparties',
    description: 'The other party to a contract — company, individual or public body — with registration, contact and banking details.',
    fields: {
      name: {
        label: 'Name',
      },
      party_kind: {
        label: 'Kind',
        options: {
          company: 'Company',
          individual: 'Individual',
          government: 'Government',
          other: 'Other',
        },
      },
      country_code: {
        label: 'Country',
        help: 'ISO 3166-1 alpha-2 country code of the party (e.g. US, DE, CN). Drives governing-law defaults and screening.',
      },
      registration_no: {
        label: 'Registration / Tax ID',
        help: 'Company registration number, VAT/tax ID or equivalent national identifier. Unique per organization when present.',
      },
      legal_representative: {
        label: 'Legal Representative',
      },
      address: {
        label: 'Address',
      },
      contact_name: {
        label: 'Contact Name',
      },
      contact_phone: {
        label: 'Contact Phone',
      },
      contact_email: {
        label: 'Contact Email',
      },
      bank_name: {
        label: 'Bank',
      },
      bank_account: {
        label: 'Bank Account',
      },
      risk_flag: {
        label: 'Risk Flag',
        help: 'Blocked parties cannot be chosen on a new contract (intake guard, F1).',
        options: {
          none: 'None',
          watch: 'Watch',
          blocked: 'Blocked',
        },
      },
      risk_note: {
        label: 'Risk Note',
      },
      screening_status: {
        label: 'Screening',
        help: 'Result of the last sanctions / registry screening. Written by the screening connector when one is configured (DESIGN.md §08), otherwise by legal.',
        options: {
          not_screened: 'Not screened',
          clear: 'Clear',
          hit: 'Hit',
        },
      },
      screened_at: {
        label: 'Screened At',
      },
      is_active: {
        label: 'Active',
      },
    },
    _views: {
      all_parties: {
        label: 'Counterparties',
      },
    },
    _sections: {
      identity: {
        label: 'Identity',
      },
      contact: {
        label: 'Contact',
      },
      banking: {
        label: 'Banking',
      },
      risk: {
        label: 'Risk',
      },
    },
  },
};
