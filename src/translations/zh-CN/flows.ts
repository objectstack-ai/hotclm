/**
 * Screen-flow copy: the intake wizard (F1, `contract_intake`) — the flow's own
 * label, each screen's heading, and each field's label and placeholder.
 *
 * Addressed under the flow that owns it (`flows.<flow>.screens.<node_id>`), as
 * `TranslationDataSchema.flows` spells it. Field labels reuse the object
 * bundle's words for the same columns, so the wizard and the record page agree.
 * The Cancel / Submit chrome around each screen is the console's own catalog,
 * not this bundle's.
 */
import type { TranslationData } from '@objectstack/spec/system';

export const flowSurface: Pick<TranslationData, 'flows'> = {
  flows: {
    contract_intake: {
      label: '发起合同',
      screens: {
        screen_core: {
          title: '合同信息',
          fields: {
            intakeFields: { label: '发起时填写的字段' },
            title: { label: '标题', placeholder: '例如：与 Acme 的双向保密协议' },
            our_entity: { label: '我方签约主体' },
            department: { label: '发起部门' },
            amount: { label: '合同金额' },
            currency_code: { label: '币种' },
            is_amount_estimated: { label: '金额为估算值' },
            start_date: { label: '生效日期' },
            end_date: { label: '到期日期' },
            term_months: { label: '期限（月）', placeholder: '可代替到期日期填写' },
            summary: { label: '摘要', placeholder: '用几句话说明这笔交易' },
            governing_law: { label: '适用法律', placeholder: '例如：US-NY、英格兰和威尔士' },
            payment_terms: { label: '付款条件' },
            confidentiality_term_months: { label: '保密期限（月）' },
            auto_renew: { label: '自动续约' },
            parent_contract: { label: '主合同（记录 ID）', placeholder: '本合同所属的框架合同或主合同' },
          },
        },
        screen_party: {
          title: '新建相对方',
          fields: {
            new_party_name: { label: '名称' },
            new_party_kind: { label: '类型' },
            new_party_registration_no: { label: '统一社会信用代码 / 税号' },
            new_party_contact_name: { label: '联系人' },
            new_party_contact_email: { label: '联系邮箱' },
          },
        },
        screen_document: {
          title: '首个版本',
          fields: {
            draft_from_template: { label: '从模板起草' },
          },
        },
        screen_upload: {
          title: '上传首个版本',
        },
        screen_schedule: {
          title: '提交合同',
          fields: {
            submit_now: { label: '立即提交' },
          },
        },
      },
    },
  },
};
