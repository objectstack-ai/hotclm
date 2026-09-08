// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Everything that is not an object: the app and its navigation, the three
 * dashboards and every widget title, the four analytics datasets with their
 * dimension and measure labels, and the contract record page.
 *
 * These namespaces together are ~19% of the bundle and the schema bounds how
 * many of them can ever arrive, so one file holds them with room left.
 *
 * ⚠️ A dataset measure label is drawn ON THE DASHBOARD — under every metric
 * tile and on every chart axis — even though a dataset reads like a back-office
 * definition. Leaving `datasets` untranslated renders Chinese tile titles above
 * English measure labels, which is the mixed-language screen this card exists
 * to prevent.
 */
import type { TranslationData } from '@objectstack/spec/system';

export const appSurface: Pick<TranslationData, 'apps' | 'dashboards' | 'datasets' | 'pages'> = {
  apps: {
    clm: {
      label: 'HotCLM',
      description: 'Contract lifecycle management — intake, review, approval, execution, obligations and archive.',
      navigation: {
        group_my_contracts: {
          label: 'My Contracts',
        },
        nav_launch_contract: {
          label: 'Launch a Contract',
        },
        nav_my_contracts: {
          label: 'Launched by Me',
        },
        nav_my_approvals: {
          label: 'Waiting on Me',
        },
        nav_my_obligations: {
          label: 'My Obligations',
        },
        group_legal: {
          label: 'Legal Desk',
        },
        nav_legal_intake: {
          label: 'Awaiting Intake',
        },
        nav_legal_review: {
          label: 'My Reviews',
        },
        nav_legal_negotiate: {
          label: 'In Negotiation',
        },
        nav_all_contracts: {
          label: 'All Contracts',
        },
        nav_expiry_calendar: {
          label: 'Expiry Calendar',
        },
        nav_clause_library: {
          label: 'Clause Library',
        },
        nav_contract_types: {
          label: 'Contract Types',
        },
        group_finance: {
          label: 'Finance',
        },
        nav_payment_plans: {
          label: 'Payment Schedule',
        },
        nav_active_finance: {
          label: 'Active Contracts',
        },
        nav_payment_board: {
          label: 'Payment Board',
        },
        group_records: {
          label: 'Execution & Records',
        },
        nav_pending_execution: {
          label: 'Awaiting Execution',
        },
        nav_pending_archive: {
          label: 'Awaiting Archive',
        },
        nav_register: {
          label: 'Contract Register',
        },
        group_analytics: {
          label: 'Analytics',
        },
        nav_legal_workbench: {
          label: 'Legal Workbench',
        },
        nav_executive_overview: {
          label: 'Executive Overview',
        },
        nav_finance_overview: {
          label: 'Finance Overview',
        },
        group_admin: {
          label: 'Administration',
        },
        nav_approval_matrix: {
          label: 'Approval Matrix',
        },
        nav_parties: {
          label: 'Counterparties',
        },
      },
    },
  },
  dashboards: {
    executive_overview: {
      label: 'Executive Overview',
      description: 'Contract value in force, expiries, risk concentration and approval load for management.',
      widgets: {
        active_contract_value: {
          title: 'Active Contract Value by Currency',
          description: 'Contracts in force. Each bar is its own currency — no FX conversion exists in this app.',
        },
        expiring_90_days: {
          title: 'Expiring Within 90 Days',
          description: 'Active contracts whose end date falls in the next 90 days',
        },
        high_risk_contracts: {
          title: 'High-Risk Contracts',
          description: 'Assessed high by legal during review',
        },
        route_legal_head: {
          title: 'Routes: Head of Legal',
          description: 'Contracts whose matrix row reaches the head of legal',
        },
        route_finance: {
          title: 'Routes: Finance Controller',
          description: 'Contracts whose matrix row reaches finance',
        },
        route_executive: {
          title: 'Routes: Executive',
          description: 'Contracts whose matrix row reaches the executive sponsor',
        },
        route_gm: {
          title: 'Routes: General Manager',
          description: 'Contracts whose matrix row reaches the general manager',
        },
        value_trend_by_direction: {
          title: 'Contract Value Signed, by Direction',
          description: 'Signed value over the last 12 months. Sales and purchase only — NDA/DPA types carry no amount.',
        },
      },
    },
    finance_overview: {
      label: 'Finance Overview',
      description: 'Instalments falling due, arrears, and who owes what.',
      widgets: {
        due_this_month: {
          title: 'Falling Due This Month',
          description: 'Instalments scheduled this month — sales is receivable, purchase is payable. Each contract\'s own currency.',
        },
        overdue_amount: {
          title: 'Overdue Amount',
          description: 'Scheduled value of instalments the daily job has stamped overdue',
        },
        overdue_count: {
          title: 'Overdue Instalments',
          description: 'How many instalments are in arrears',
        },
        unpaid_by_counterparty: {
          title: 'Unsettled by Counterparty — Top 10',
          description: 'Scheduled value of instalments that are due, part-paid or overdue. Each contract\'s own currency.',
        },
        planned_vs_settled: {
          title: 'Planned vs Settled by Month',
          description: 'Scheduled instalment value against what actually arrived, by planned month',
        },
      },
    },
    legal_workbench: {
      label: 'Legal Workbench',
      description: 'Intake queue, review load, negotiation stalls and pipeline shape for the legal team.',
      widgets: {
        awaiting_intake: {
          title: 'Awaiting Intake',
          description: 'Submitted and not yet accepted for review',
        },
        in_review: {
          title: 'In Review',
          description: 'Contracts a lawyer has accepted and not yet routed',
        },
        review_ageing: {
          title: 'In Review Over 30 Days',
          description: 'Older than every seeded type SLA (longest is 10 days) — a fixed threshold, not the per-type breach',
        },
        negotiation_stalled: {
          title: 'Waiting on Counterparty',
          description: 'The ball is in their court — the queue F4 chases',
        },
        approval_throughput: {
          title: 'Approved This Month',
          description: 'Contracts reaching approved this month, against the previous period. Not an average duration — see the PR.',
        },
        stage_funnel: {
          title: 'Pipeline by Stage',
          description: 'Contracts at each lifecycle stage, intake through activation',
        },
      },
    },
  },
  datasets: {
    contract_metrics: {
      label: 'Contract Metrics',
      description: 'Contract counts and value by type, direction, status, department, counterparty and month. Amounts are each contract\'s own currency and are not FX-converted — group by currency before totalling.',
      dimensions: {
        status: {
          label: 'Status',
        },
        category: {
          label: 'Category',
        },
        direction: {
          label: 'Direction',
        },
        department: {
          label: 'Requesting Department',
        },
        currency_code: {
          label: 'Currency',
        },
        governing_law: {
          label: 'Governing Law',
        },
        risk_level: {
          label: 'Risk Level',
        },
        current_turn: {
          label: 'Ball In Court',
        },
        approval_status: {
          label: 'Approval Status',
        },
        contract_type_name: {
          label: 'Contract Type',
        },
        counterparty: {
          label: 'Counterparty',
        },
        submitted_month: {
          label: 'Submitted Month',
        },
        approved_month: {
          label: 'Approved Month',
        },
        signed_month: {
          label: 'Signed Month',
        },
        activated_month: {
          label: 'Activated Month',
        },
        end_month: {
          label: 'Expiry Month',
        },
      },
      measures: {
        contract_count: {
          label: 'Contracts',
        },
        total_amount: {
          label: 'Contract Value',
        },
        avg_amount: {
          label: 'Average Value',
        },
        route_legal_head_count: {
          label: 'Routes: Head of Legal',
        },
        route_finance_count: {
          label: 'Routes: Finance Controller',
        },
        route_executive_count: {
          label: 'Routes: Executive',
        },
        route_gm_count: {
          label: 'Routes: General Manager',
        },
      },
    },
    contract_cycle_time: {
      label: 'Contract Cycle',
      description: 'Stage coverage by contract type and legal owner: how many contracts have reached each lifecycle stamp, and when. Carries no duration measure — see the module comment for the measurement that rules one out.',
      dimensions: {
        contract_type_name: {
          label: 'Contract Type',
        },
        legal_owner: {
          label: 'Legal Owner',
        },
        status: {
          label: 'Status',
        },
        review_sla_days: {
          label: 'Type Review SLA (days)',
        },
        submitted_month: {
          label: 'Submitted Month',
        },
        review_started_month: {
          label: 'Review Started Month',
        },
        approved_month: {
          label: 'Approved Month',
        },
        signed_month: {
          label: 'Signed Month',
        },
        activated_month: {
          label: 'Activated Month',
        },
      },
      measures: {
        contract_count: {
          label: 'Contracts',
        },
        submitted_count: {
          label: 'Reached Submitted',
        },
        review_started_count: {
          label: 'Reached Review',
        },
        approved_count: {
          label: 'Reached Approved',
        },
        signed_count: {
          label: 'Reached Signed',
        },
        activated_count: {
          label: 'Reached Active',
        },
      },
    },
    obligation_metrics: {
      label: 'Obligation Metrics',
      description: 'Post-signature commitments by status, kind, owner, contract and due month — including the arrears the daily job stamps.',
      dimensions: {
        status: {
          label: 'Status',
        },
        kind: {
          label: 'Kind',
        },
        owner: {
          label: 'Owner',
        },
        contract_title: {
          label: 'Contract',
        },
        contract_status: {
          label: 'Contract Status',
        },
        counterparty: {
          label: 'Counterparty',
        },
        due_month: {
          label: 'Due Month',
        },
      },
      measures: {
        obligation_count: {
          label: 'Obligations',
        },
        overdue_count: {
          label: 'Overdue',
        },
        open_count: {
          label: 'Open',
        },
        done_count: {
          label: 'Completed',
        },
      },
    },
    payment_metrics: {
      label: 'Payment Metrics',
      description: 'Instalments planned against actual, by month, counterparty and contract direction — plus the arrears the daily job stamps. Amounts are each contract\'s own currency and are not FX-converted.',
      dimensions: {
        status: {
          label: 'Status',
        },
        direction: {
          label: 'Direction',
        },
        counterparty: {
          label: 'Counterparty',
        },
        currency_code: {
          label: 'Currency',
        },
        contract_title: {
          label: 'Contract',
        },
        planned_month: {
          label: 'Planned Month',
        },
        actual_month: {
          label: 'Settled Month',
        },
      },
      measures: {
        instalment_count: {
          label: 'Instalments',
        },
        planned_total: {
          label: 'Planned',
        },
        actual_total: {
          label: 'Settled',
        },
        overdue_amount: {
          label: 'Overdue',
        },
        open_amount: {
          label: 'Unsettled Value',
        },
        open_instalments: {
          label: 'Unsettled Instalments',
        },
      },
    },
  },
  pages: {
    contract_detail: {
      label: 'Contract',
      description: 'The contract record: lifecycle path, key terms, versions, review, approvals, obligations, signing and discussion.',
    },
  },
};
