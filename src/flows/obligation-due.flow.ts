import type { Flow, FlowNode } from '@objectstack/spec/automation';
import { rowBody, sweepFlow } from './_daily-sweep.js';

/**
 * F10 `obligation_due` — the obligation reminder and the arrears sweep
 * (DESIGN.md §06 F10: "T-7 与 T-0 提醒义务 owner；过期未完成置 `overdue`,
 * 父合同汇总 `overdue_obligation_count` 随之变化").
 *
 * ## `in_progress` rows are IN the arrears sweep — that is the ruling
 *
 * Decision #10 question 1 was ruled **1A** on 2026-09-09: `clm_obligation`
 * gains the `in_progress → overdue` edge. Its consumer is this file. §03 drew
 * `pending → overdue` and not `in_progress → overdue`, so before the ruling an
 * obligation nobody had touched could be marked late while one somebody had
 * STARTED could not — and that card's own analysis named the trap for this
 * job: faced with the asymmetry, a daily sweep would either skip the started
 * rows (silent under-reporting) or invent the edge (widening a governed
 * surface without a ruling). With the ruling in hand there is no trap: every
 * stage below selects `status IN (pending, in_progress)`, and a started
 * obligation that is late is reported late.
 *
 * `done` and `waived` are terminal and are never selected: an obligation that
 * was performed or excused is not in arrears however old it is.
 *
 * ## The roll-up follows by itself
 *
 * `clm_contract.overdue_obligation_count` is a `summary` field with
 * `filter: { status: 'overdue' }`. The engine recomputes it on every child
 * write, so the update below moves the parent's count with no second write
 * here. That is the whole reason §03 made those five roll-ups `summary`
 * rather than `formula` — a formula could not be filtered or sorted on, and a
 * hand-maintained counter would need a writer on every path.
 *
 * ## Three stages, three windows, one row in at most one of them
 *
 * `due_date` is a `date` column, so each window is half-open and the three
 * tile the timeline: `[T+7, T+8)`, `[today, tomorrow)`, `(-∞, today)`. Exact
 * date EQUALITY is the anti-pattern `os lint` calls
 * `flow-date-equality-filter` — a date value carries a time component, so
 * `due_date == {7_days_from_now}` silently matches nothing.
 */

/** The arrears write. One row, addressed by scalar id — no `multi`, no predicate write. */
const flagOverdue: FlowNode = {
  id: 'arrears_flag',
  type: 'update_record',
  label: 'Mark Overdue',
  config: {
    objectName: 'clm_obligation',
    filter: { id: '{obligation.id}' },
    // The ONE writer of this value. `obligation_state_machine` refuses
    // `overdue` from any non-system write on both the insert and the update
    // path, so this job is the only thing in the product that can set it —
    // which is what makes the column a measurement rather than an opinion.
    fields: { status: 'overdue' },
  },
};

export const ObligationDueFlow: Flow = sweepFlow({
  name: 'obligation_due',
  label: 'Obligations Due And Overdue',
  description: 'Daily: remind an obligation owner seven days out and on the due date, and move an unfinished obligation past its due date into overdue (which moves the contract roll-up with it).',
  stages: [
    {
      id: 'week',
      label: 'Due In Seven Days',
      objectName: 'clm_obligation',
      filter: {
        status: { $in: ['pending', 'in_progress'] },
        due_date: { $gte: '{7_days_from_now}', $lt: '{8_days_from_now}' },
      },
      fields: ['id', 'title', 'contract', 'owner', 'due_date', 'kind', 'status'],
      item: 'obligation',
      body: rowBody({
        id: 'week',
        recipients: { primary: '{obligation.owner}' },
        notice: {
          topic: 'clm_obligation_due_soon',
          severity: 'info',
          sourceObject: 'clm_obligation',
          sourceId: '{obligation.id}',
          title: 'Due in 7 days: {obligation.title}',
          message: 'This contract obligation is due on {obligation.due_date}. Record progress, or mark it done once it is performed.',
        },
      }),
    },
    {
      id: 'today',
      label: 'Due Today',
      objectName: 'clm_obligation',
      filter: {
        status: { $in: ['pending', 'in_progress'] },
        due_date: { $gte: '{today}', $lt: '{tomorrow}' },
      },
      fields: ['id', 'title', 'contract', 'owner', 'due_date', 'kind', 'status'],
      item: 'obligation',
      body: rowBody({
        id: 'today',
        recipients: { primary: '{obligation.owner}' },
        notice: {
          topic: 'clm_obligation_due_today',
          severity: 'warning',
          sourceObject: 'clm_obligation',
          sourceId: '{obligation.id}',
          title: 'Due today: {obligation.title}',
          message: 'This contract obligation is due today ({obligation.due_date}). It moves into overdue tomorrow if it is not done or waived.',
        },
      }),
    },
    {
      id: 'arrears',
      label: 'Past Due',
      objectName: 'clm_obligation',
      filter: {
        // Decision #10 → 1A. `in_progress` is HERE, deliberately: leaving it
        // out is the silent under-reporting the ruling exists to prevent.
        status: { $in: ['pending', 'in_progress'] },
        due_date: { $lt: '{today}' },
      },
      fields: ['id', 'title', 'contract', 'owner', 'due_date', 'kind', 'status'],
      item: 'obligation',
      body: rowBody({
        id: 'arrears',
        lead: [flagOverdue],
        recipients: { primary: '{obligation.owner}' },
        notice: {
          topic: 'clm_obligation_overdue',
          severity: 'critical',
          sourceObject: 'clm_obligation',
          sourceId: '{obligation.id}',
          title: 'Overdue: {obligation.title}',
          message: 'This contract obligation was due on {obligation.due_date} and is now overdue. Perform it and mark it done, or ask legal to waive it.',
        },
      }),
    },
  ],
});
