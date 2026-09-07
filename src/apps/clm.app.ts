import { App } from '@objectstack/spec/ui';

/**
 * HotCLM — the one App (ADR-0019 D3: one app package, one App).
 *
 * ## Navigation is DESIGN.md §05's table, group for group
 *
 * Five groups, one per audience, each gated by the `*.access` capability card
 * 04 registered in the matching permission set's `systemPermissions`. An empty
 * group collapses itself, so a person sees only the groups they hold.
 *
 * ⚠️ THE GATE IS ALSO THE FAILURE MODE. A `requiredPermissions` entry naming a
 * capability that does not exist only WARNS at validate and hides the group at
 * runtime — so a group hidden by a typo and a group hidden because this user
 * lacks the capability are the same observation from the outside. The five
 * spellings below are copied from the five `systemPermissions` arrays in
 * `src/profiles/*.profile.ts`, and the boot is the instrument that catches a
 * drift: an unknown capability is a boot diagnostic, and this repo's boot logs
 * none. Every negative in the PR's audience matrix is recorded beside the
 * positive control that proves the group renders at all.
 *
 * ## Items are objects, never bare strings
 *
 * Every entry is `{ id, type, label, … }`. `NavigationItemSchema` used to
 * resolve to `unknown` and took `['nonsense', 42]` without complaint; it is a
 * strict union now, but the house rule stands on its own reason — a bare
 * string has nowhere to carry the translation key card 11 will attach to
 * `label`, and nowhere to carry the gate.
 *
 * ## What §05 lists that is NOT here, and why
 *
 * - **状态看板** (the status kanban) is in §05's 主视图 column, not its 导航
 *   column, and it stays off the sidebar for that reason: the console's view
 *   switcher builds a tab per named `listViews` entry, so `status_kanban` is
 *   one click from 全部合同 under its own label and zero clicks further than a
 *   second sidebar row would be.
 * - **签约主体与部门** (管理) has no object to point at. `our_entity` and
 *   `department` are `Field.select` option lists on `clm_contract` — schema,
 *   not rows — so there is no configuration-object grid for §05's 主视图 column
 *   to mean here, and the only place they are edited is the Setup app's field
 *   editor. Reported rather than invented: giving them an object is a data-model
 *   decision, not a view.
 * - **报表** (管理) is card 10. No `reports:` metadata exists yet, and a
 *   `type: 'report'` item naming a report that does not exist is a dead row.
 */
