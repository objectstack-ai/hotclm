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
    label: '合同类型',
    pluralLabel: '合同类型',
    description: '一种合同及其对应的流程：发起时填什么、要不要法务审查、怎么签署、需要哪些执行形式、用哪份模板。',
    fields: {
      name: {
        label: '名称',
      },
      code: {
        label: '代号',
        help: '合同编号里用的大写短前缀，例如 NDA、PUR、SAL。',
      },
      direction: {
        label: '方向',
        options: {
          sales: '销售',
          purchase: '采购',
          other: '其他',
        },
      },
      category: {
        label: '类别',
        help: '流程类别，决定走哪条审批矩阵和哪套条款库。与 HotCRM 的商务类型不是一回事。',
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
      description: {
        label: '说明',
      },
      intake_fields: {
        label: '发起时填写的字段',
        help: '这种类型在发起表单上额外显示并要求填写的可选字段。核心字段任何类型都会问。只有发起人有权写入的字段才放这里。',
        options: {
          governing_law: '适用法律',
          payment_terms: '付款条件',
          confidentiality_term_months: '保密期限',
          auto_renew: '自动续约',
          parent_contract: '主合同',
        },
      },
      requires_legal_review: {
        label: '需要法务审查',
        help: '关闭时，这种类型的合同提交后直接进入审批，不经法务审查。',
      },
      execution_formalities: {
        label: '执行形式',
        help: '合同生效前必须完成并在签署记录上登记的形式。公司盖章、公证、见证属于特定地区或特定文书的要求，多数类型都不需要。',
        options: {
          countersigned_copy: '回签副本已收到',
          company_seal: '加盖公司印章',
          notarized: '已公证',
          witnessed: '有见证人',
        },
      },
      sign_method: {
        label: '签署方式',
        help: '这种类型通常怎么签。电子签走已配置的服务商（DocuSign、Adobe Acrobat Sign、Dropbox Sign，或本地区服务商）；湿签登记上传的执行副本。',
        options: {
          esign: '电子签',
          wet_ink: '湿签',
          either: '两者均可',
        },
      },
      review_sla_days: {
        label: '审查时限（天）',
        help: '法务完成审查的自然日天数，超时会触发催办提醒。',
      },
      template_file: {
        label: '模板',
        help: '起草首版所依据的文档。平台目前没有文档渲染引擎，发起表单会把模板和占位符清单交给起草人。',
      },
      template_placeholders: {
        label: '模板占位符',
        help: '由 { key, label, type, required } 组成的数组，形状与平台文档模板的占位符一致。',
      },
      default_term_months: {
        label: '默认期限（月）',
      },
      retention_years: {
        label: '保留年限（年）',
        help: '这种类型的合同归档后保留多久才可以处置。',
      },
      is_active: {
        label: '启用',
        help: '停用的类型不再出现在发起表单上；已有合同保持不变。',
      },
    },
    _views: {
      all_contract_types: {
        label: '合同类型',
      },
    },
    _sections: {
      identity: {
        label: '基本信息',
      },
      workflow: {
        label: '流程',
      },
      template: {
        label: '模板',
      },
      terms: {
        label: '默认值与保留',
      },
    },
  },

  clm_clause: {
    label: '条款',
    pluralLabel: '条款库',
    description: '条款库中的一条条款：标准表述、退让表述、风险等级，以及适用的合同类别。',
    fields: {
      title: {
        label: '标题',
      },
      category: {
        label: '类别',
        options: {
          liability: '责任',
          payment: '付款',
          termination: '终止',
          confidentiality: '保密',
          ip: '知识产权',
          warranty: '质量保证',
          dispute: '争议解决',
          other: '其他',
        },
      },
      risk_level: {
        label: '风险等级',
        options: {
          low: '低',
          medium: '中',
          high: '高',
        },
      },
      standard_text: {
        label: '标准表述',
        help: '公司谈判的起始立场。',
      },
      fallback_text: {
        label: '退让表述',
        help: '法务无需上报即可接受的立场。留空表示只接受标准表述。',
      },
      position_note: {
        label: '底线说明',
        help: '公司在这条条款上不接受什么，用谈判人员看得懂的话写。',
      },
      applies_to: {
        label: '适用范围',
        help: '预期出现这条条款的合同类别。留空表示适用于全部类别。',
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
      requires_legal_head: {
        label: '偏离需法务负责人审批',
        help: '这条条款一旦接受偏离，合同就要多爬一级法务负责人的审批台阶。',
      },
      is_active: {
        label: '启用',
      },
    },
    _views: {
      all_clauses: {
        label: '条款库',
      },
    },
    _sections: {
      identity: {
        label: '条款',
      },
      wording: {
        label: '立场表述',
      },
      scope: {
        label: '适用范围',
      },
    },
  },

  clm_approval_rule: {
    label: '审批规则',
    pluralLabel: '审批矩阵',
    description: '审批矩阵的一行：命中哪些合同，以及这些合同要爬哪几级审批台阶。',
    fields: {
      name: {
        label: '名称',
      },
      applies_to: {
        label: '适用合同类别',
        help: '留空表示适用于全部类别。',
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
        options: {
          any: '不限',
          sales: '销售',
          purchase: '采购',
          other: '其他',
        },
      },
      amount_min: {
        label: '金额下限',
        help: '命中的合同金额下限，含本数。留空表示不设下限。',
      },
      amount_max: {
        label: '金额上限',
        help: '命中的合同金额上限，不含本数。留空表示不设上限。',
      },
      only_with_deviation: {
        label: '仅限有偏离时',
        help: '只命中至少接受了一条条款偏离的合同。',
      },
      priority: {
        label: '优先级',
        help: '数值小的先执行。每条命中的规则都会贡献自己的台阶，合同要爬的是这些台阶的并集。',
      },
      route_legal_head: {
        label: '法务负责人',
      },
      route_finance: {
        label: '财务负责人',
      },
      route_executive: {
        label: '分管领导',
      },
      route_gm: {
        label: '总经理',
      },
      is_active: {
        label: '启用',
      },
    },
    _validations: {
      approval_rule_amount_band: {
        message: '金额下限必须小于金额上限。',
      },
    },
    _views: {
      all_approval_rules: {
        label: '审批矩阵',
      },
    },
    _sections: {
      match: {
        label: '命中条件',
      },
      route: {
        label: '经过台阶',
      },
    },
  },

  clm_party: {
    label: '相对方',
    pluralLabel: '相对方',
    description: '合同的另一方，可以是公司、个人或政府机构，含登记信息、联系人和银行信息。',
    fields: {
      name: {
        label: '名称',
      },
      party_kind: {
        label: '类型',
        options: {
          company: '公司',
          individual: '个人',
          government: '政府机构',
          other: '其他',
        },
      },
      country_code: {
        label: '国家 / 地区',
        help: '相对方所在国家或地区的两位代码，例如 US、DE、CN。适用法律的默认值和名单筛查都以它为准。',
      },
      registration_no: {
        label: '统一社会信用代码 / 税号',
        help: '公司登记号、增值税号或同等的全国性识别号。填写后在本组织内唯一。',
      },
      legal_representative: {
        label: '法定代表人',
      },
      address: {
        label: '地址',
      },
      contact_name: {
        label: '联系人',
      },
      contact_phone: {
        label: '联系电话',
      },
      contact_email: {
        label: '联系邮箱',
      },
      bank_name: {
        label: '开户行',
      },
      bank_account: {
        label: '银行账号',
      },
      risk_flag: {
        label: '风险标记',
        help: '标记为禁止合作的相对方不能被选到新合同上。',
        options: {
          none: '无',
          watch: '关注',
          blocked: '禁止合作',
        },
      },
      risk_note: {
        label: '风险说明',
      },
      screening_status: {
        label: '筛查结果',
        help: '最近一次制裁名单与登记信息筛查的结果。配置了筛查连接器时由连接器写入，否则由法务填写。',
        options: {
          not_screened: '未筛查',
          clear: '通过',
          hit: '命中',
        },
      },
      screened_at: {
        label: '筛查时间',
      },
      is_active: {
        label: '启用',
      },
    },
    _views: {
      all_parties: {
        label: '相对方',
      },
    },
    _sections: {
      identity: {
        label: '基本信息',
      },
      contact: {
        label: '联系方式',
      },
      banking: {
        label: '银行信息',
      },
      risk: {
        label: '风险',
      },
    },
  },
};
