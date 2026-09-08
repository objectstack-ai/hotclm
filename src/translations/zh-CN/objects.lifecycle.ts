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
    label: '审查',
    pluralLabel: '审查',
    description: '某个职能对一份合同的审查：谁审的、在哪个环节、结论是什么、评定的风险等级。',
    fields: {
      display_name: {
        label: '审查',
        help: '自动维护的展示名，形如「环节 · 审查人」。',
      },
      contract: {
        label: '合同',
      },
      reviewer: {
        label: '审查人',
      },
      stage: {
        label: '环节',
        options: {
          legal: '法务',
          finance: '财务',
          compliance: '合规',
          business: '业务',
        },
      },
      started_at: {
        label: '开始时间',
      },
      decision: {
        label: '结论',
        options: {
          pending: '待定',
          approved: '通过',
          changes_requested: '要求修改',
          rejected: '驳回',
        },
      },
      risk_level_assessed: {
        label: '评定风险',
        options: {
          low: '低',
          medium: '中',
          high: '高',
        },
      },
      comments: {
        label: '审查意见',
        help: '发起人可以看到。',
      },
      internal_note: {
        label: '内部记录',
        help: '法务自己的工作记录，不向发起人展示。',
      },
      decided_at: {
        label: '结论时间',
      },
    },
    _sections: {
      review: {
        label: '审查',
      },
      outcome: {
        label: '结论',
      },
    },
  },

  clm_deviation: {
    label: '偏离',
    pluralLabel: '偏离',
    description: '合同上对某条条款库条款的偏离，以及法务对它的决定。',
    fields: {
      display_name: {
        label: '偏离',
        help: '自动维护的展示名，形如「条款标题 · 状态」。',
      },
      contract: {
        label: '合同',
      },
      clause: {
        label: '条款',
      },
      deviation_text: {
        label: '拟用表述',
        help: '谈判桌上的表述，以及它与标准表述的出入。',
      },
      requested_position: {
        label: '请求立场',
        help: '拟用表述相当于条款库里的哪一档立场。',
        options: {
          standard: '标准',
          fallback: '退让',
          custom: '自定义',
        },
      },
      justification: {
        label: '理由',
        help: '业务为什么希望接受它。',
      },
      status: {
        label: '状态',
        help: '从未决走向接受、驳回或撤回；后三种是终态。',
        options: {
          open: '未决',
          accepted: '已接受',
          rejected: '已驳回',
          withdrawn: '已撤回',
        },
      },
      decided_by: {
        label: '决定人',
        help: '作出决定时自动记为当前操作人，除非显式指定。',
      },
      decided_at: {
        label: '决定时间',
        help: '作出决定时自动写入，除非显式指定。',
      },
    },
    _sections: {
      deviation: {
        label: '偏离',
      },
      decision: {
        label: '决定',
      },
    },
  },

  clm_signature: {
    label: '签署记录',
    pluralLabel: '签署记录',
    description: '合同的一轮签署：签署方式、服务商信封、签署人、状态，以及已完成的执行形式。',
    fields: {
      display_name: {
        label: '签署记录',
        help: '自动维护的展示名，形如「签署方式 · 状态」。',
      },
      contract: {
        label: '合同',
      },
      method: {
        label: '签署方式',
        options: {
          esign: '电子签',
          wet_ink: '湿签',
        },
      },
      provider: {
        label: '服务商',
        help: '发送签署信封所用的电子签服务商。地区扩展包会追加本地服务商。',
        options: {
          docusign: 'DocuSign',
          adobe_sign: 'Adobe Acrobat Sign',
          dropbox_sign: 'Dropbox Sign',
        },
      },
      envelope_id: {
        label: '信封 ID',
        help: '服务商侧的信封或协议编号，用于查询状态和留痕。',
      },
      signers: {
        label: '签署人',
        help: '由 { side: our | counterparty, name, email, order, status, signed_at } 组成的数组，按签署顺序一人一行。',
      },
      status: {
        label: '状态',
        options: {
          draft: '草稿',
          sent: '已发出',
          completed: '已完成',
          declined: '已拒签',
          voided: '已作废',
        },
      },
      formalities_done: {
        label: '已完成的执行形式',
        help: '取值与合同类型的执行形式一致。合同要等这一轮完成、且类型要求的每一项形式都在这里勾上，才能生效。',
        options: {
          countersigned_copy: '回签副本已收到',
          company_seal: '加盖公司印章',
          notarized: '已公证',
          witnessed: '有见证人',
        },
      },
      executed_file: {
        label: '执行副本',
        help: '完整签署完成的文档：服务商生成的已完成信封，或湿签副本的扫描件。',
      },
      completed_at: {
        label: '完成时间',
        help: '本轮完成时自动写入，除非显式指定；湿签需要登记实际签署日期。',
      },
      notes: {
        label: '备注',
      },
    },
    _sections: {
      round: {
        label: '签署轮次',
      },
      execution: {
        label: '执行',
      },
    },
  },

  clm_obligation: {
    label: '履约义务',
    pluralLabel: '履约义务',
    description: '一份已签合同带来的承诺：要交付、上报或续约什么，什么时候之前做完，由谁负责。',
    fields: {
      display_name: {
        label: '履约义务',
        help: '自动维护的展示名，取自标题。',
      },
      contract: {
        label: '合同',
      },
      title: {
        label: '标题',
        help: '要做什么，用负责人在提醒里一眼能认出的说法写。',
      },
      kind: {
        label: '类别',
        help: '属于哪一类承诺；提醒和看板都按它分组。',
        options: {
          deliverable: '交付',
          payment: '付款',
          report: '上报',
          renewal: '续约',
          compliance: '合规',
          other: '其他',
        },
      },
      due_date: {
        label: '到期日',
        help: '每日检查以这个日期判断是否逾期。',
      },
      owner: {
        label: '负责人',
        help: '由谁负责完成。留空表示尚未指派，不代表由合同负责人承担。',
      },
      status: {
        label: '状态',
        help: '待办可转为进行中、已完成或已豁免；进行中可转为已完成或已豁免；逾期可转为已完成或已豁免。逾期只由每日检查写入。',
        options: {
          pending: '待办',
          in_progress: '进行中',
          done: '已完成',
          overdue: '已逾期',
          waived: '已豁免',
        },
      },
      completed_at: {
        label: '完成时间',
        help: '标记为已完成时自动写入，除非显式指定。',
      },
      evidence: {
        label: '履约凭证',
        help: '履约的证明：交付单、已提交的报告、对方回签的通知。',
      },
      notes: {
        label: '备注',
      },
    },
    _views: {
      all_obligations: {
        label: '全部履约义务',
      },
      my_obligations: {
        label: '我负责的履约',
        description: '指派给我且尚未完成的义务，快到期的排在前面。',
      },
    },
    _sections: {
      obligation: {
        label: '履约义务',
      },
      progress: {
        label: '进展',
      },
    },
  },

  clm_payment_plan: {
    label: '收付款计划',
    pluralLabel: '收付款计划',
    description: '合同收付款计划中的一期：计划收付什么、什么条件释放、实际收付了多少。',
    fields: {
      display_name: {
        label: '分期',
        help: '自动维护的展示名，形如「第几期 · 计划日期」。',
      },
      contract: {
        label: '合同',
      },
      seq: {
        label: '期次',
        help: '在计划中的第几期，从 1 开始。同一份合同内不重复。',
      },
      planned_date: {
        label: '计划日期',
        help: '每日检查以这个日期判断是否逾期。',
      },
      planned_amount: {
        label: '计划金额',
        help: '以合同币种计；各期金额不单独指定币种。',
      },
      condition: {
        label: '释放条件',
        help: '什么条件下这一期才应收应付：验收、里程碑确认、交付完成。留空表示只看日期。',
      },
      status: {
        label: '状态',
        help: '计划中可转为待收付；待收付可转为部分收付、已结清或逾期；逾期可转为部分收付或已结清。逾期只由每日检查写入。',
        options: {
          planned: '计划中',
          due: '待收付',
          partial: '部分收付',
          paid: '已结清',
          overdue: '已逾期',
        },
      },
      actual_date: {
        label: '实际日期',
        help: '标记为部分收付或已结清时自动写入，除非显式指定。',
      },
      actual_amount: {
        label: '实际金额',
        help: '实际到账金额，以合同币种计。部分收付时会低于计划金额。',
      },
      invoice_no: {
        label: '发票号',
        help: '财务侧开票所用的编号；发票本身不在本系统建模。',
      },
      notes: {
        label: '备注',
      },
    },
    _views: {
      all_payment_plans: {
        label: '收付款计划',
      },
      payments_due: {
        label: '本期应收付',
        description: '已到应收付日期但尚未结清的分期。',
      },
      payments_overdue: {
        label: '逾期',
        description: '已过计划日期且仍未结清的分期。',
      },
      payments_paid: {
        label: '已结清',
        description: '已结清的分期，最近结清的排在前面。',
      },
      payment_kanban: {
        label: '收付款看板',
        description: '全部分期按结清状态排列。',
      },
    },
    _sections: {
      schedule: {
        label: '计划',
      },
      actual: {
        label: '实际',
      },
    },
  },
};
