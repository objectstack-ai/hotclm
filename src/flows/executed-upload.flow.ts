import type { Flow } from '@objectstack/spec/automation';
import { must, ref } from './_values.js';

/**
 * F16 `executed_upload` — backfilling a contract that was signed before this
 * system existed (DESIGN.md §06 F16, §13 Q8: "档案或法务岗「补录已签合同」：
 * 一步填核心字段、相对方、执行副本与签署日期,合同直接进入 `active` 并置
 * `is_backfilled`,跳过审查与审批但全部留审计").
 *
 * ## What was already here, and what was not
 *
 * `clm_contract.is_backfilled` exists (card 02) and its own `description`
 * names this action as "the only writer". `contract_type_stamp` carries an
 * `isSystem` exemption whose comment names "F16 backfill" as one of the two
 * writes it exists for. So the model was BUILT for this action — and the
 * action itself did not exist in any form: no `actions` entry, no flow, no
 * route. Both mentions were prose. This flow and
 * `src/actions/contract-backfill.actions.ts` are the writer those two
 * declarations have been promising.
 *
 * ## `runAs: 'system'`, and what that is buying
 *
 * Exactly one thing: the right to insert a contract born `active`.
 * `contract_type_stamp` refuses any other birth state — "A contract is
 * created as a draft, not as active" — unless `ctx.session.isSystem`. Every
 * other contract in the product earns `active` by walking §03 from `draft`,
 * and that is the rule; a backfill is the declared exception (§13 Q8), so it
 * is taken through the one door the model already opened for it rather than by
 * weakening the guard.
 *
 * Elevation is not anonymity here. A flow launched from an action carries the
 * CALLER's `userId` and `tenantId` alongside `isSystem`, so the platform's
 * audit stamps (`created_by` / `updated_by`) name the person who did the
 * backfill, the row lands inside the caller's organization, and the contract
 * number takes its org-scoped sequence. That is what "全部留审计" needs, and it
 * is why the action is a flow rather than a script body: a script body runs as
 * the caller and would be refused at the first insert.
 *
 * ## What it does NOT do
 *
 * - No review, no approval, no signature round. `is_backfilled: true` is the
 *   model's own word for a contract that reached `active` without them (§13
 *   Q8), and the README already tells a reader that the seeded backfilled
 *   corpus "claims no approval history because it has none".
 * - No renewal-reminder obligation. F9 opens one on the `signing → active`
 *   transition, and a backfill takes no transition — it is inserted already
 *   active. The reminder a backfilled contract does get is F12's: the daily
 *   renewal sweep flags it `is_expiring` and notifies when its notice window
 *   arrives, which is the path §06 gives every active contract.
 * - ⛔ No payment plan. Decision #14 was ruled A on 2026-09-09 and it binds
 *   every activation path, not just the ordinary one.
 *
 * ## The executed copy has to land somewhere
 *
 * `clm_contract_version` is where every contract document in this product
 * lives, and `kind: 'final_signed'` is what an executed copy is. Filing it
 * there rather than dropping the upload is what keeps the action honest: an
 * action that collected a file and discarded it would be the "capability the
 * runtime does not deliver" AGENTS.md forbids. `version_count` then reads 1,
 * which is true.
 *
 * ## Refusals are refused `end` nodes
 *
 * A backfill the flow will not record ends at an `end` node declaring
 * `outcome: 'refused'` with the sentence the clerk reads
 * (objectstack#15788). The run records `refused`, not `failed`, the invoking
 * action's "Executed contract recorded." is suppressed, and the console shows
 * the sentence alone. Each sentence's other-language text is the
 * `flows.executed_upload.refusals.<node_id>.message` key
 * (objectstack#22450), which is why the signing date has three refusing ends
 * rather than one end echoing a computed string: a sentence assembled in a
 * function has no key to translate it. Every refusal sits before the first
 * write, so a refused run writes nothing.
 */

/** Why a signing date cannot be recorded: the decision below routes each to its own refusal. */
export type SigningDateProblem = 'missing' | 'invalid' | 'future';

/** Parse a `YYYY-MM-DD` (or ISO) signing date to a UTC instant, or null. */
export function backfillStamps({ input }: { input: Record<string, unknown> }): {
  signedAt: string | null;
  ok: boolean;
  problem: SigningDateProblem | null;
} {
  const raw = input.signedDate;
  const text = typeof raw === 'string' ? raw.trim() : raw instanceof Date ? raw.toISOString() : '';
  if (!text) {
    return { signedAt: null, ok: false, problem: 'missing' };
  }
  // A date-only value is midday UTC rather than midnight, so the calendar day
  // survives a reader in any timezone — the same trap the `date` vs `datetime`
  // split creates everywhere in this model.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00.000Z` : text;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return { signedAt: null, ok: false, problem: 'invalid' };
  }
  if (ms > Date.now()) {
    return { signedAt: null, ok: false, problem: 'future' };
  }
  return { signedAt: new Date(ms).toISOString(), ok: true, problem: null };
}

