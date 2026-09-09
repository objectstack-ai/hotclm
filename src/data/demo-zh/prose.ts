// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * `demo-zh` 的文字池 —— 与 `../demo-en/prose.ts` 逐项对应的中文版。
 *
 * 每个池的长度由 `../strings.ts` 钉死，`../plan.ts` 按确定的下标取用。这就是
 * `demo-en` 与 `demo-zh` 行级一致的原因：两份 bundle 在同样的位置提供不同语言的
 * 字符串，而计划本身从不知道自己正在为哪一种语言生成。
 */

/** 同一相对方、同一类型的第二份合同用它区分。 */
export const TITLE_QUALIFIERS: readonly string[] & { length: 8 } = [
  '续签',
  '二期',
  '欧洲主体',
  '亚太主体',
  '延期',
  '试点',
  '区域',
  '扩容',
] as const;

/** 风险备注：两家已封禁的相对方与一家列入观察的相对方。 */
export const RISK_NOTES: readonly string[] & { length: 3 } = [
  '制裁名单筛查在控股股东处命中。法务负责人解除前不得开展新业务。',
  '公司登记信息未能在任何国家登记机关核验通过。在提供设立证明前封禁。',
  '过去十二个月内两次逾期付款。任何授信展期前财务要求先行会商。',
] as const;

export const OBLIGATION_TITLES = {
  deliverable: [
    '提交实施方案',
    '完成用户验收测试',
    '移交配置基线',
    '提供迁移操作手册',
    '交付培训材料',
    '完成集成开发',
  ] as readonly string[] & { length: 6 },
  payment: [
    '开具季度发票',
    '结算里程碑发票',
    '完成年度差额结算',
    '释放质保金',
  ] as readonly string[] & { length: 4 },
  report: [
    '提交季度服务报告',
    '提供年度安全声明',
    '更新次级处理者清单',
    '提交用量报表',
  ] as readonly string[] & { length: 4 },
  renewal: [
    '发出不续签通知',
    '与业务方确认续签立场',
    '启动续签谈判',
  ] as readonly string[] & { length: 3 },
  compliance: [
    '更新保险凭证',
    '完成年度制裁名单复筛',
    '确认跨境传输保障措施仍然有效',
    '提供反商业贿赂合规声明',
  ] as readonly string[] & { length: 4 },
  other: [
    '更新合同台账条目',
    '归档已签署副本',
    '确认联系人信息仍然有效',
  ] as readonly string[] & { length: 3 },
} as const;

export const PAYMENT_CONDITIONS: readonly string[] & { length: 6 } = [
  '协议签署后支付。',
  '里程碑交付物验收后支付。',
  '按季预付，于每季度第一个工作日支付。',
  '货物交付并检验合格后支付。',
  '年度服务期满后支付。',
  '质保金，最终验收满三十日后释放。',
] as const;

export const REVIEW_COMMENTS: readonly string[] & { length: 8 } = [
  '条款均在条款库范围内，送审前无需修改。',
  '责任上限高于我方标准立场，业务方已书面接受该敞口。',
  '应相对方要求将账期延长至六十日，已与财务会商。',
  '数据处理附件需先写明跨境传输机制，本合同方可继续推进。',
  '有两条条款超出条款库，已登记为偏离，均需决定。',
  '相对方红线删除了审计权。该点不可接受，恢复我方文本。',
  '范围清晰，里程碑安排与商务方案一致。',
  '适用法律改为相对方所在法域。鉴于存在执行条约，此处可以接受。',
] as const;

export const REVIEW_INTERNAL_NOTES: readonly string[] & { length: 6 } = [
  '业务方时间压力大，但不能让它左右责任条款的立场。',
  '相对方律师在此前两单上都让过这一点，坚持我方立场。',
  '注意赔偿条款：对方草案把范围收窄到已登记权利。',
  '财务已提示该相对方的付款历史，抵销权必须保留。',
  '若对方再次要求删除审计条款，上报而不是让步。',
  '对方这一版标准文本明显好于上次，值得沿用。',
] as const;

export const DEVIATION_TEXTS: readonly string[] & { length: 8 } = [
  '相对方要求将责任总额上限提高到年度费用的三倍。',
  '相对方要求删除双向的间接损失排除条款。',
  '相对方要求账期由三十日延长至九十日。',
  '相对方要求完全取消需方的抵销权。',
  '相对方要求保留定制交付物的所有权，仅给予与合同期等长的许可。',
  '相对方要求从数据处理附件中删除审计权。',
  '相对方要求由其自行决定、不设上限的年度涨价。',
  '相对方要求将保密义务存续期缩短至十二个月。',
] as const;

export const DEVIATION_JUSTIFICATIONS: readonly string[] & { length: 6 } = [
  '该相对方是唯一具备本范围资质的供应商，且不肯让步。',
  '商务价值足以覆盖该敞口，业务负责人已书面接受。',
  '与该相对方上一份协议中已接受同样的立场。',
  '拒绝会使项目推迟到董事会批准的启动日期之后。',
  '本项目为固定总价，实际敞口有界。',
  '业务方提出但未给出理由，法务建议拒绝。',
] as const;

export const SIGNATURE_NOTES: readonly string[] & { length: 4 } = [
  '信封已发给双方签署人，等待相对方签署。',
  '双方均已电子签署，回签副本已归档。',
  '湿签流程：原件已快递互换，公司印章已加盖。',
  '公证已预约，见证副本仍未取得。',
] as const;

/** 与 `../plan.ts` 中三个适用法律一一对应的法院或仲裁地。 */
export const TERMINATION_REASONS: readonly string[] & { length: 4 } = [
  '对方严重违约：连续三个交付节点逾期，书面催告后仍未补正。',
  '业务需求撤销——该合同支持的项目在年中评审时取消。',
  '双方协商一致终止；已结清余款并相互免责。',
  '对方进入破产程序，依破产条款即时终止。',
] as const;

export const JURISDICTIONS: readonly string[] & { length: 3 } = [
  '美国纽约州纽约县法院',
  '英格兰和威尔士法院（伦敦）',
  '德国美因河畔法兰克福州法院',
] as const;
