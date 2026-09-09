import type { Flow, FlowNode } from '@objectstack/spec/automation';
import { HAS_RECIPIENT, NO_RECIPIENT, SWEEP_LIMIT, sweepFlow } from './_daily-sweep.js';

/**
 * F12 `renewal_notice` — the renewal window, and the action that acts on it
 * (DESIGN.md §06 F12: "`active` 且 `end_date - renewal_notice_days <= today`：
 * 置 `is_expiring`,提醒业务承办与法务；动作「发起续签」预填新 draft").
 *
 * Two pieces of metadata live here because they are two halves of one
 * behaviour: the sweep that says "decide about this contract now", and the
 * flow behind the 发起续签 button that does something about it. They share
 * {@link renewalDraft} — the ONE place that decides what a renewal draft
 * inherits — and `expiration-sweep.flow.ts` (F13) shares it too, for the
 * auto-renewing contracts it drafts without anyone pressing a button. Three
 * callers, one answer to "what does a renewal look like".
 *
 * ## The window is per-record, so it is computed in a `script`
 *
 * `end_date - renewal_notice_days <= today` subtracts one COLUMN from another
 * and compares the result to now. No filter can express that: the
 * `{date-macro}` vocabulary produces constants, and §12 gap #7 records that
 * the platform CEL has no date arithmetic at all — which is exactly why §12's
 * v1 degradation for this gap is "到期、逾期由日任务盖戳字段", the `is_expiring`
 * column this job writes.
 *
 * So the sweep does what the card allows and nothing more: the QUERY narrows
 * to a superset a constant can express — `end_date` inside the widest notice
 * period the field admits (`renewal_notice_days` is `max: 365`) — and the
 * per-record subtraction happens in a `script` node, in JavaScript, on the
 * row. ⛔ It is NOT a formula field, and ⛔ nothing here stamps a computed
 * DURATION onto a column: decision #31 ruled that workaround out on
 * 2026-09-09 (1C — the blocker is `objectstack-ai/objectstack#16737` and it is
 * fixed on the platform, not routed around here). `is_expiring` is a boolean
 * flag §03 already declares, not a computed metric.
 *
 * `is_expiring != true` keeps the notice to once per contract: the flag the
 * sweep sets is the same flag that takes the row out of tomorrow's query.
 */

/** Milliseconds in a day — the sweep's only unit, and it never crosses a DST boundary because both operands are dates. */
const DAY_MS = 86_400_000;

/** ISO calendar day (`YYYY-MM-DD`) — the shape a `date` column is written with. */
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Parse a `date` / `datetime` cell to epoch ms, or NaN. */
const at = (value: unknown): number =>
  typeof value === 'string' && value ? Date.parse(value) : value instanceof Date ? value.getTime() : NaN;

/**
 * Is this contract inside its renewal-notice window today, and by when must
 * the decision be made?
 *
 * Pure: it reads the row's own `end_date` and `renewal_notice_days` and
 * returns the comparison. The default of 30 days when the field is empty is
 * the same default `contract_activate` (F9) uses to date the renewal
 * obligation, so the reminder and the obligation cannot disagree about when a
 * decision is owed.
 */
export function renewalWindow({ input }: { input: Record<string, unknown> }): {
  due: boolean;
  deadline: string | null;
  noticeDays: number;
} {
  const endMs = at(input.endDate);
  const raw = input.noticeDays;
  const noticeDays = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 30;
  if (!Number.isFinite(endMs)) return { due: false, deadline: null, noticeDays };
  const deadlineMs = endMs - noticeDays * DAY_MS;
  // Day granularity on both sides: a deadline of "today" IS due today, which
  // is what "<= today" says.
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  return { due: deadlineMs <= todayMs, deadline: isoDay(deadlineMs), noticeDays };
}

/**
 * What a renewal draft inherits from the contract it renews.
 *
 * Renewal is NOT a status transition (DESIGN.md §03: "续签不是转换") — it is a
 * new contract carrying `renewed_from`. What it inherits is the shape of the
 * deal (type, counterparty, entity, department, terms) and what it does NOT
 * inherit is everything the new negotiation must earn again: no status but
 * `draft`, no signatures, no approvals, no stage timestamps. Those are simply
 * absent from the write map in the flows below rather than nulled here.
 *
 * The new term starts the day after the old one ends and runs for the same
 * number of months, falling back to twelve when the source carries none —
 * a starting point a person edits, not a commitment.
 */