export const ClmApp = App.create({
  name: 'clm',
  label: 'HotCLM',
  description: 'Contract lifecycle management — intake, review, approval, execution, obligations and archive.',
  icon: 'file-signature',
  isDefault: true,
  branding: {
    // Contract green — the same family as the object palette's `active`
    // (#2F7D5B). No `logo`/`favicon`: this repo ships no `assets/` directory,
    // and a branding URL that resolves to nothing renders a broken image
    // rather than falling back.
    primaryColor: '#0B6E63',
  },

  navigation: [
    {
      /**
       * 我的合同（所有人） — DESIGN.md §05 row 1.
       *
       * ⚠️ ZONE 2 / issue #11 question 1. The gate below is the ONE LINE that
       * moves if the maintainer answers B ("any authenticated employee reaches
       * 我的合同 without a grant"): delete the `requiredPermissions` line and
       * the group is visible to every signed-in user, because a nav item with
       * no `requiredPermissions` is served to anyone the app itself is served
       * to. Nothing else in this file, in the views, or in the profiles has to
       * change. Built under option A as dispatched: `clm_requester.access`
       * gates it, and an employee holding no position gets the set through a
       * Setup grant (`sys_user_permission_set`) — the path card 04 already
       * ships and `requester.profile.ts` documents. #11 is NOT answered here.
       */
      id: 'group_my_contracts',
      type: 'group',
      label: 'My Contracts',
      icon: 'user-round',
      expanded: true,
      requiredPermissions: ['clm_requester.access'],
      children: [
        {
          // 发起合同 — §05: "发起 = screen flow 动作". The `action` nav item
          // dispatches F1's `launch_contract` (card 05) straight from the
          // sidebar, which is the whole point of the entry: launching is the
          // one thing a requester does that does not start from a list.
          // There is no anonymous public form — §05, and this item is inside a
          // gated group of a signed-in app.
          id: 'nav_launch_contract',
          type: 'action',
          label: 'Launch a Contract',
          icon: 'rocket',
          actionDef: { actionName: 'launch_contract' },
        },
        {
          id: 'nav_my_contracts',
          type: 'object',
          objectName: 'clm_contract',
          viewName: 'my_contracts',
          label: 'Launched by Me',
          icon: 'file-text',
        },
        {
          // 待我处理 — §05: "平台审批收件箱". `component`, not `object`: the
          // approvals plugin's `sys_approval_request` table is read-only, so an
          // object entry would promise an approve button the destination cannot
          // render. `approvals:inbox` is the console's own approval centre, and
          // a `componentRef` resolves against the current app base, so the
          // entry keeps the user inside HotCLM. `requiresObject` hides the row
          // on an install without @objectstack/plugin-approvals, where there is
          // no approval to act on.
          id: 'nav_my_approvals',
          type: 'component',
          componentRef: 'approvals:inbox',
          label: 'Waiting on Me',
          icon: 'inbox',
          requiresObject: 'sys_approval_request',
        },
        {
          id: 'nav_my_obligations',
          type: 'object',
          objectName: 'clm_obligation',
          viewName: 'my_obligations',
          label: 'My Obligations',
          icon: 'circle-check',
        },
      ],
    },

    {
      // 法务工作台 — §05 row 2. The lawyer's whole desk, in the order a
      // contract travels: intake → review → negotiation → the full book.
      id: 'group_legal',
      type: 'group',
      label: 'Legal Desk',
      icon: 'scale',
      expanded: true,
      requiredPermissions: ['clm_legal.access'],
      children: [
        { id: 'nav_legal_intake',    type: 'object', objectName: 'clm_contract',      viewName: 'legal_intake',    label: 'Awaiting Intake', icon: 'inbox' },
        { id: 'nav_legal_review',    type: 'object', objectName: 'clm_contract',      viewName: 'legal_in_review', label: 'My Reviews',      icon: 'file-search' },
        { id: 'nav_legal_negotiate', type: 'object', objectName: 'clm_contract',      viewName: 'negotiating',     label: 'In Negotiation',  icon: 'messages-square' },
        { id: 'nav_all_contracts',   type: 'object', objectName: 'clm_contract',      viewName: 'all_contracts',   label: 'All Contracts',   icon: 'files' },
        { id: 'nav_expiry_calendar', type: 'object', objectName: 'clm_contract',      viewName: 'expiry_calendar', label: 'Expiry Calendar', icon: 'calendar-days' },
        { id: 'nav_clause_library',  type: 'object', objectName: 'clm_clause',        label: 'Clause Library',  icon: 'book-open' },
        { id: 'nav_contract_types',  type: 'object', objectName: 'clm_contract_type', label: 'Contract Types',  icon: 'shapes' },
      ],
    },

    {
      // 财务 — §05 row 3. The three cuts of the payment schedule ride the view
      // switcher on the first entry; the board is its own row because §05's
      // 导航 column names it.
      id: 'group_finance',
      type: 'group',
      label: 'Finance',
      icon: 'banknote',
      expanded: true,
      requiredPermissions: ['clm_finance.access'],
      children: [
        { id: 'nav_payment_plans',  type: 'object', objectName: 'clm_payment_plan', viewName: 'all_payment_plans', label: 'Payment Schedule', icon: 'calendar-clock' },
        { id: 'nav_active_finance', type: 'object', objectName: 'clm_contract',     viewName: 'active_contracts',  label: 'Active Contracts', icon: 'file-check' },
        { id: 'nav_payment_board',  type: 'object', objectName: 'clm_payment_plan', viewName: 'payment_kanban',    label: 'Payment Board',    icon: 'columns-3' },
      ],
    },

    {
      // 执行与档案 — §05 row 4.
      id: 'group_records',
      type: 'group',
      label: 'Execution & Records',
      icon: 'archive',
      expanded: true,
      requiredPermissions: ['clm_records.access'],
      children: [
        { id: 'nav_pending_execution', type: 'object', objectName: 'clm_contract', viewName: 'pending_execution', label: 'Awaiting Execution', icon: 'stamp' },
        { id: 'nav_pending_archive',   type: 'object', objectName: 'clm_contract', viewName: 'pending_archive',   label: 'Awaiting Archive',   icon: 'folder-input' },
        { id: 'nav_register',          type: 'object', objectName: 'clm_contract', viewName: 'contract_register', label: 'Contract Register',  icon: 'table' },
      ],
    },

    {
      // 管理 — §05 row 5. Two of the four items §05 lists have no destination
      // in this repo yet; see the file header for which and why.
      id: 'group_admin',
      type: 'group',
      label: 'Administration',
      icon: 'settings',
      expanded: true,
      requiredPermissions: ['clm_admin.access'],
      children: [
        { id: 'nav_approval_matrix', type: 'object', objectName: 'clm_approval_rule', label: 'Approval Matrix', icon: 'git-branch' },
        { id: 'nav_parties',         type: 'object', objectName: 'clm_party',         label: 'Counterparties',  icon: 'building-2' },
      ],
    },
  ],
});
