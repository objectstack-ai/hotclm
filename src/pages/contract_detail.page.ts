import type { Page } from '@objectstack/spec/ui';

/**
 * The contract record page — DESIGN.md §05's 合同详情页, slotted.
 *
 * §05 asks for header actions shown by status AND gate, highlights, a `path`
 * over the seven pre-terminal statuses, then the contract's body: key terms,
 * versions, review and deviations, approvals, obligations and payments,
 * signing and archive, and the discussion. `kind: 'slotted'` authors only
 * the first three; every slot left unset falls through to the synthesized
 * record page.
 *
 * ## Where the body comes from (since @objectstack 18.3)
 *
 * Up to 18.2 this page authored its own seven-tab strip in `slots.tabs`.
 * 18.3 retired that slot (ADR-0085, objectstack#27053): an authored strip
 * replaced the whole synthesized one and kept the page tabbed at every width,
 * off the record page's columns, drawer and phone layouts. The body is now
 * the platform's, composed from the object:
 *
 * - **Key terms** — `clm_contract.fieldGroups`, the same eight groups the old
 *   Overview tab enumerated one by one. The archive facts sit in their own
 *   groups (`archive_no` in identity, the stamps in lifecycle).
 * - **Versions, reviews, deviations, obligations, payments, signatures** —
 *   full-width tables from each child's `contract` master-detail field, with
 *   the columns its `relatedListColumns` names (the columns this page used to
 *   carry), placed after the key terms by the body-table entries in
 *   `clm_contract.fieldGroups`.
 * - **Renewals** — the `renewed_from` lookup, a side card.
 * - **Approvals, discussion** — the platform's own panels; the discussion is
 *   no longer emptied here, since there is no authored tab to hold it.
 *
 * ## Path labels are inline `{ en, 'zh-CN' }` maps
 *
 * `record:path` stage labels have no bundle key (the page-component key face
 * gives `record:path` one `label`, the component's own, not one per stage), so the seven stage names are inline locale maps — the spec's ruled
 * route for page copy a bundle cannot address. ⚠️ `pnpm lint:i18n-gate`
 * cannot see an inline map: a new stage with a plain-string label would ship
 * English on a zh-CN console with the gate green.
 *
 * **发起续签** is the eighth header action (`start_renewal`): a flow action,
 * not a transition — §03 is explicit that renewal creates a NEW contract
 * carrying `renewed_from` rather than moving this one — so it sits beside the
 * status writes without being one.
 */
export const ContractDetailPage: Page = {
  name: 'contract_detail',
  label: 'Contract',
  description: 'The contract record: lifecycle path, key terms, versions, review, approvals, obligations, signing and discussion.',

  type: 'record',
  object: 'clm_contract',
  kind: 'slotted',

  // The object's default record page for every audience. No
  // `assignedProfiles`: §05 gives the five audiences ONE detail page and varies
  // what they can do on it through the header actions' `requiredPermissions`
  // and through §04's FLS, not through five page layouts.
  isDefault: true,

  slots: {
    /**
     * §05: header 挂「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止 / 发起续签」
     * 动作,按 status 与门控显隐 — plus 撤回 (`withdraw_contract`), the owner's
     * button for §03's `draft → cancelled` row.
     *
     * `PageHeaderProps.actions` is `z.array(z.string())` — action IDs, not
     * definitions — so the display rules travel with the ACTION, not with this
     * list: each of them carries `visible` (a CEL predicate on
     * `record.status`) and, where §04 names one, `requiredPermissions`. Listing
     * all of them here and letting each decide is what makes the header change
     * shape as a contract moves; a custom record page replaces the default
     * header, so an action not named here is unreachable from the record —
     * MEASURED: `start_renewal` was declared, translated and wired to its flow
     * and still had no button on the contract page until it was named here.
     * `record_finance_review` (记录财务审查) is the same: declared on the
     * object, reachable only once listed here.
     */
    header: {
      type: 'page:header',
      id: 'contract_header',
      properties: {
        title: '{contract_number}',
        subtitle: '{title}',
        actions: [
          'submit_contract',
          'withdraw_contract',
          'accept_contract',
          'send_for_approval',
          'start_signing',
          'activate_contract',
          'terminate_contract',
          'start_renewal',
          // Finance's own review while the contract is in review or in
          // approval (issue #190, ruling D). Not a status write: it files the
          // caller's finance-stage review and leaves the contract as it is.
          'record_finance_review',
        ],
      },
    },

    /**
     * §05: highlights 编号 · 相对方 · 金额 · 到期日 · 当前轮次, plus 状态 second,
     * then the path.
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
     * which is the honest reading of "this contract has left the road" — and so
     * the path alone cannot say WHICH road-off it took. The strip carries the
     * status itself for that: without it, a rejected or cancelled contract's
     * first screen showed number, counterparty, amount and turn over a path
     * with no step lit, and read exactly like one that had not started.
     *
     * `status` sits SECOND, right after the number, because the strip is read
     * left to right and below `sm` the renderer stacks one chip per line: any
     * later position puts the one fact a terminal contract is opened for under
     * the fold on a phone. It is the bare field name, the same spelling the
     * object's own `highlightFields` carries — the chip then draws the select's
     * own option colour and the bundle's label (已驳回 / 已作废), and it stays as
     * editable as the object says it is, rather than declaring a second,
     * UI-only policy beside the state machine in `contract.hook.ts`.
     *
     * NOTHING gives way for it, measured rather than assumed:
     * `RecordHighlightsProps.fields` allows `min(1).max(7)` and this is the
     * sixth; the renderer wraps rather than truncates and drops a chip whose
     * value is empty (a draft has no `end_date`, so it shows five); and all six
     * chips sat on one line at 1440×900 in both locales.
     */
    highlights: [
      {
        type: 'record:highlights',
        id: 'contract_highlights',
        properties: {
          fields: ['contract_number', 'status', 'party', 'amount', 'end_date', 'current_turn'],
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
  },
};