export function renewalDraft({ input }: { input: Record<string, unknown> }): {
  title: string;
  startDate: string | null;
  endDate: string | null;
  termMonths: number;
} {
  const sourceTitle = typeof input.title === 'string' && input.title ? input.title : 'contract';
  const endMs = at(input.endDate);
  const rawTerm = input.termMonths;
  const termMonths = typeof rawTerm === 'number' && Number.isFinite(rawTerm) && rawTerm > 0 ? Math.floor(rawTerm) : 12;
  let startDate: string | null = null;
  let endDate: string | null = null;
  if (Number.isFinite(endMs)) {
    const start = new Date(endMs + DAY_MS);
    startDate = isoDay(start.getTime());
    const end = new Date(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + termMonths);
    endDate = isoDay(end.getTime() - DAY_MS);
  }
  // `title` is `maxLength: 200`; a 200-character source title would otherwise
  // fail the write rather than the reminder.
  return { title: `Renewal — ${sourceTitle}`.slice(0, 200), startDate, endDate, termMonths };
}

/** The window computation, as the first node of the sweep's per-row region. */
const computeWindow: FlowNode = {
  id: 'notice_window',
  type: 'script',
  label: 'Inside The Notice Window?',
  config: {
    function: 'clm_renewal_window',
    inputs: { endDate: '{expiring.end_date}', noticeDays: '{expiring.renewal_notice_days}' },
    outputVariable: 'window',
  },
};

const IN_WINDOW = 'has(vars.window) && vars.window.due == true';
const NOT_IN_WINDOW = '!has(vars.window) || vars.window.due != true';

export const RenewalNoticeFlow: Flow = sweepFlow({
  name: 'renewal_notice',
  label: 'Renewal Notice Due',
  description: 'Daily: flag an active contract as expiring once it enters its renewal-notice window, and tell the business owner and the legal owner that a renew-or-notify decision is due.',
  stages: [
    {
      id: 'notice',
      label: 'Entering The Notice Window',
      objectName: 'clm_contract',
      filter: {
        status: 'active',
        // `$ne: true` and not `false`: the column is `defaultValue: false`, but
        // a row imported or seeded without it holds NULL, and NULL != false on
        // every driver. The two branches of this product must partition the
        // rows, not leave a third set nobody sweeps.
        is_expiring: { $ne: true },
        // The widest window a constant can express: `renewal_notice_days` is
        // `max: 365`, so no contract inside its own notice period is outside
        // this one. The per-record comparison is the `script` node below.
        // A NULL `end_date` fails this comparison on every driver, which is
        // the intended exclusion — a contract with no end date has no renewal
        // window.
        end_date: { $lte: '{365_days_from_now}' },
      },
      fields: ['id', 'title', 'contract_number', 'owner_id', 'legal_owner', 'end_date', 'renewal_notice_days', 'auto_renew'],
      item: 'expiring',
      body: {
        nodes: [
          computeWindow,
          { id: 'notice_gate', type: 'decision', label: 'Notice Due?' },
          {
            id: 'notice_flag',
            type: 'update_record',
            label: 'Flag Expiring',
            config: {
              objectName: 'clm_contract',
              filter: { id: '{expiring.id}' },
              // §12 gap #7's declared v1 degradation, and the only thing this
              // job stamps: a boolean §03 already carries. NOT a duration.
              fields: { is_expiring: true },
            },
          },
          {
            id: 'notice_who',
            type: 'script',
            label: 'Who To Tell',
            config: {
              function: 'clm_notify_recipients',
              inputs: { primary: '{expiring.owner_id}', also: '{expiring.legal_owner}' },
              outputVariable: 'recipients',
            },
          },
          { id: 'notice_decide', type: 'decision', label: 'Someone To Tell?' },
          {
            id: 'notice_tell',
            type: 'notify',
            label: 'Notify',
            config: {
              recipients: '{recipients.userIds}',
              channels: ['inbox', 'email'],
              severity: 'warning',
              topic: 'clm_renewal_notice_due',
              sourceObject: 'clm_contract',
              sourceId: '{expiring.id}',
              title: 'Renewal decision due: {expiring.title}',
              message: 'Contract {expiring.contract_number} ends on {expiring.end_date}, and notice of non-renewal is owed by {window.deadline} ({window.noticeDays} days before). Start a renewal from the contract page, or give notice.',
            },
          },
          { id: 'notice_done', type: 'assignment', label: 'Row Done' },
        ],
        edges: [
          { id: 'n1', source: 'notice_window', target: 'notice_gate', type: 'default' },
          { id: 'n2', source: 'notice_gate', target: 'notice_flag', type: 'default', label: 'Inside the window', condition: IN_WINDOW },
          { id: 'n3', source: 'notice_gate', target: 'notice_done', type: 'default', label: 'Not yet', condition: NOT_IN_WINDOW },
          { id: 'n4', source: 'notice_flag', target: 'notice_who', type: 'default' },
          { id: 'n5', source: 'notice_who', target: 'notice_decide', type: 'default' },
          { id: 'n6', source: 'notice_decide', target: 'notice_tell', type: 'default', label: 'Notify', condition: HAS_RECIPIENT },
          { id: 'n7', source: 'notice_decide', target: 'notice_done', type: 'default', label: 'Nobody to tell', condition: NO_RECIPIENT },
          { id: 'n8', source: 'notice_tell', target: 'notice_done', type: 'default' },
        ],
      },
    },
  ],
});

