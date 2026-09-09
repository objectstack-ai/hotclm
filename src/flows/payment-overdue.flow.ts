import type { Flow, FlowNode } from '@objectstack/spec/automation';
import { holdersPrelude, rowBody, sweepFlow } from './_daily-sweep.js';

/**
 * F11 `payment_overdue` — instalments that have come due and instalments that
 * are late (DESIGN.md §06 F11: "`planned_date` 已过且未 `paid`：置 `overdue`,
 * 提醒财务负责人与业务承办").
 *
 * ## Two hops, because §03 has no `planned → overdue` edge
 *
 * `clm_payment_plan.status` is `planned → due → partial / paid / overdue`.
 * There is no edge from `planned` straight to `overdue`, and nothing else in
 * the product moves an instalment out of `planned` — so a schedule row whose
 * date passes would sit in `planned` forever and could NEVER be flagged late.
 * §06 F11 says every unpaid instalment past its date goes overdue; the only
 * way to honour that without widening §03 is to take both hops, in order, in
 * one run. Stage 1 moves everything due (`planned_date <= today`) to `due`;
 * stage 2 then finds it there.
 *
 * Stage 1 sends nothing. An instalment reaching its planned date is not news —
 * it is what the finance section's 本月到期 list is for (§05) — and a daily
 * "this is now due" notice for every schedule row would bury the arrears
 * notice that matters.
 *
 * ## `partial` rows are swept too — that is decision #10's other ruling
 *
 * Question 2 was ruled **2A** on 2026-09-09: `partial` gains `→ paid` and
 * `→ overdue`, because it was a dead end that §03 marked terminal only by
 * omission. This job is what makes the second of those edges REAL rather than
 * merely declared: `overdue` has exactly one writer (the state machine refuses
 * it from anyone else), so if this sweep did not select `partial` nothing in
 * the product could ever take that edge. Half a payment arriving does not
 * settle the instalment, and §06 F11's own words are "已过且未 `paid`".
 *
 * ## Who is told
 *
 * The finance controller — a POSITION, resolved once per run from
 * `sys_user_position` rather than per row — and the contract's business owner,
 * which is on the parent, so the row's contract is read inside the body. Both
 * are exactly §06 F11's "财务负责人与业务承办".
 */

/** `planned → due`. The bookkeeping hop; §03's own first edge on this object. */
const markDue: FlowNode = {
  id: 'due_flag',
  type: 'update_record',
  label: 'Mark Due',
  config: {
    objectName: 'clm_payment_plan',
    filter: { id: '{instalment.id}' },
    fields: { status: 'due' },
  },
};

/** `due | partial → overdue`. The one writer of this value on this object. */
const markOverdue: FlowNode = {
  id: 'arrears_flag',
  type: 'update_record',
  label: 'Mark Overdue',
  config: {
    objectName: 'clm_payment_plan',
    filter: { id: '{instalment.id}' },
    fields: { status: 'overdue' },
  },
};

/** The parent contract, for its business owner and its number. */
const loadContract: FlowNode = {
  id: 'arrears_contract',
  type: 'get_record',
  label: 'Load Contract',
  config: {
    objectName: 'clm_contract',
    filter: { id: '{instalment.contract}' },
    fields: ['id', 'title', 'contract_number', 'owner_id', 'currency_code'],
    outputVariable: 'parentContract',
  },
};

export const PaymentOverdueFlow: Flow = sweepFlow({
  name: 'payment_overdue',
  label: 'Payments Due And Overdue',
  description: 'Daily: move instalments that have reached their planned date into due, then flag every unpaid instalment past that date as overdue and tell the finance controller and the business owner.',
  prelude: holdersPrelude('clm_finance_controller', 'financeControllers'),
  stages: [
    {
      // MUST run before the arrears stage — see the header. A `planned` row
      // whose date has passed takes both hops in this one run.
      id: 'due',
      label: 'Reached Planned Date',
      objectName: 'clm_payment_plan',
      filter: {
        status: 'planned',
        planned_date: { $lte: '{today}' },
      },
      fields: ['id', 'seq', 'contract', 'planned_date', 'planned_amount', 'status'],
      item: 'instalment',
      body: rowBody({ id: 'due', lead: [markDue] }),
    },
    {
      id: 'arrears',
      label: 'Unpaid Past Planned Date',
      objectName: 'clm_payment_plan',
      filter: {
        // Decision #10 → 2A: `partial` is in arrears too. `paid` is terminal
        // and settled; `overdue` is already flagged and would re-notify.
        status: { $in: ['due', 'partial'] },
        planned_date: { $lt: '{today}' },
      },
      fields: ['id', 'seq', 'contract', 'planned_date', 'planned_amount', 'actual_amount', 'invoice_no', 'status'],
      item: 'instalment',
      body: rowBody({
        id: 'arrears',
        lead: [markOverdue, loadContract],
        recipients: { primary: '{parentContract.owner_id}', also: '{financeControllers.userIds}' },
        notice: {
          topic: 'clm_payment_overdue',
          severity: 'critical',
          sourceObject: 'clm_payment_plan',
          sourceId: '{instalment.id}',
          title: 'Instalment {instalment.seq} overdue: {parentContract.title}',
          message: 'Instalment {instalment.seq} of contract {parentContract.contract_number} was due on {instalment.planned_date} and is not settled. Planned {instalment.planned_amount}; received so far {instalment.actual_amount}.',
        },
      }),
    },
  ],
});
