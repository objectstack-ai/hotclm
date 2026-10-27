// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * 七个岗位与五个权限集 —— 管理员在 Setup 里分配岗位、授予权限集时看到的名称与说明。
 * `@objectstack/spec` 18.2 起可翻译。岗位名与 DESIGN.md §04 一致。
 */
import type { TranslationData } from '@objectstack/spec/system';

export const securitySurface: Pick<TranslationData, 'positions' | 'permissions'> = {
  positions: {
    clm_legal_counsel: {
      label: '法务经办',
      description: '审查并谈判合同。可查看、编辑所有合同；受理提交并主持审查。',
    },
    clm_legal_head: {
      label: '法务负责人',
      description: '审批阶梯中的法务台阶。合同范围与法务经办相同；接收审查超时提醒。',
    },
    clm_finance_controller: {
      label: '财务负责人',
      description: '审批阶梯中的财务台阶。合同审批通过后可编辑（法务字段和状态除外）；负责付款计划。',
    },
    clm_executive: {
      label: '分管领导',
      description: '查看流转到分管领导台阶的合同。',
    },
    clm_general_manager: {
      label: '总经理',
      description: '查看流转到总经理台阶的合同。',
    },
    clm_records_manager: {
      label: '档案与记录管理员',
      description: '执行登记、归档与合同台账：查看已审批合同以发起签署；合同进入签署后，只可编辑执行与归档字段。',
    },
    clm_admin: {
      label: 'CLM 管理员',
      description: '维护配置数据，可访问所有合同管理数据。',
    },
  },
  permissions: {
    clm_admin: {
      label: 'CLM 管理员',
      description: '可访问所有合同管理数据与配置数据：合同类型、条款库、审批矩阵、相对方。',
    },
    clm_finance: {
      label: '财务',
      description: '财务负责人使用：已审批合同、付款计划、财务审查与相对方银行信息。',
    },
    clm_legal: {
      label: '法务',
      description: '法务经办与法务负责人使用：所有合同、所有审查、条款库。',
    },
    clm_records: {
      label: '档案',
      description: '档案与记录管理员使用：执行登记、归档与合同台账。',
    },
    clm_requester: {
      label: '业务承办',
      description: '全体员工：发起合同，跟进自己合同的审查与审批，履行分配给自己的履约事项。',
    },
  },
};
