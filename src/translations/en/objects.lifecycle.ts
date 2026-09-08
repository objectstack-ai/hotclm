// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The records a contract accretes after it is launched — reviews, deviations,
 * signature rounds, obligations and the payment schedule.
 *
 * A DETAIL object follows the master it hangs off, which is what puts all five
 * here rather than beside the configuration objects they reference.
 */
import type { ObjectTranslationData } from '@objectstack/spec/system';

export const lifecycle: Record<string, ObjectTranslationData> = {
  clm_review: {
    label: 'Review',
    pluralLabel: 'Reviews',
    description: 'One function\'s review of a contract: who reviewed, at which stage, the decision and the assessed risk.',
    fields: {
      display_name: {
        label: 'Review',
        help: 'Stored mirror "<stage> · <reviewer>", stamped by mirror.hook.ts.',
      },
      contract: {
        label: 'Contract',
      },
      reviewer: {
        label: 'Reviewer',
      },
      stage: {
        label: 'Stage',
        options: {
          legal: 'Legal',
          finance: 'Finance',
          compliance: 'Compliance',
          business: 'Business',
        },
      },
      started_at: {
        label: 'Started At',
      },
      decision: {
        label: 'Decision',
        options: {
          pending: 'Pending',
          approved: 'Approved',
          changes_requested: 'Changes Requested',
          rejected: 'Rejected',
        },
      },
      risk_level_assessed: {
        label: 'Assessed Risk',
        options: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        },
      },
      comments: {
        label: 'Comments',
        help: 'Visible to the requester.',
      },
      internal_note: {
        label: 'Internal Note',
        help: 'Legal\'s own working note. Not shown to the requester.',
      },
      decided_at: {
        label: 'Decided At',
      },
    },
    _sections: {
      review: {
        label: 'Review',
      },
      outcome: {
        label: 'Outcome',
      },
    },
  },

  clm_deviation: {
    label: 'Deviation',
    pluralLabel: 'Deviations',
    description: 'A departure from a playbook clause on a contract, and legal\'s decision on it.',
    fields: {
      display_name: {
        label: 'Deviation',
        help: 'Stored mirror "<clause title> · <status>", stamped by mirror.hook.ts.',
      },
      contract: {
        label: 'Contract',
      },
      clause: {
        label: 'Clause',
      },
      deviation_text: {
        label: 'Proposed Wording',
        help: 'The wording on the table, as it departs from the standard text.',
      },
      requested_position: {
        label: 'Requested Position',
        help: 'Which playbook position the proposed wording amounts to.',
        options: {
          standard: 'Standard',
          fallback: 'Fallback',
          custom: 'Custom',
        },
      },
      justification: {
        label: 'Justification',
        help: 'Why the business wants to accept it.',
      },
      status: {
        label: 'Status',
        help: 'open → accepted / rejected / withdrawn; the decided states are terminal (contract.hook.ts).',
        options: {
          open: 'Open',
          accepted: 'Accepted',
          rejected: 'Rejected',
          withdrawn: 'Withdrawn',
        },
      },
      decided_by: {
        label: 'Decided By',
        help: 'Stamped with the acting user when the deviation is decided, unless set explicitly.',
      },
      decided_at: {
        label: 'Decided At',
        help: 'Stamped when the deviation is decided, unless set explicitly.',
      },
    },
    _sections: {
      deviation: {
        label: 'Deviation',
      },
      decision: {
        label: 'Decision',
      },
    },
  },

  clm_signature: {
    label: 'Signature',
    pluralLabel: 'Signatures',
    description: 'One signing round of a contract: method, provider envelope, signers, status and the execution formalities completed.',
    fields: {
      display_name: {
        label: 'Signature',
        help: 'Stored mirror "<method> · <status>", stamped by mirror.hook.ts.',
      },
      contract: {
        label: 'Contract',
      },
      method: {
        label: 'Method',
        options: {
          esign: 'E-signature',
          wet_ink: 'Wet ink',
        },
      },
      provider: {
        label: 'Provider',
        help: 'E-signature provider the envelope was sent through. Regional packs append their own (DESIGN.md §13 Q7).',
        options: {
          docusign: 'DocuSign',
          adobe_sign: 'Adobe Acrobat Sign',
          dropbox_sign: 'Dropbox Sign',
        },
      },
      envelope_id: {
        label: 'Envelope ID',
        help: 'The provider\'s envelope or agreement id, for status polling and audit (F8).',
      },
      signers: {
        label: 'Signers',
        help: 'Array of { side: our | counterparty, name, email, order, status, signed_at } — one row per signer, in signing order.',
      },
      status: {
        label: 'Status',
        options: {
          draft: 'Draft',
          sent: 'Sent',
          completed: 'Completed',
          declined: 'Declined',
          voided: 'Voided',
        },
      },
      formalities_done: {
        label: 'Formalities Done',
        help: 'Same value set as clm_contract_type.execution_formalities. Activation waits until every formality the type requires is ticked here on a completed round.',
        options: {
          countersigned_copy: 'Countersigned copy returned',
          company_seal: 'Company seal',
          notarized: 'Notarized',
          witnessed: 'Witnessed',
        },
      },
      executed_file: {
        label: 'Executed Copy',
        help: 'The fully executed document — the provider\'s completed envelope, or the scanned wet-ink copy.',
      },
      completed_at: {
        label: 'Completed At',
        help: 'Stamped when the round completes, unless set explicitly (a wet-ink round records the actual signing date).',
      },
      notes: {
        label: 'Notes',
      },
    },
    _sections: {
      round: {
        label: 'Signing Round',
      },
      execution: {
        label: 'Execution',
      },
    },
  },

  clm_obligation: {
    label: 'Obligation',
    pluralLabel: 'Obligations',
    description: 'A commitment a signed contract carries: what has to be delivered, reported or renewed, by when, and by whom.',
    fields: {
      display_name: {
        label: 'Obligation',
        help: 'Stored mirror of title, stamped by mirror.hook.ts.',
      },
      contract: {
        label: 'Contract',
      },
      title: {
        label: 'Title',
        help: 'What has to be done, in the words the owner will recognise on a reminder.',
      },
      kind: {
        label: 'Kind',
        help: 'What class of commitment this is; the reminder job and the dashboards band on it.',
        options: {
          deliverable: 'Deliverable',
          payment: 'Payment',
          report: 'Report',
          renewal: 'Renewal',
          compliance: 'Compliance',
          other: 'Other',
        },
      },
      due_date: {
        label: 'Due Date',
        help: 'The date the daily job (card 09) measures arrears against.',
      },
      owner: {
        label: 'Owner',
        help: 'Who is accountable for performing it. Empty means unassigned, not the contract owner.',
      },
      status: {
        label: 'Status',
        help: 'pending → in_progress / done / waived / overdue; in_progress → done / waived; overdue → done / waived. Enforced by contract.hook.ts; overdue is written only by the daily job (card 09).',
        options: {
          pending: 'Pending',
          in_progress: 'In Progress',
          done: 'Done',
          overdue: 'Overdue',
          waived: 'Waived',
        },
      },
      completed_at: {
        label: 'Completed At',
        help: 'Stamped when the obligation is marked done, unless set explicitly.',
      },
      evidence: {
        label: 'Evidence',
        help: 'Proof of performance — the delivery note, the filed report, the countersigned notice.',
      },
      notes: {
        label: 'Notes',
      },
    },
    _views: {
      all_obligations: {
        label: 'All Obligations',
      },
      my_obligations: {
        label: 'My Obligations',
        description: 'Obligations assigned to me that are not finished, soonest due first.',
      },
    },
    _sections: {
      obligation: {
        label: 'Obligation',
      },
      progress: {
        label: 'Progress',
      },
    },
  },

  clm_payment_plan: {
    label: 'Payment Plan',
    pluralLabel: 'Payment Plan',
    description: 'One instalment of a contract payment schedule: what is planned, what releases it, and what was actually paid.',
    fields: {
      display_name: {
        label: 'Instalment',
        help: 'Stored mirror "#<seq> · <planned_date>", stamped by mirror.hook.ts. ASCII by design; the localized form belongs to the zh-CN bundle.',
      },
      contract: {
        label: 'Contract',
      },
      seq: {
        label: 'Instalment No.',
        help: 'Position in the schedule, 1-based. Unique within the contract.',
      },
      planned_date: {
        label: 'Planned Date',
        help: 'The date the daily job (card 09) measures arrears against.',
      },
      planned_amount: {
        label: 'Planned Amount',
        help: 'In the contract currency (clm_contract.currency_code); the instalment amounts are not separately denominated.',
      },
      condition: {
        label: 'Condition',
        help: 'What releases the instalment — acceptance, milestone sign-off, delivery. Empty means it falls due on the date alone.',
      },
      status: {
        label: 'Status',
        help: 'planned → due; due → partial / paid / overdue; overdue → partial / paid. Enforced by contract.hook.ts; overdue is written only by the daily job (card 09).',
        options: {
          planned: 'Planned',
          due: 'Due',
          partial: 'Partial',
          paid: 'Paid',
          overdue: 'Overdue',
        },
      },
      actual_date: {
        label: 'Actual Date',
        help: 'Stamped when the instalment is marked partial or paid, unless set explicitly.',
      },
      actual_amount: {
        label: 'Actual Amount',
        help: 'What actually arrived, in the contract currency. Below planned_amount on a partial instalment.',
      },
      invoice_no: {
        label: 'Invoice Number',
        help: 'The finance-side reference this instalment was billed under; the invoice itself is not modelled here.',
      },
      notes: {
        label: 'Notes',
      },
    },
    _views: {
      all_payment_plans: {
        label: 'Payment Schedule',
      },
      payments_due: {
        label: 'Due Now',
        description: 'Instalments that have come due and are not settled.',
      },
      payments_overdue: {
        label: 'Overdue',
        description: 'Instalments past their planned date and still unpaid.',
      },
      payments_paid: {
        label: 'Paid',
        description: 'Settled instalments, most recently paid first.',
      },
      payment_kanban: {
        label: 'Payment Board',
        description: 'Every instalment by settlement status.',
      },
    },
    _sections: {
      schedule: {
        label: 'Schedule',
      },
      actual: {
        label: 'Actual',
      },
    },
  },
};
