// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `clm_contract` and its document versions — 234 + 25 of this bundle's keys,
 * a third of the whole thing, so they get their own file on size alone.
 *
 * The contract carries the only `_actions` group in the bundle: the eight header
 * actions of the record page plus the two list-toolbar actions (launch and
 * backfill), each with its label, its description and — for the actions that
 * open a dialog — the parameter labels and help that dialog draws.
 */
import type { ObjectTranslationData } from '@objectstack/spec/system';

export const contract: Record<string, ObjectTranslationData> = {
  clm_contract: {
    label: '合同',
    pluralLabel: '合同',
    description: '一份合同从发起到归档的全过程：签约双方、商务与法律条款、生命周期状态，以及每个环节留下的时间戳。',
    fields: {
      contract_number: {
        label: '合同编号',
        help: '新建时自动生成，格式为「类型代号-年份-四位流水号」，每种类型每年一条流水。只有在草稿阶段更换合同类型时才会重新生成。',
      },
      title: {
        label: '标题',
      },
      contract_type: {
        label: '合同类型',
        help: '这份合同走哪条流程：发起时填什么、要不要法务审查、怎么签署、需要哪些执行形式。',
      },
      category: {
        label: '类别',
        help: '由合同类型带出，决定走哪条审批矩阵和哪套条款库。',
        options: {
          nda: '保密协议',
          sales: '销售',
          purchase: '采购',
          service: '服务',
          lease: '租赁',
          employment: '劳动 / 承揽',
          framework: '框架协议',
          dpa: '数据处理协议',
          amendment: '补充协议',
          other: '其他',
        },
      },
      direction: {
        label: '方向',
        help: '由合同类型带出。',
        options: {
          sales: '销售',
          purchase: '采购',
          other: '其他',
        },
      },
      status: {
        label: '状态',
        help: '合同所处的生命周期环节。状态只能按规定的路径流转；已到期、已终止、已作废是终态。',
        options: {
          draft: '草稿',
          submitted: '已提交',
          in_review: '审查中',
          in_approval: '审批中',
          approved: '已批准',
          rejected: '已驳回',
          signing: '签署中',
          active: '生效中',
          expired: '已到期',
          terminated: '已终止',
          cancelled: '已作废',
        },
      },
      risk_level: {
        label: '风险等级',
        help: '法务在审查时评定；未评定前为空。',
        options: {
          low: '低',
          medium: '中',
          high: '高',
        },
      },
      is_backfilled: {
        label: '补录',
        help: '已经签好的合同事后补录进系统。补录的合同直接进入生效中，不经审查与审批。',
      },
      archive_no: {
        label: '档案号',
        help: '实体档案或档案管理系统的编号，归档时分配。',
      },
      party: {
        label: '相对方',
      },
      our_entity: {
        label: '我方签约主体',
        help: '由我方哪个法律主体签署。可选项是「设置 → 业务单元」中类型为公司的业务单元。',
      },
      department: {
        label: '发起部门',
        help: '发起这份合同的业务部门。可选项是「设置 → 业务单元」中类型为部门的业务单元。按部门共享合同属于客户定制，标准品不提供。',
      },
      owner_id: {
        label: '业务承办人',
        help: '业务侧对这份合同负责的发起人。',
      },
      legal_owner: {
        label: '法务经办人',
        help: '在法务归口负责这份合同档案的律师。通常在合同进入法务审查时分配；补录的合同不经审查，由法务直接在这里指定。',
      },
      current_turn: {
        label: '当前轮次',
        help: '谈判中当前该谁出手。',
        options: {
          none: '无',
          internal: '我方',
          counterparty: '对方',
        },
      },
      turn_since: {
        label: '本轮开始时间',
      },
      amount: {
        label: '合同金额',
        help: '以合同币种计的合同总额。审批矩阵按这个金额分档。',
      },
      currency_code: {
        label: '币种',
        help: 'ISO 4217 代码。组织级默认币种是一项设置；出厂默认为美元。',
        options: {
          usd: 'USD — 美元',
          eur: 'EUR — 欧元',
          gbp: 'GBP — 英镑',
          cny: 'CNY — 人民币',
          jpy: 'JPY — 日元',
        },
      },
      is_amount_estimated: {
        label: '金额为估算值',
        help: '框架协议、报价单一类金额只是预估而非承诺的合同，打开这个开关。',
      },
      payment_terms: {
        label: '付款条件',
        help: '取值与 HotCRM 合同的付款条件一致，两边交接时可以一一对应。',
        options: {
          net_15: '15 天内付款',
          net_30: '30 天内付款',
          net_60: '60 天内付款',
          net_90: '90 天内付款',
          due_on_receipt: '见票即付',
        },
      },
      liability_cap: {
        label: '责任上限',
        help: '以合同币种计的累计赔偿上限。留空表示未设上限或未谈及。',
      },
      start_date: {
        label: '生效日期',
      },
      end_date: {
        label: '到期日期',
        help: '到期前若干天，系统会按续约通知期把合同标记为即将到期。',
      },
      term_months: {
        label: '期限（月）',
      },
      auto_renew: {
        label: '自动续约',
      },
      renewal_notice_days: {
        label: '续约通知期（天）',
        help: '到期前多少天必须发出不续约通知。',
      },
      renewed_from: {
        label: '续签自',
        help: '由「发起续签」动作写在新草稿上。续签是一份新合同，不是原合同的状态流转。',
      },
      parent_contract: {
        label: '主合同',
        help: '这份订单所依据的框架协议，或这份补充协议所修改的主合同。',
      },
      is_expiring: {
        label: '即将到期',
        help: '每日检查在合同进入续约通知期后自动标记。',
      },
      governing_law: {
        label: '适用法律',
        help: '国家或州的代码，例如 US-NY、DE、England and Wales。',
      },
      jurisdiction: {
        label: '管辖',
        help: '对争议有管辖权的法院或仲裁地。',
      },
      contract_language: {
        label: '合同文本语言',
        help: '以哪种语言的文本为准。',
        options: {
          en: '英语',
          zh: '中文',
          ja: '日语',
          de: '德语',
          fr: '法语',
          es: '西班牙语',
        },
      },
      confidentiality_term_months: {
        label: '保密期限（月）',
        help: '保密义务在合同结束后还要存续多久。留空表示未谈及。',
      },
      execution_formalities: {
        label: '执行形式',
        help: '由合同类型带出。合同要等到一次已完成的签署把这里列出的形式全部做齐，才能生效。',
        options: {
          countersigned_copy: '回签副本已收到',
          company_seal: '加盖公司印章',
          notarized: '已公证',
          witnessed: '有见证人',
        },
      },
      summary: {
        label: '摘要',
        help: '人工撰写的交易摘要。AI 生成的摘要在「AI 摘要」字段，需要单独采纳。',
      },
      route_legal_head: {
        label: '需经：法务负责人',
      },
      route_finance: {
        label: '需经：财务负责人',
      },
      route_executive: {
        label: '需经：分管领导',
      },
      route_gm: {
        label: '需经：总经理',
      },
      approval_status: {
        label: '审批状态',
        help: '审批的结果，由审批流程写入，不要手工修改。',
        options: {
          not_required: '无需审批',
          pending: '审批中',
          approved: '已通过',
          rejected: '已驳回',
        },
      },
      submitted_at: {
        label: '提交时间',
      },
      review_started_at: {
        label: '审查开始时间',
      },
      approved_at: {
        label: '批准时间',
      },
      signed_at: {
        label: '签署时间',
      },
      executed_at: {
        label: '执行完成时间',
        help: '签署轮次完成且执行形式做齐的时间。',
      },
      activated_at: {
        label: '生效时间',
      },
      closed_at: {
        label: '关闭时间',
        help: '终止时写入。',
      },
      termination_reason: {
        label: '终止原因',
        help: '为什么在期限届满前结束这份合同。终止时必填；只在按下「终止」时问一次，发起表单上不出现。',
      },
      archived_at: {
        label: '归档时间',
      },
      ai_summary: {
        label: 'AI 摘要',
        help: '从 AI 建议中采纳而来。未采纳任何建议，或未启用 AI 能力时为空。',
      },
      ai_risk_score: {
        label: 'AI 风险分',
        help: '0 表示无顾虑，100 表示不建议签署。由法务审查后从 AI 审批备忘中采纳，模型不会直接写入。',
      },
      ai_risk_rationale: {
        label: 'AI 风险说明',
      },
      ai_reviewed_at: {
        label: 'AI 审阅时间',
      },
      version_count: {
        label: '版本数',
        help: '这份合同下的版本条数。',
      },
      open_deviation_count: {
        label: '未决偏离数',
        help: '仍未处理的条款偏离条数，用于列表展示和排序；送审时检查的是偏离本身，而不是这个数字。',
      },
      approved_legal_review_count: {
        label: '法务审查通过数',
        help: '法务环节审查结论为「通过」的条数。送审至少要有一条；送审时检查的是审查记录本身，而不是这个数字。',
      },
      current_clean_version_count: {
        label: '当前清稿数',
        help: '当前版本是否为清稿（1 是，0 否）。发起签署需要它为 1；发起签署时检查的是版本本身，而不是这个数字。',
      },
      final_signed_version_count: {
        label: '最终签署版数',
        help: '已上传的最终签署版条数。生效至少要有一条；生效时检查的是版本本身，而不是这个数字。',
      },
      overdue_obligation_count: {
        label: '逾期义务数',
        help: '已经逾期的履约义务条数。只有每日检查会把义务标记为逾期。',
      },
      planned_amount: {
        label: '计划金额',
        help: '收付款计划的计划金额合计，以合同币种计。与「合同金额」对照看：那是谈定的总额，这是计划实际排出来的数。',
      },
      actual_amount: {
        label: '实际金额',
        help: '收付款计划的实际金额合计，以合同币种计，即照计划真正到账的部分。',
      },
    },
    _actions: {
      accept_contract: {
        label: '受理审查',
        description: '把一份已提交的合同接进法务审查。',
        successMessage: '已受理，进入法务审查。',
      },
      activate_contract: {
        label: '生效',
        description: '让已签署的合同正式生效。系统会写入生效时间，并在有到期日时设好续约提醒。',
        successMessage: '合同已生效。',
      },
      executed_upload: {
        label: '补录已签合同',
        description: '登记一份在本系统之前、或在本系统之外签好的合同：直接建成「生效中」并标记为补录，跳过审查与审批，执行副本作为终版签署件归档。',
        successMessage: '已签合同已登记。',
        params: {
          contract_type: {
            helpText: '这份合同本该走哪条流程。类型仍决定合同编号、类别与执行形式。',
          },
          party: {
            helpText: '执行副本上的相对方。',
          },
          signed_date: {
            label: '签署日期',
            helpText: '执行副本上的日期，同时写入签署时间与执行完成时间。',
          },
          executed_file: {
            label: '执行副本',
            helpText: '已签署的 PDF 或扫描件，归档为第 1 版、终版签署件。',
          },
          archive_no: {
            helpText: '可选。这份合同已有的纸质档案编号。',
          },
        },
      },
      launch_contract: {
        label: '发起合同',
        successMessage: '合同已发起。',
        params: {
          contract_type: {
            label: '合同类型',
            helpText: '这份合同走哪条流程：问哪些字段、要不要法务审查、怎么签署。',
          },
          party: {
            label: '相对方',
            helpText: '选一个已有的相对方；留空则在下一步新建。',
          },
          title: {
            label: '标题',
          },
          our_entity: {
            label: '我方签约主体',
            helpText: '由我方哪个法律主体签署。',
          },
          department: {
            label: '发起部门',
            helpText: '发起这份合同的部门。',
          },
          amount: {
            label: '合同金额',
          },
          currency_code: {
            label: '币种（ISO 4217，小写）',
          },
          is_amount_estimated: {
            label: '金额为估算值',
          },
          start_date: {
            label: '生效日期',
          },
          end_date: {
            label: '到期日期',
          },
          term_months: {
            label: '期限（月）',
          },
          summary: {
            label: '摘要',
          },
          governing_law: {
            label: '适用法律',
          },
          payment_terms: {
            label: '付款条件',
          },
          confidentiality_term_months: {
            label: '保密期限（月）',
          },
          auto_renew: {
            label: '自动续约',
          },
          parent_contract: {
            label: '主合同（记录 ID）',
          },
          new_party_name: {
            label: '新相对方：名称',
          },
          new_party_kind: {
            label: '新相对方：类型',
          },
          new_party_registration_no: {
            label: '新相对方：统一社会信用代码 / 税号',
          },
          new_party_contact_name: {
            label: '新相对方：联系人',
          },
          new_party_contact_email: {
            label: '新相对方：联系邮箱',
          },
          draft_from_template: {
            label: '按类型模板起草第 1 版',
          },
          first_version_file: {
            label: '第 1 版：已上传文件 ID',
          },
          submit_now: {
            label: '立即提交',
          },
        },
      },
      send_for_approval: {
        label: '送审',
        description: '结束法务审查并开启审批。须有一条通过的法务审查，且没有未决偏离，才能送审。',
        successMessage: '已送审，进入审批。',
      },
      start_signing: {
        label: '发起签署',
        description: '把已批准的合同推进到签署中。当前版本须为清稿，才能发起签署。',
        successMessage: '已进入签署。',
      },
      submit_contract: {
        label: '提交',
        description: '把草稿交出去。系统会定好它的审批路线，并指派一位法务审查；不需要法务审查的类型则直接送审。',
        successMessage: '合同已提交。',
      },
      start_renewal: {
        label: '发起续签',
        description: '按这份合同预填一份续签草稿，并回链到它。续签是一份新合同，不是状态变更。',
        successMessage: '续签草稿已创建。',
      },
      terminate_contract: {
        label: '终止',
        description: '确定终止这份合同吗？终止是终态——合同不能再恢复生效，只能另行续签。终止原因必填，会记录在合同上。',
        successMessage: '合同已终止。',
        params: {
          termination_reason: {
            helpText: '为什么提前结束：对方违约、不再需要、双方协商一致。法务与审计第一个问的就是这个。',
          },
        },
      },
      withdraw_contract: {
        label: '撤回',
        description: '撤回你自己的草稿。撤回后合同变为「已作废」，这是终态。',
        successMessage: '草稿已撤回，合同已作废。',
        confirmText: '确定撤回这份草稿吗？撤回后合同变为「已作废」，这是终态：不能再提交，也不能重新打开。之后如还要推进，请重新发起一份合同。',
      },
    },
    _views: {
      all_contracts: {
        label: '全部合同',
      },
      my_contracts: {
        label: '我发起的',
        description: '我发起的合同，按各自进行到哪一步分组。',
      },
      legal_intake: {
        label: '待受理',
        description: '已提交但还没有法务接手的合同。',
      },
      legal_in_review: {
        label: '我的审查',
        description: '指派给我做法务审查的合同。',
      },
      negotiating: {
        label: '谈判中',
        description: '球在对方手上，本轮开始最久的排在前面。',
      },
      status_kanban: {
        label: '状态看板',
        description: '全部合同按生命周期状态排列。',
      },
      expiry_calendar: {
        label: '到期日历',
        description: '合同分别在哪天到期。',
      },
      active_contracts: {
        label: '生效合同',
        description: '正在生效中的合同。',
      },
      pending_execution: {
        label: '待执行',
        description: '已签署或签署中，正等签字与执行形式做齐。',
      },
      pending_archive: {
        label: '待归档',
        description: '已结束但还没有档案号的合同。',
      },
      contract_register: {
        label: '合同台账',
        description: '完整台账，全部字段，可导出。',
      },
    },
    _sections: {
      identity: {
        label: '合同',
      },
      parties: {
        label: '签约方与负责人',
      },
      commercial: {
        label: '商务条款',
      },
      term: {
        label: '期限与续约',
      },
      legal: {
        label: '法律条款',
      },
      routing: {
        label: '路由与审批',
      },
      lifecycle: {
        label: '生命周期',
      },
      ai: {
        label: 'AI 审阅',
      },
      rollup: {
        label: '汇总',
      },
      archive: {
        label: '归档',
      },
    },
    _validations: {
      contract_entity_is_active_company: {
        message: '我方签约主体必须是仍在启用的我方法律主体，即类型为公司且处于启用状态的业务单元。部门、办事处或已停用的公司不能作为签约方。请从列表中选择签约主体，或请管理员在「设置 → 业务单元」中新增或重新启用它。',
      },
      contract_department_is_department: {
        message: '发起部门必须是部门，即类型为部门的业务单元。公司、事业部、办事处或成本中心不能作为发起部门。请从列表中选择部门、将此字段留空，或请管理员在「设置 → 业务单元」中新增该部门。',
      },
    },
  },

  clm_contract_version: {
    label: '合同版本',
    pluralLabel: '合同版本',
    description: '合同的一个文档版本：草稿、我方或对方的修订稿、清稿，或最终签署版。',
    fields: {
      display_name: {
        label: '版本',
        help: '自动维护的展示名，形如「v版本号 · 类别」。',
      },
      contract: {
        label: '合同',
      },
      version_no: {
        label: '版本号',
      },
      kind: {
        label: '类别',
        options: {
          draft: '草稿',
          internal_redline: '我方修订稿',
          counterparty_redline: '对方修订稿',
          clean: '清稿',
          final_signed: '最终签署版',
        },
      },
      turn: {
        label: '出稿方',
        help: '这一版由哪一方出。',
        options: {
          internal: '我方',
          counterparty: '对方',
        },
      },
      is_current: {
        label: '当前版本',
        help: '谈判当前所在的版本。只有当前版本是清稿时，合同才能进入签署。',
      },
      file: {
        label: '文件',
      },
      submitted_by: {
        label: '提交人',
      },
      notes: {
        label: '备注',
        help: '这一版改了什么，写给审查人看。',
      },
    },
    _sections: {
      version: {
        label: '版本',
      },
      document: {
        label: '文档',
      },
    },
  },
};
