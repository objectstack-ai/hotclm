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
import { catalog } from './objects.catalog.js';
import { contract } from './objects.contract.js';

// A select screen field draws its options from the object field it asks for
// (`optionsOf()` in the flow), so its option words are that field's words.
const contractOptions = (field: string) => contract.clm_contract!.fields![field]!.options!;

export const flowSurface: Pick<TranslationData, 'flows'> = {
  flows: {
    contract_intake: {
      label: '发起合同',
      successMessage: '合同已发起。',
      screens: {
        screen_core: {
          title: '合同信息',
          description: '先填每份合同都有的核心条款，再填这类合同要求的字段。',
          fields: {
            intakeFields: { label: '发起时填写的字段' },
            title: { label: '标题', placeholder: '例如：与 Acme 的双向保密协议' },
            amount: { label: '合同金额' },
            currency_code: { label: '币种', options: contractOptions('currency_code') },
            is_amount_estimated: { label: '金额为估算值' },
            start_date: { label: '生效日期' },
            end_date: { label: '到期日期' },
            term_months: { label: '期限（月）', placeholder: '可代替到期日期填写' },
            summary: { label: '摘要', placeholder: '用几句话说明这笔交易' },
            governing_law: { label: '适用法律', placeholder: '例如：US-NY、英格兰和威尔士' },
            payment_terms: { label: '付款条件', options: contractOptions('payment_terms') },
            confidentiality_term_months: { label: '保密期限（月）' },
            auto_renew: { label: '自动续约' },
            parent_contract: { label: '主合同（记录 ID）', placeholder: '本合同所属的框架合同或主合同' },
          },
        },
        screen_party: {
          title: '新建相对方',
          description: '没有选择相对方，在这里新建一个。之后由法务维护它的风险标记和筛查结果。',
          fields: {
            new_party_name: { label: '名称' },
            new_party_kind: { label: '类型', options: catalog.clm_party!.fields!.party_kind!.options! },
            new_party_registration_no: { label: '统一社会信用代码 / 税号' },
            new_party_contact_name: { label: '联系人' },
            new_party_contact_email: { label: '联系邮箱' },
          },
        },
        screen_document: {
          title: '首个版本',
          description: '这份合同的起点文件。默认在下一步上传。',
          fields: {
            templateAvailable: { label: '有模板' },
            draft_from_template: {
              label: '从模板起草',
              inlineHelpText: '这类合同带有模板。勾选后，模板会作为第 1 版附上，不用再上传文件。',
            },
          },
        },
        screen_upload: {
          title: '上传首个版本',
          description: '这份合同的起点文件，它会成为第 1 版。',
        },
        screen_schedule: {
          title: '提交合同',
          description: '选择是否现在提交。提交后，合同按类型的设置进入法务审查或审批。',
          fields: {
            submit_now: { label: '立即提交' },
          },
        },
      },
    },
    renewal_start: {
      refusals: {
        refuse_existing: { message: '这份合同已有续签草稿（{{ existingRenewal.contract_number }}）。请打开那一份，不要再发起第二份。' },
      },
    },
    contract_approval: {
      label: '合同审批',
      approvals: {
        manager_review: { label: '直属上级' },
        legal_finance_joint: { label: '法务负责人 + 财务负责人（会签）' },
        legal_only: { label: '法务负责人' },
        finance_only: { label: '财务负责人' },
        executive_signoff: { label: '分管领导' },
        gm_signoff: { label: '总经理' },
      },
    },
  },
};