const DATE_OK = 'has(vars.stamps) && vars.stamps.ok == true';
// The three refusals partition the unusable dates; an unbound `stamps` is read
// as a missing date.
const DATE_MISSING = '!has(vars.stamps) || (vars.stamps.ok != true && vars.stamps.problem != "invalid" && vars.stamps.problem != "future")';
const DATE_INVALID = 'has(vars.stamps) && vars.stamps.ok != true && vars.stamps.problem == "invalid"';
const DATE_FUTURE = 'has(vars.stamps) && vars.stamps.ok != true && vars.stamps.problem == "future"';
const PARTY_OK = 'has(vars.partyRecord) && vars.partyRecord != null && has(vars.partyRecord.id) && vars.partyRecord.risk_flag != "blocked"';
const PARTY_BAD = '!has(vars.partyRecord) || vars.partyRecord == null || !has(vars.partyRecord.id) || vars.partyRecord.risk_flag == "blocked"';

export const ExecutedUploadFlow: Flow = {
  name: 'executed_upload',
  label: 'Backfill An Executed Contract',
  // Creates the contract in `active` with `is_backfilled` set and files the
  // executed copy as a `final_signed` version.
  description: 'Record a contract that was signed outside this system: create it directly as active, marked as backfilled, and file the executed copy as its final signed version.',
  type: 'autolaunched',
  status: 'active',
  // See the header: the ONE thing elevation buys is the right to insert a
  // contract born `active`, which `contract_type_stamp` reserves for a system
  // write (§13 Q8's declared exception). The caller's identity rides along, so
  // the audit trail names them.
  runAs: 'system',
  successMessage: 'Executed contract recorded.',

  variables: [
    { name: 'contract_type', type: 'text', isInput: true, isOutput: false },
    { name: 'party', type: 'text', isInput: true, isOutput: false },
    { name: 'title', type: 'text', isInput: true, isOutput: false },
    { name: 'signed_date', type: 'text', isInput: true, isOutput: false },
    { name: 'executed_file', type: 'text', isInput: true, isOutput: false },
    { name: 'our_entity', type: 'text', isInput: true, isOutput: false },
    { name: 'department', type: 'text', isInput: true, isOutput: false },
    { name: 'amount', type: 'number', isInput: true, isOutput: false },
    { name: 'currency_code', type: 'text', isInput: true, isOutput: false, defaultValue: 'usd' },
    { name: 'start_date', type: 'text', isInput: true, isOutput: false },
    { name: 'end_date', type: 'text', isInput: true, isOutput: false },
    { name: 'term_months', type: 'number', isInput: true, isOutput: false },
    { name: 'auto_renew', type: 'boolean', isInput: true, isOutput: false },
    { name: 'renewal_notice_days', type: 'number', isInput: true, isOutput: false },
    { name: 'governing_law', type: 'text', isInput: true, isOutput: false },
    { name: 'archive_no', type: 'text', isInput: true, isOutput: false },
    { name: 'summary', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'clm_contract' } },

    {
      id: 'check_date',
      type: 'script',
      label: 'Check The Signing Date',
      config: { function: 'clm_backfill_stamps', inputs: { signedDate: ref('signed_date') }, outputVariable: 'stamps' },
    },
    { id: 'decide_date', type: 'decision', label: 'Signing Date Usable?' },
    // The three ways a signing date is refused, each the sentence the clerk
    // reads (see the header for why there are three).
    {
      id: 'refuse_date_missing',
      type: 'end',
      label: 'Refuse — No Signing Date',
      config: {
        outcome: 'refused',
        message: 'A signing date is required: a backfilled contract is one that was already executed, and the date it was executed is the fact being recorded.',
      },
    },
    {
      id: 'refuse_date_invalid',
      type: 'end',
      label: 'Refuse — Signing Date Unreadable',
      config: { outcome: 'refused', message: 'The signing date "{{ signed_date }}" is not a date.' },
    },
    {
      id: 'refuse_date_future',
      type: 'end',
      label: 'Refuse — Signing Date In The Future',
      config: {
        outcome: 'refused',
        message: 'The signing date is in the future. A backfill records a contract that has already been executed.',
      },
    },

    {
      id: 'get_party',
      type: 'get_record',
      label: 'Load Counterparty',
      config: {
        objectName: 'clm_party',
        filter: { id: must('party') },
        fields: ['id', 'name', 'risk_flag'],
        outputVariable: 'partyRecord',
      },
    },
    { id: 'decide_party', type: 'decision', label: 'Counterparty Usable?' },
    {
      id: 'refuse_party',
      type: 'end',
      label: 'Refuse — Counterparty',
      // The same refusal `draft → submitted` makes in `contract.hook.ts`,
      // repeated here because the backfill never passes that guard: a blocked
      // counterparty is blocked whichever door the contract came in.
      config: {
        outcome: 'refused',
        message: 'That counterparty cannot be used: it is either missing or flagged blocked. A contract with a blocked counterparty is not recorded, even retrospectively.',
      },
    },

    {
      id: 'create_contract',
      type: 'create_record',
      label: 'Record The Executed Contract',
      config: {
        objectName: 'clm_contract',
        fields: {
          title: ref('title'),
          contract_type: ref('contract_type'),
          party: ref('party'),
          our_entity: ref('our_entity'),
          department: ref('department'),
          amount: ref('amount'),
          currency_code: ref('currency_code'),
          start_date: ref('start_date'),
          end_date: ref('end_date'),
          term_months: ref('term_months'),
          auto_renew: ref('auto_renew'),
          renewal_notice_days: ref('renewal_notice_days'),
          governing_law: ref('governing_law'),
          summary: ref('summary'),
          archive_no: ref('archive_no'),
          // The two facts a backfill IS.
          status: 'active',
          is_backfilled: true,
          // Executed outside this system, on the date given.
          //
          // `activated_at` is stamped HERE, and that is a measured decision
          // rather than a convenience. F9 (`contract_activate`) binds
          // `afterUpdate` only — the event §06 gives it — because binding
          // `afterInsert` as well made the demo fixture's 60 seeded active
          // contracts each open a renewal obligation (see the hook's own
          // note). A backfill inserts straight into `active`, so no F9 run
          // covers it and the column would otherwise stay empty on exactly the
          // contracts whose activation date is the fact being recorded.
          //
          // It is the SIGNING date, not now: a backfilled contract came into
          // force when it was executed, not when somebody typed it in.
          signed_at: ref('stamps.signedAt'),
          executed_at: ref('stamps.signedAt'),
          activated_at: ref('stamps.signedAt'),
        },
        outputVariable: 'contractRecord',
      },
    },
    {
      id: 'file_executed_copy',
      type: 'create_record',
      label: 'File The Executed Copy',
      config: {
        objectName: 'clm_contract_version',
        fields: {
          contract: ref('contractRecord.id'),
          version_no: 1,
          kind: 'final_signed',
          turn: 'internal',
          // WRITTEN as the id: a file field READS as `{ id, name, size, … }`
          // and card 05 measured the object form refused with "expected
          // string, received object".
          file: ref('executed_file'),
          is_current: true,
          notes: 'Executed copy supplied with the backfill.',
        },
        outputVariable: 'executedVersion',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'b1', source: 'start', target: 'check_date', type: 'default' },
    { id: 'b2', source: 'check_date', target: 'decide_date', type: 'default' },
    { id: 'b3', source: 'decide_date', target: 'refuse_date_missing', type: 'default', label: 'Missing', condition: DATE_MISSING },
    { id: 'b3a', source: 'decide_date', target: 'refuse_date_invalid', type: 'default', label: 'Not a date', condition: DATE_INVALID },
    { id: 'b3b', source: 'decide_date', target: 'refuse_date_future', type: 'default', label: 'In the future', condition: DATE_FUTURE },
    { id: 'b4', source: 'decide_date', target: 'get_party', type: 'default', label: 'Usable', condition: DATE_OK },
    { id: 'b5', source: 'get_party', target: 'decide_party', type: 'default' },
    { id: 'b6', source: 'decide_party', target: 'refuse_party', type: 'default', label: 'Missing or blocked', condition: PARTY_BAD },
    { id: 'b7', source: 'decide_party', target: 'create_contract', type: 'default', label: 'Usable', condition: PARTY_OK },
    { id: 'b8', source: 'create_contract', target: 'file_executed_copy', type: 'default' },
    { id: 'b9', source: 'file_executed_copy', target: 'end', type: 'default' },
  ],
};