/**
 * 发起续签 — the §05 header action's flow (F12's second half).
 *
 * `runAs: 'user'`, deliberately and unlike every scheduled job in this card:
 * the person pressing the button is creating a contract of their own, and the
 * new draft's `owner_id` is stamped by the security middleware from the acting
 * user on any insert that leaves it empty. Elevating would take the record
 * away from its author and read source contracts the caller cannot see.
 *
 * One guard, and it is a read rather than a flag: a contract that already has
 * a renewal pointing at it does not get a second one. `renewed_from` IS the
 * link, so asking whether one exists is asking the question directly —
 * the same live-key discipline `signature_record` uses for its final version.
 */
export const RenewalStartFlow: Flow = {
  name: 'renewal_start',
  label: 'Start Renewal',
  description: 'Create a renewal draft of this contract, pre-filled from it and linked back through renewed_from.',
  type: 'autolaunched',
  status: 'active',
  runAs: 'user',
  variables: [{ name: 'recordId', type: 'text', isInput: true, isOutput: false }],
  successMessage: 'Renewal draft created.',
  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'clm_contract' } },
    {
      id: 'get_source',
      type: 'get_record',
      label: 'Load Source Contract',
      config: {
        objectName: 'clm_contract',
        filter: { id: '{recordId}' },
        fields: ['id', 'title', 'contract_type', 'party', 'our_entity', 'department', 'owner_id', 'legal_owner', 'amount', 'currency_code', 'payment_terms', 'governing_law', 'jurisdiction', 'contract_language', 'confidentiality_term_months', 'auto_renew', 'renewal_notice_days', 'term_months', 'end_date', 'parent_contract'],
        outputVariable: 'source',
      },
    },
    {
      id: 'get_existing',
      type: 'get_record',
      label: 'Renewal Already Started?',
      config: {
        objectName: 'clm_contract',
        filter: { renewed_from: '{recordId}' },
        fields: ['id', 'contract_number', 'status'],
        outputVariable: 'existingRenewal',
      },
    },
    { id: 'decide_existing', type: 'decision', label: 'Already Renewed?' },
    {
      id: 'refuse_existing',
      type: 'script',
      label: 'Already Renewed',
      config: {
        // Not a silent completion: pressing the button twice must say what
        // happened, and the run must not report a draft it did not make.
        //
        // This was authored as an `end` node with `outcome: 'refused'` — the
        // shape the spec declares — and MEASURED inert on the pinned 17.4.0
        // runtime (`objectstack-ai/objectstack#15788`, open): the second press
        // recorded `status: "completed"` and
        // answered HTTP 200 with the action's own "Renewal draft created."
        // while creating nothing. `refuseBackfill` carries the full reading;
        // the working idiom on this version is the throwing `script` node
        // `contract_intake` already uses, so that is what both flows use.
        function: 'clm_backfill_refuse',
        inputs: {
          message: 'This contract already has a renewal draft ({existingRenewal.contract_number}). Open that one instead of starting a second.',
          code: 'INVALID_STATE',
        },
      },
    },
    {
      id: 'compute_draft',
      type: 'script',
      label: 'Compute The Draft',
      config: {
        function: 'clm_renewal_draft',
        inputs: { title: '{source.title}', endDate: '{source.end_date}', termMonths: '{source.term_months}' },
        outputVariable: 'draft',
      },
    },
    {
      id: 'create_draft',
      type: 'create_record',
      label: 'Create Renewal Draft',
      config: {
        objectName: 'clm_contract',
        fields: {
          title: '{draft.title}',
          contract_type: '{source.contract_type}',
          party: '{source.party}',
          our_entity: '{source.our_entity}',
          department: '{source.department}',
          amount: '{source.amount}',
          currency_code: '{source.currency_code}',
          payment_terms: '{source.payment_terms}',
          governing_law: '{source.governing_law}',
          jurisdiction: '{source.jurisdiction}',
          contract_language: '{source.contract_language}',
          confidentiality_term_months: '{source.confidentiality_term_months}',
          auto_renew: '{source.auto_renew}',
          renewal_notice_days: '{source.renewal_notice_days}',
          term_months: '{draft.termMonths}',
          start_date: '{draft.startDate}',
          end_date: '{draft.endDate}',
          parent_contract: '{source.parent_contract}',
          // The link that makes this a renewal rather than a copy (§03).
          renewed_from: '{source.id}',
          // `status` is left to its `draft` default on purpose: the type stamp
          // hook refuses a contract born in any other state, and a renewal
          // earns its way through the machine like any other contract.
        },
        outputVariable: 'renewal',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'r1', source: 'start', target: 'get_source', type: 'default' },
    { id: 'r2', source: 'get_source', target: 'get_existing', type: 'default' },
    { id: 'r3', source: 'get_existing', target: 'decide_existing', type: 'default' },
    {
      id: 'r4', source: 'decide_existing', target: 'refuse_existing', type: 'default', label: 'Already renewed',
      condition: 'has(vars.existingRenewal) && vars.existingRenewal != null && has(vars.existingRenewal.id)',
    },
    {
      id: 'r5', source: 'decide_existing', target: 'compute_draft', type: 'default', label: 'Not yet',
      condition: '!has(vars.existingRenewal) || vars.existingRenewal == null || !has(vars.existingRenewal.id)',
    },
    { id: 'r6', source: 'compute_draft', target: 'create_draft', type: 'default' },
    { id: 'r7', source: 'create_draft', target: 'end', type: 'default' },
    // Never traversed — `clm_backfill_refuse` throws. Declared so the refusal
    // node is not a dangling one, as `contract_intake` declares its four.
    { id: 'r8', source: 'refuse_existing', target: 'end', type: 'default' },
  ],
};

