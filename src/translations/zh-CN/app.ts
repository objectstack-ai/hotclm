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
      description: '合同全生命周期管理 —— 发起、审查、审批、执行、履约与归档。',
      navigation: {
        group_my_contracts: {
          label: '我的合同',
        },
        nav_launch_contract: {
          label: '发起合同',
        },
        nav_my_contracts: {
          label: '我发起的',
        },
        nav_my_approvals: {
          label: '待我处理',
        },
        nav_my_obligations: {
          label: '我负责的履约',
        },
        group_legal: {
          label: '法务工作台',
        },
        nav_legal_intake: {
          label: '待受理',
        },
        nav_legal_review: {
          label: '我的审查',
        },
        nav_legal_negotiate: {
          label: '谈判中',
        },
        nav_all_contracts: {
          label: '全部合同',
        },
        nav_expiry_calendar: {
          label: '到期日历',
        },
        nav_clause_library: {
          label: '条款库',
        },
        nav_contract_types: {
          label: '合同类型',
        },
        group_finance: {
          label: '财务',
        },
        nav_payment_plans: {
          label: '收付款计划',
        },
        nav_active_finance: {
          label: '生效合同',
        },
        nav_payment_board: {
          label: '收付款看板',
        },
        group_records: {
          label: '执行与档案',
        },
        nav_pending_execution: {
          label: '待执行',
        },
        nav_pending_archive: {
          label: '待归档',
        },
        nav_register: {
          label: '合同台账',
        },
        group_analytics: {
          label: '分析',
        },
        nav_legal_workbench: {
          label: '法务工作台',
        },
        nav_executive_overview: {
          label: '管理层看板',
        },
        nav_finance_overview: {
          label: '财务看板',
        },
        group_admin: {
          label: '管理',
        },
        nav_approval_matrix: {
          label: '审批矩阵',
        },
        nav_parties: {
          label: '相对方',
        },
      },
    },
  },
  dashboards: {
    executive_overview: {
      label: '管理层看板',
      description: '面向管理层的生效合同额、到期情况、风险集中度与审批负荷。',
      widgets: {
        active_contract_value: {
          title: '生效合同额（按币种）',
          description: '正在生效的合同。每根柱子是一个币种 —— 本应用不做汇率换算。',
        },
        expiring_90_days: {
          title: '90 天内到期',
          description: '到期日落在未来 90 天内的生效合同',
        },
        high_risk_contracts: {
          title: '高风险合同',
          description: '法务在审查中评定为高风险的合同',
        },
        route_legal_head: {
          title: '需经：法务负责人',
          description: '命中的矩阵行需要法务负责人审批的合同',
        },
        route_finance: {
          title: '需经：财务负责人',
          description: '命中的矩阵行需要财务审批的合同',
        },
        route_executive: {
          title: '需经：分管领导',
          description: '命中的矩阵行需要分管领导审批的合同',
        },
        route_gm: {
          title: '需经：总经理',
          description: '命中的矩阵行需要总经理审批的合同',
        },
        value_trend_by_direction: {
          title: '已签合同额（按方向）',
          description: '近 12 个月的已签金额。只含销售与采购 —— 保密协议、数据处理协议一类不带金额。',
        },
      },
    },
    finance_overview: {
      label: '财务看板',
      description: '即将到期的分期、逾期金额，以及谁欠了多少。',
      widgets: {
        due_this_month: {
          title: '本月应收付',
          description: '本月排期的分期 —— 销售为应收，采购为应付。各按合同自己的币种。',
        },
        overdue_amount: {
          title: '逾期金额',
          description: '每日检查已标记为逾期的分期计划金额',
        },
        overdue_count: {
          title: '逾期分期数',
          description: '有多少期已经逾期',
        },
        unpaid_by_counterparty: {
          title: '未结清金额 —— 相对方前十',
          description: '待收付、部分收付或已逾期分期的计划金额。各按合同自己的币种。',
        },
        planned_vs_settled: {
          title: '计划与实际（按月）',
          description: '按计划月份对比分期的计划金额与实际到账金额',
        },
      },
    },
    legal_workbench: {
      label: '法务工作台',
      description: '面向法务团队的待受理队列、审查负荷、谈判停滞与各阶段合同分布。',
      widgets: {
        awaiting_intake: {
          title: '待受理',
          description: '已提交但还没有人受理审查的合同',
        },
        in_review: {
          title: '审查中',
          description: '已被法务受理、尚未送审的合同',
        },
        review_ageing: {
          title: '审查超过 30 天',
          description: '超过所有种子类型的审查时限（最长 10 天）—— 这是一条固定阈值，不是按类型判定的超时',
        },
        negotiation_stalled: {
          title: '等待对方',
          description: '球在对方手上，需要催办的队列',
        },
        approval_throughput: {
          title: '本月已批准',
          description: '本月进入已批准的合同数，与上一周期对比。这不是平均时长，原因见 PR 说明。',
        },
        stage_funnel: {
          title: '各阶段合同数',
          description: '当前各生命周期阶段上的合同数 —— 反映合同簿现状的快照，按数量从多到少排列，不是转化流程',
        },
      },
    },
  },
  datasets: {
    contract_metrics: {
      label: '合同指标',
      description: '按类型、方向、状态、部门、相对方与月份统计的合同数与金额。金额按各合同自己的币种计，不做汇率换算 —— 汇总前请先按币种分组。',
      dimensions: {
        status: {
          label: '状态',
        },
        category: {
          label: '类别',
        },
        direction: {
          label: '方向',
        },
        department: {
          label: '发起部门',
        },
        currency_code: {
          label: '币种',
        },
        governing_law: {
          label: '适用法律',
        },
        risk_level: {
          label: '风险等级',
        },
        current_turn: {
          label: '当前轮次',
        },
        approval_status: {
          label: '审批状态',
        },
        contract_type_name: {
          label: '合同类型',
        },
        counterparty: {
          label: '相对方',
        },
        submitted_month: {
          label: '提交月份',
        },
        approved_month: {
          label: '批准月份',
        },
        signed_month: {
          label: '签署月份',
        },
        activated_month: {
          label: '生效月份',
        },
        end_month: {
          label: '到期月份',
        },
      },
      measures: {
        contract_count: {
          label: '合同数',
        },
        total_amount: {
          label: '合同额',
        },
        avg_amount: {
          label: '平均金额',
        },
        route_legal_head_count: {
          label: '需经：法务负责人',
        },
        route_finance_count: {
          label: '需经：财务负责人',
        },
        route_executive_count: {
          label: '需经：分管领导',
        },
        route_gm_count: {
          label: '需经：总经理',
        },
      },
    },
    contract_cycle_time: {
      label: '合同周转',
      description: '按合同类型与法务经办人统计各阶段覆盖情况：有多少合同走到了每个生命周期节点，以及分别在什么时候。不含时长度量，原因见模块说明中的实测记录。',
      dimensions: {
        contract_type_name: {
          label: '合同类型',
        },
        legal_owner: {
          label: '法务经办人',
        },
        status: {
          label: '状态',
        },
        review_sla_days: {
          label: '类型审查时限（天）',
        },
        submitted_month: {
          label: '提交月份',
        },
        review_started_month: {
          label: '审查开始月份',
        },
        approved_month: {
          label: '批准月份',
        },
        signed_month: {
          label: '签署月份',
        },
        activated_month: {
          label: '生效月份',
        },
      },
      measures: {
        contract_count: {
          label: '合同数',
        },
        submitted_count: {
          label: '已到提交',
        },
        review_started_count: {
          label: '已到审查',
        },
        approved_count: {
          label: '已到批准',
        },
        signed_count: {
          label: '已到签署',
        },
        activated_count: {
          label: '已到生效',
        },
      },
    },
    obligation_metrics: {
      label: '履约指标',
      description: '按状态、类别、负责人、合同与到期月份统计的签署后承诺，含每日检查标记出的逾期。',
      dimensions: {
        status: {
          label: '状态',
        },
        kind: {
          label: '类别',
        },
        owner: {
          label: '负责人',
        },
        contract_title: {
          label: '合同',
        },
        contract_status: {
          label: '合同状态',
        },
        counterparty: {
          label: '相对方',
        },
        due_month: {
          label: '到期月份',
        },
      },
      measures: {
        obligation_count: {
          label: '履约义务数',
        },
        overdue_count: {
          label: '逾期',
        },
        open_count: {
          label: '未完成',
        },
        done_count: {
          label: '已完成',
        },
      },
    },
    payment_metrics: {
      label: '收付款指标',
      description: '按月份、相对方与合同方向对比分期的计划与实际，含每日检查标记出的逾期。金额按各合同自己的币种计，不做汇率换算。',
      dimensions: {
        status: {
          label: '状态',
        },
        direction: {
          label: '方向',
        },
        counterparty: {
          label: '相对方',
        },
        currency_code: {
          label: '币种',
        },
        contract_title: {
          label: '合同',
        },
        planned_month: {
          label: '计划月份',
        },
        actual_month: {
          label: '结清月份',
        },
      },
      measures: {
        instalment_count: {
          label: '分期数',
        },
        planned_total: {
          label: '计划',
        },
        actual_total: {
          label: '已结清',
        },
        overdue_amount: {
          label: '逾期',
        },
        open_amount: {
          label: '未结清金额',
        },
        open_instalments: {
          label: '未结清分期数',
        },
      },
    },
  },
  pages: {
    contract_detail: {
      label: '合同',
      description: '合同记录：生命周期路径、关键条款、版本、审查、审批、履约、签署与讨论。',
    },
  },
};
