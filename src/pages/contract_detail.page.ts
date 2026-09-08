import type { Page } from '@objectstack/spec/ui';

/**
 * The contract record page — DESIGN.md §05's 合同详情页, slotted.
 *
 * §05 spells the shape out: header actions shown by status AND gate,
 * highlights, a `path` over the seven pre-terminal statuses, and seven tabs
 * including the platform discussion slot. `kind: 'slotted'` is that sentence
 * literally: the slot menu IS `header | actions | alerts | highlights |
 * details | tabs | discussion`, each a full replacement at the slot boundary,
 * with every slot left unset falling through to the synthesized default.
 *
 * ## Filters on this page
 *
 * Every `record:related_list` `filter` is the rule-object form
 * `RecordRelatedListProps` declares — `[{ field, operator, value }]`, the
 * operator from `VIEW_FILTER_OPERATORS`. The AST array form
 * (`[['status', '!=', 'done']]`) and the `op:` key are rejected at build, and
 * this page has exactly one filter (the approval tab's `object_name` cut),
 * written in that shape and checked against the schema rather than copied from
 * a sibling — HotCRM's AGENTS.md records that every `record:related_list`
 * filter under its own `src/pages/` is one of the rejected forms.
 *
 * ## Why 22 labels on this page are inline `{ en, 'zh-CN' }` maps (card 11)
 *
 * `I18nLabelSchema` authorizes two forms for a display label: a plain string
 * whose translations live in a bundle, and an inline locale map picked at
 * render time. Everything else this repo authors uses the first form —
 * translators never open a `*.object.ts` — and this page uses the second,
 * because for these 22 strings THE FIRST FORM HAS NO KEY.
 *
 * Measured, not assumed. `walkAddressedPageComponents` (`@objectstack/spec`
 * 17.3.0) is the traversal `translatePage` runs to decide what
 * `pages.<name>.components.<id>.*` addresses, and it addresses **zero**
 * components on this page:
 *
 *     import { walkAddressedPageComponents } from '@objectstack/spec/system';
 *     let n = 0; walkAddressedPageComponents(ContractDetailPage, (c) => (n++, c));
 *     // -> 0        (21 components and tab labels are authored below)
 *
 * Two independent reasons, either of which alone is enough. The walk's roots
 * are `regions[].components[]` and this page is `kind: 'slotted'`, so its
 * `slots` are not roots at all. And the descent is `properties.children` only,
 * so `page:tabs` `items[].children` would be out of reach even on a regions
 * page — which also means a TAB LABEL (`items[].label`) has no bundle key on
 * any page, of any kind.
 *
 * So `pages.contract_detail` carries exactly two bundle keys, `label` and
 * `description`, and the seven tab labels, seven path stages, seven related-list
 * titles and one block label below could not be translated by a bundle if one
 * were written. The inline map is the spec's own ruled route for page copy the
 * bundle cannot address, not a workaround for it — `translation.zod.ts` says so
 * where it declines to add `content` to the page-component key face: "The
 * inline locale map is the ruled route for page prose".
 *
 * ⚠️ THE GATE CANNOT SEE THESE. `os i18n check` counts bundle keys, and an
 * inline map is invisible to it (the extractor skips a label already in map
 * form — it is multilingual, so no key is scaffolded). Adding an eighth tab
 * with a plain-string label would therefore ship an English tab on a zh-CN
 * console and `pnpm lint:i18n-gate` would stay green. The section labels one
 * level down are NOT in this class and are deliberately left as plain strings:
 * they carry `name`, which resolves `objects.clm_contract._sections.<name>.label`
 * from the bundle, and the gate does cover those.
 *
 * ## What §05 asks for that this page renders differently, and why
 *
 * - **版本（timeline）** — the page-component vocabulary has no timeline
 *   member (`ComponentPropsMap` has `record:related_list`, `record:activity`,
 *   `record:history`, no `record:timeline`), and a `type: 'timeline'` LIST VIEW
 *   is a list-page visualization, not something a tab can mount. The versions
 *   tab is therefore a related list ordered newest-first, which is the same
 *   chronology in a different frame. Reported, not silently substituted.
 * - **发起续签** is missing from the header action list because F12 is card 09;
 *   see `contract-lifecycle.actions.ts` for the full accounting of §05's seven.
 */