/** The auto-renew draft F13 creates without a button — same field map, one caller over. */
export const RENEWAL_DRAFT_FIELDS = {
  title: '{draft.title}',
  contract_type: '{expired.contract_type}',
  party: '{expired.party}',
  our_entity: '{expired.our_entity}',
  department: '{expired.department}',
  amount: '{expired.amount}',
  currency_code: '{expired.currency_code}',
  payment_terms: '{expired.payment_terms}',
  governing_law: '{expired.governing_law}',
  jurisdiction: '{expired.jurisdiction}',
  contract_language: '{expired.contract_language}',
  confidentiality_term_months: '{expired.confidentiality_term_months}',
  auto_renew: '{expired.auto_renew}',
  renewal_notice_days: '{expired.renewal_notice_days}',
  term_months: '{draft.termMonths}',
  start_date: '{draft.startDate}',
  end_date: '{draft.endDate}',
  parent_contract: '{expired.parent_contract}',
  renewed_from: '{expired.id}',
  // The sweep runs `runAs: 'system'`, and a system insert is exactly the case
  // the security middleware stands aside for ("if (opCtx.context?.isSystem)
  // return next()"), so `owner_id` would be left EMPTY unless it is carried
  // over. An unowned renewal draft is one nobody's 我的合同 list shows.
  owner_id: '{expired.owner_id}',
  legal_owner: '{expired.legal_owner}',
} as const;

/** Rows read per stage, re-exported so F13's cap and F12's stay one number. */
export const RENEWAL_SWEEP_LIMIT = SWEEP_LIMIT;
