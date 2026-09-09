import type { Flow } from '@objectstack/spec/automation';

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
 */

/** Parse a `YYYY-MM-DD` (or ISO) signing date to a UTC instant, or null. */
export function backfillStamps({ input }: { input: Record<string, unknown> }): {
  signedAt: string | null;
  ok: boolean;
  problem: string | null;
} {
  const raw = input.signedDate;
  const text = typeof raw === 'string' ? raw.trim() : raw instanceof Date ? raw.toISOString() : '';
  if (!text) {
    return { signedAt: null, ok: false, problem: 'A signing date is required: a backfilled contract is one that was already executed, and the date it was executed is the fact being recorded.' };
  }
  // A date-only value is midday UTC rather than midnight, so the calendar day
  // survives a reader in any timezone — the same trap the `date` vs `datetime`
  // split creates everywhere in this model.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00.000Z` : text;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return { signedAt: null, ok: false, problem: `The signing date "${text}" is not a date.` };
  }
  if (ms > Date.now()) {
    return { signedAt: null, ok: false, problem: 'The signing date is in the future. A backfill records a contract that has already been executed.' };
  }
  return { signedAt: new Date(ms).toISOString(), ok: true, problem: null };
}

const DATE_OK = 'has(vars.stamps) && vars.stamps.ok == true';
const DATE_BAD = '!has(vars.stamps) || vars.stamps.ok != true';
const PARTY_OK = 'has(vars.partyRecord) && vars.partyRecord != null && has(vars.partyRecord.id) && vars.partyRecord.risk_flag != "blocked"';
const PARTY_BAD = '!has(vars.partyRecord) || vars.partyRecord == null || !has(vars.partyRecord.id) || vars.partyRecord.risk_flag == "blocked"';

export const ExecutedUploadFlow: Flow = {
  name: 'executed_upload',
  label: 'Backfill An Executed Contract',
  description: 'Record a contract that was signed outside this system: create it directly in active with is_backfilled set, and file the executed copy as its final signed version.',
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
    { name: 'our_entity', type: 'text', isInput: true, isOutput: false, defaultValue: 'head_office' },
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
      config: { function: 'clm_backfill_stamps', inputs: { signedDate: '{signed_date}' }, outputVariable: 'stamps' },
    },
    { id: 'decide_date', type: 'decision', label: 'Signing Date Usable?' },
    {
      id: 'refuse_date',
      type: 'end',
      label: 'Refuse — Signing Date',
      config: { outcome: 'refused', message: '{stamps.problem}' },
    },

    {
      id: 'get_party',
      type: 'get_record',
      label: 'Load Counterparty',
      config: {
        objectName: 'clm_party',
        filter: { id: '{party}' },
        fields: ['id', 'name', 'risk_flag'],
        outputVariable: 'partyRecord',
      },
    },
    { id: 'decide_party', type: 'decision', label: 'Counterparty Usable?' },
    {
      id: 'refuse_party',
      type: 'end',
      label: 'Refuse — Counterparty',
      config: {
        // The same refusal `draft → submitted` makes in `contract.hook.ts`,
        // repeated here because the backfill never passes that guard: a
        // blocked counterparty is blocked whichever door the contract came in.
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
          title: '{title}',
          contract_type: '{contract_type}',
          party: '{party}',
          our_entity: '{our_entity}',
          department: '{department}',
          amount: '{amount}',
          currency_code: '{currency_code}',
          start_date: '{start_date}',
          end_date: '{end_date}',
          term_months: '{term_months}',
          auto_renew: '{auto_renew}',
          renewal_notice_days: '{renewal_notice_days}',
          governing_law: '{governing_law}',
          summary: '{summary}',
          archive_no: '{archive_no}',
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
          signed_at: '{stamps.signedAt}',
          executed_at: '{stamps.signedAt}',
          activated_at: '{stamps.signedAt}',
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
          contract: '{contractRecord.id}',
          version_no: 1,
          kind: 'final_signed',
          turn: 'internal',
          // WRITTEN as the id: a file field READS as `{ id, name, size, … }`
          // and card 05 measured the object form refused with "expected
          // string, received object".
          file: '{executed_file}',
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
    { id: 'b3', source: 'decide_date', target: 'refuse_date', type: 'default', label: 'Unusable', condition: DATE_BAD },
    { id: 'b4', source: 'decide_date', target: 'get_party', type: 'default', label: 'Usable', condition: DATE_OK },
    { id: 'b5', source: 'get_party', target: 'decide_party', type: 'default' },
    { id: 'b6', source: 'decide_party', target: 'refuse_party', type: 'default', label: 'Missing or blocked', condition: PARTY_BAD },
    { id: 'b7', source: 'decide_party', target: 'create_contract', type: 'default', label: 'Usable', condition: PARTY_OK },
    { id: 'b8', source: 'create_contract', target: 'file_executed_copy', type: 'default' },
    { id: 'b9', source: 'file_executed_copy', target: 'end', type: 'default' },
  ],
};