export const ContractDetailPage: Page = {
  name: 'contract_detail',
  label: 'Contract',
  description: 'The contract record: lifecycle path, key terms, versions, review, approvals, obligations, signing and discussion.',

  type: 'record',
  object: 'clm_contract',
  kind: 'slotted',
  template: 'full-width',

  // The object's default record page for every audience. No
  // `assignedProfiles`: §05 gives the five audiences ONE detail page and varies
  // what they can do on it through the header actions' `requiredPermissions`
  // and through §04's FLS, not through five page layouts.
  isDefault: true,

  slots: {
    /**
     * §05: header 挂「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止」动作,按 status
     * 与门控显隐.
     *
     * `PageHeaderProps.actions` is `z.array(z.string())` — action IDs, not
     * definitions — so the display rules travel with the ACTION, not with this
     * list: each of the six carries `visible` (a CEL predicate on
     * `record.status`) and, where §04 names one, `requiredPermissions`. Listing
     * all six here and letting each decide is what makes the header change
     * shape as a contract moves; a custom record page replaces the default
     * header, so an action not named here is unreachable from the record.
     */
    header: {
      type: 'page:header',
      id: 'contract_header',
      properties: {
        title: '{contract_number}',
        subtitle: '{title}',
        breadcrumb: true,
        actions: [
          'submit_contract',
          'accept_contract',
          'send_for_approval',
          'start_signing',
          'activate_contract',
          'terminate_contract',
        ],
      },
    },

    /**
     * §05: highlights 编号 · 相对方 · 金额 · 到期日 · 当前轮次, then the path.
     *
     * Both components in one slot array because §05 puts both above the body
     * and the slot menu has no `path` member. Order matters: the strip reads
     * "what is this contract", the path reads "where has it got to".
     *
     * The path lists the SEVEN PRE-TERMINAL statuses §05 names and stops at
     * `active`. `expired` / `terminated` / `cancelled` / `rejected` are
     * deliberately absent: a path is the forward road, and the object's status
     * field carries all eleven values for the places that need them (the kanban
     * board, the status column). A contract in a terminal state lights no step,
     * which is the honest reading of "this contract has left the road" — and is
     * why the highlights strip beside it carries `status`-adjacent facts rather
     * than relying on the path alone.
     */
    highlights: [
      {
        type: 'record:highlights',
        id: 'contract_highlights',
        properties: {
          fields: ['contract_number', 'party', 'amount', 'end_date', 'current_turn'],
        },
      },
      {
        type: 'record:path',
        id: 'contract_path',
        properties: {
          statusField: 'status',
          stages: [
            { value: 'draft', label: { en: 'Draft', 'zh-CN': '草稿' } },
            { value: 'submitted', label: { en: 'Submitted', 'zh-CN': '已提交' } },
            { value: 'in_review', label: { en: 'In Review', 'zh-CN': '审查中' } },
            { value: 'in_approval', label: { en: 'In Approval', 'zh-CN': '审批中' } },
            { value: 'approved', label: { en: 'Approved', 'zh-CN': '已批准' } },
            { value: 'signing', label: { en: 'Signing', 'zh-CN': '签署中' } },
            { value: 'active', label: { en: 'Active', 'zh-CN': '生效中' }, terminal: 'won' },
          ],
        },
      },
    ],

    /**
     * The seven tabs of §05, in the order a contract passes through them.
     *
     * `tabStyle`, not `type`: a props key named `type` collides with the
     * component node's own dispatch key and was removed at protocol 17. Item
     * keys are `value`, not `key` — `value` is the `?tab=` URL token the
     * renderer reads, which is what makes a tab linkable.
     */
    tabs: {
      type: 'page:tabs',
      id: 'contract_tabs',
      properties: {
        tabStyle: 'line',
        position: 'top',
        items: [
          {
            // 概要
            value: 'overview',
            label: { en: 'Overview', 'zh-CN': '概要' },
            children: [
              {
                type: 'record:details',
                id: 'contract_details',
                properties: {
                  columns: '2',
                  // Sections enumerate their `fields`, mirroring the object's
                  // own `fieldGroups` — NOT the `{ group: 'parties' }` reference
                  // form. That form is declared (`RecordDetailsProps.sections`,
                  // #13855) and this console pin does not implement it: with
                  // `{ group: … }` sections the whole tab rendered the panel
                  // *Component "record:details" failed to render — Cannot read
                  // properties of undefined (reading 'name')*, because
                  // `RecordDetailsRenderer` maps every section through `s.name`
                  // and a group reference carries none. Reported upstream; the
                  // enumerated form is the other DECLARED spelling of the same
                  // fact, not a workaround fixture.
                  //
                  // ⚠️ KNOWN RENDERING DEFECT, platform side, reported not
                  // patched (AGENTS.md "Platform gaps"): an enumerated
                  // `fields` section renders each field's RAW KEY as its label
                  // — `OUR_ENTITY`, `TERM_MONTHS` — instead of the `label:` the
                  // object declares. Measured against two controls in the same
                  // session: this object's own list views render the same
                  // fields' labels correctly (`Contract Number`, `Counterparty`,
                  // `Contract Amount`), and the platform's SYNTHESIZED default
                  // record page for `clm_party` renders `REGISTRATION / TAX ID`
                  // and `LEGAL REPRESENTATIVE` — so the labels resolve
                  // everywhere except here. The synthesized page reaches them
                  // through the group-derived path, which is the same path the
                  // `{ group: … }` section form above would have used and which
                  // throws. Both halves are one story: the group-derived body
                  // works and the enumerated one is second-class.
                  //
                  // `identity` is deliberately absent: `contract_number` is the
                  // page H1, `title` its subtitle, and `record:details` drops
                  // every field the mounted highlights strip already registered
                  // — a section built only from duplicates renders nothing at
                  // all, silently.
                  sections: [
                    { name: 'parties', label: 'Parties & Owners', columns: 2,
                      fields: ['party', 'our_entity', 'department', 'owner_id', 'legal_owner', 'current_turn', 'turn_since'] },
                    { name: 'commercial', label: 'Commercial Terms', columns: 2,
                      fields: ['amount', 'currency_code', 'is_amount_estimated', 'payment_terms', 'liability_cap'] },
                    { name: 'term', label: 'Term & Renewal', columns: 2,
                      fields: ['start_date', 'end_date', 'term_months', 'auto_renew', 'renewal_notice_days', 'renewed_from', 'parent_contract', 'is_expiring'] },
                    { name: 'legal', label: 'Legal', columns: 2,
                      fields: ['governing_law', 'jurisdiction', 'contract_language', 'confidentiality_term_months', 'execution_formalities', 'risk_level', 'summary'] },
                    { name: 'rollup', label: 'Roll-ups', columns: 2,
                      fields: ['version_count', 'open_deviation_count', 'overdue_obligation_count', 'planned_amount', 'actual_amount'] },
                    { name: 'routing', label: 'Routing & Approval', columns: 2,
                      fields: ['route_legal_head', 'route_finance', 'route_executive', 'route_gm', 'approval_status'] },
                    { name: 'lifecycle', label: 'Lifecycle', columns: 2,
                      fields: ['submitted_at', 'review_started_at', 'approved_at', 'signed_at', 'executed_at', 'activated_at', 'closed_at', 'archived_at'] },
                    { name: 'ai', label: 'AI Review', columns: 2,
                      fields: ['ai_summary', 'ai_risk_score', 'ai_risk_rationale', 'ai_reviewed_at'] },
                  ],
                },
              },
            ],
          },
          {
            // 版本 — newest first; see the file header on §05's "(timeline)".
            value: 'versions',
            label: { en: 'Versions', 'zh-CN': '版本' },
            children: [
              {
                type: 'record:related_list',
                id: 'contract_versions',
                properties: {
                  objectName: 'clm_contract_version',
                  relationshipField: 'contract',
                  title: { en: 'Versions', 'zh-CN': '版本' },
                  columns: ['display_name', 'version_no', 'kind', 'turn', 'is_current', 'file', 'submitted_by', 'created_at'],
                  sort: [{ field: 'version_no', order: 'desc' }],
                  limit: 20,
                },
              },
            ],
          },
          {
            // 审查与偏离 — the two objects legal works in, on one tab because
            // a deviation only means anything beside the review that raised it.
            value: 'review',
            label: { en: 'Review & Deviations', 'zh-CN': '审查与偏离' },
            children: [
              {
                type: 'record:related_list',
                id: 'contract_reviews',
                properties: {
                  objectName: 'clm_review',
                  relationshipField: 'contract',
                  title: { en: 'Reviews', 'zh-CN': '审查' },
                  columns: ['display_name', 'stage', 'reviewer', 'decision', 'risk_level_assessed', 'started_at', 'decided_at'],
                  sort: [{ field: 'started_at', order: 'desc' }],
                  limit: 10,
                },
              },
              {
                type: 'record:related_list',
                id: 'contract_deviations',
                properties: {
                  objectName: 'clm_deviation',
                  relationshipField: 'contract',
                  title: { en: 'Deviations', 'zh-CN': '偏离' },
                  columns: ['display_name', 'clause', 'requested_position', 'status', 'decided_by', 'decided_at'],
                  sort: [{ field: 'created_at', order: 'desc' }],
                  limit: 10,
                },
              },
            ],
          },
          {
            // 审批记录 — the platform's own `sys_approval_request` rows, which
            // F5 opens. `record_id` is the request's pointer at the record and
            // `object_name` says which object it points into, so BOTH are
            // needed: without the filter this list would show every approval
            // request whose `record_id` happens to collide across objects.
            value: 'approvals',
            label: { en: 'Approvals', 'zh-CN': '审批记录' },
            children: [
              {
                type: 'record:related_list',
                id: 'contract_approvals',
                properties: {
                  objectName: 'sys_approval_request',
                  relationshipField: 'record_id',
                  title: { en: 'Approval Requests', 'zh-CN': '审批请求' },
                  filter: [{ field: 'object_name', operator: 'equals', value: 'clm_contract' }],
                  sort: [{ field: 'created_at', order: 'desc' }],
                  limit: 10,
                },
              },
            ],
          },
          {
            // 履约与收付款
            value: 'performance',
            label: { en: 'Obligations & Payments', 'zh-CN': '履约与收付款' },
            children: [
              {
                type: 'record:related_list',
                id: 'contract_obligations',
                properties: {
                  objectName: 'clm_obligation',
                  relationshipField: 'contract',
                  title: { en: 'Obligations', 'zh-CN': '履约义务' },
                  columns: ['display_name', 'title', 'kind', 'due_date', 'owner', 'status'],
                  sort: [{ field: 'due_date', order: 'asc' }],
                  limit: 10,
                },
              },
              {
                type: 'record:related_list',
                id: 'contract_payments',
                properties: {
                  objectName: 'clm_payment_plan',
                  relationshipField: 'contract',
                  title: { en: 'Payment Schedule', 'zh-CN': '收付款计划' },
                  columns: ['display_name', 'seq', 'planned_date', 'planned_amount', 'status', 'actual_date', 'actual_amount', 'invoice_no'],
                  sort: [{ field: 'seq', order: 'asc' }],
                  limit: 12,
                },
              },
            ],
          },
          {
            // 签署与归档 — the signature records, then the archive facts that
            // F7 and F14 stamp. The details block is a second section on the
            // same tab because "is it archived" is a property of the contract,
            // not of a signature row.
            value: 'signing',
            label: { en: 'Signing & Archive', 'zh-CN': '签署与归档' },
            children: [
              {
                type: 'record:related_list',
                id: 'contract_signatures',
                properties: {
                  objectName: 'clm_signature',
                  relationshipField: 'contract',
                  title: { en: 'Signature Records', 'zh-CN': '签署记录' },
                  columns: ['display_name', 'method', 'provider', 'status', 'formalities_done', 'executed_file', 'completed_at'],
                  sort: [{ field: 'created_at', order: 'desc' }],
                  limit: 10,
                },
              },
              {
                type: 'record:details',
                id: 'contract_archive_details',
                label: { en: 'Archive', 'zh-CN': '归档' },
                properties: {
                  columns: '2',
                  sections: [
                    {
                      name: 'archive',
                      label: 'Archive',
                      columns: 2,
                      fields: ['archive_no', 'archived_at', 'executed_at', 'signed_at', 'execution_formalities', 'is_backfilled'],
                    },
                  ],
                },
              },
            ],
          },
          {
            // 讨论 — §05's "平台 discussion slot,评论与 @".
            //
            // `record:discussion` and `record:chatter` are ONE renderer under
            // two registered names sharing one props schema; `discussion` is
            // the registration-preferred spelling and what the platform's own
            // default-page synthesizer emits, so it is the one authored here.
            //
            // It is mounted as the seventh TAB rather than in the page's
            // `discussion` SLOT because §05 lists 讨论 among the tabs. The slot
            // is then overridden with an empty array so the synthesized default
            // does not render a second copy of the same panel below the body.
            value: 'discussion',
            label: { en: 'Discussion', 'zh-CN': '讨论' },
            children: [
              {
                type: 'record:discussion',
                id: 'contract_discussion',
                properties: {
                  position: 'bottom',
                },
              },
            ],
          },
        ],
      },
    },

    // See the discussion tab: the panel lives there, so the slot is emptied
    // rather than left to fall through to the synthesized default.
    discussion: [],
  },
};
