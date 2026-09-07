import { P, expression } from '@objectstack/spec';
import type { Flow } from '@objectstack/spec/automation';
import { Signature } from '../objects/signature.object.js';

/**
 * F7 `signature_record` — the execution-formalities check (DESIGN.md §06 F7,
 * §03 状态机 `signing → active`).
 *
 * A signing round that reaches `completed` is not yet an EXECUTED contract:
 * the contract type may require a countersigned copy, a company seal,
 * notarization or a witness (`clm_contract_type.execution_formalities`,
 * stamped onto the contract). This flow compares what was actually done
 * (`clm_signature.formalities_done`) against what the contract requires, and
 * takes one of two branches:
 *
 *  - **covered** — stamp the contract's `executed_at` and create the
 *    `final_signed` version from the round's `executed_file`;
 *  - **short** — notify the legal owner, NAMING the formalities that are
 *    missing, so the wet-ink path (legal or records uploads the executed copy
 *    and ticks the formalities afterwards) has something to act on.
 *
 * ## Why it compares against the CONTRACT's stamped copy, not the type's
 *
 * DESIGN.md §06 F7 says "比对 `formalities_done` 与类型 `execution_formalities`".
 * The contract carries that list already: `contract.hook.ts` copies it off the
 * type on insert and whenever the type changes, and `clm_contract` declares it
 * `readonly` for exactly that reason. The `signing → active` guard in the same
 * hook reads the contract's copy — so reading the TYPE here would create a
 * second source of truth that disagrees with the state machine the moment an
 * admin edits a type mid-flight: this flow would stamp `executed_at` against
 * the new list while activation still measured the old one, or the reverse.
 * One list, read where the guard reads it.
 *
 * ## Two flows, because a record-change flow binds ONE event
 *
 * `signature_record` binds `record-after-update` — the e-signature path
 * (`draft → sent → completed`) and the wet-ink path (`draft → completed`)
 * both arrive as updates. `signature_record_on_create` is its insert-time
 * twin: `signature_state_machine` (`contract.hook.ts`) guards `beforeUpdate`
 * only, so a row CREATED with `status: 'completed'` — an import, a connector
 * callback, an API insert — never passes through an update and would never be
 * compared at all. Same nodes and edges, start node rebound; the shape
 * HotCRM's `OpportunityApprovalOnCreateFlow` ships for the same reason.
 *
 * ## Re-entrant on purpose
 *
 * The update-leg start condition is `status == "completed"`, NOT "entered
 * completed this write". That is deliberate and is what makes the wet-ink
 * path work: records or legal tick `formalities_done` and upload the executed
 * copy on an already-completed round, in either order, and each of those
 * writes re-runs the comparison. The flow never writes `clm_signature`, so it
 * cannot re-trigger itself.
 *
 * Each of the two outcomes carries its OWN idempotence key, because they are
 * reached on different writes:
 *
 *  - the `executed_at` stamp is keyed on `executed_at` being empty, so the
 *    timestamp never moves once set;
 *  - the `final_signed` version is keyed on whether one already exists
 *    (`get_final_version`, read live) — never on `executed_at`. Keying it on
 *    the stamp is what broke the wet-ink order in the first place; the
 *    measurement is on `FILED` below;
 *  - the missing-copy notice is keyed on the stamp having happened on THIS
 *    run, so it is sent once rather than on every later edit of the round.
 *
 * `runAs: 'system'` (DESIGN.md §06, the closing line): `executed_at` is
 * `readonly` on `clm_contract` and field-level security makes it read-only
 * for every position (§04) — a stamp that only a platform write may land.
 * The same declaration is what lets the flow run at all when the round is
 * completed by a connector callback that carries no user (F8, card 12).
 */

/** The four formalities, label-mapped so a notification names them the way the forms do. */
const FORMALITY_LABELS: Record<string, string> = Object.fromEntries(
  ((Signature.fields.formalities_done as { options?: ReadonlyArray<{ label: string; value: unknown }> }).options ?? [])
    .map(({ label, value }) => [String(value), label]),
);

if (Object.keys(FORMALITY_LABELS).length === 0) {
  throw new Error('clm_signature.formalities_done has no options; F7 names the missing formalities from the field.');
}

/**
 * Normalise a multi-select value to a string array.
 *
 * A `multiple: true` select does not arrive in one shape: the data API answers
 * with an array, a driver that stores the column as text answers with CSV, and
 * an unset column answers `null` or is absent from the row altogether. The
 * comparison is a set operation, so every one of those has to become a list
 * before it is compared — a CSV string treated as a list would compare its
 * CHARACTERS, and `null` treated as a list would report every formality
 * missing on a contract that requires none.
 */
function toValueList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v !== '');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(',').map((v) => v.trim()).filter((v) => v !== '');
  }
  return [];
}

/** First non-empty id in the list, or null — the notification's recipient ladder. */
function firstUserId(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate.trim();
    // A lookup can come back expanded (`{ id, name }`) rather than as a bare id.
    if (candidate && typeof candidate === 'object' && 'id' in candidate) {
      const id = (candidate as { id?: unknown }).id;
      if (typeof id === 'string' && id !== '') return id;
    }
  }
  return null;
}

/**
 * The one registered function F7 calls (`defineStack({ functions })`).
 * Contractually pure: it reads its inputs, returns the comparison, and writes
 * nothing — every write stays on the flow graph where the run can count it.
 *
 * It does NOT decide anything the metadata already decides: the required set
 * is the contract's stamped `execution_formalities`, the done set is the
 * round's `formalities_done`. What it adds is the three things CEL on an edge
 * cannot do — a set difference, the label lookup that lets the notification
 * name the missing formality, and the next version number.
 */
export function signatureExecution({ input }: { input: Record<string, unknown> }): {
  covered: boolean;
  missing: string[];
  missingText: string;
  requiredCount: number;
  nextVersionNo: number;
  recipient: string | null;
} {
  const required = toValueList(input.required);
  const done = toValueList(input.done);
  const missing = required.filter((formality) => !done.includes(formality));
  const versionCount = Number(input.versionCount);
  return {
    covered: missing.length === 0,
    missing,
    missingText: missing.map((formality) => FORMALITY_LABELS[formality] ?? formality).join(', '),
    requiredCount: required.length,
    // The unique index on (contract, version_no) is what keeps this honest: a
    // roll-up that had not caught up would collide loudly rather than silently
    // overwrite a version.
    nextVersionNo: Number.isFinite(versionCount) && versionCount >= 0 ? Math.floor(versionCount) + 1 : 1,
    recipient: firstUserId([input.legalOwner, input.contractOwner]),
  };
}

/**
 * The edge vocabulary. Every decision below is written as an explicitly
 * partitioning set of edges in opposite polarity: a decision's out-edges are
 * evaluated independently and an unevaluable one ABORTS the step rather than
 * skipping it, so nothing is left to a default edge and every read is
 * `has()`-guarded and null-guarded before it is dereferenced.
 */
const COVERED = 'has(vars.execution) && vars.execution.covered == true';
const NOT_COVERED = 'has(vars.execution) && vars.execution.covered != true';

/**
 * `vars.contractRecord` is the snapshot `get_contract` took at the top of the
 * run, so `contractRecord.executed_at` reads EMPTY for the whole of the run
 * that stamps it and non-empty on every later run. That is what separates
 * "the formalities completed just now" from "they completed some time ago",
 * and it is the only thing keeping the missing-copy notice from repeating on
 * every subsequent edit of the round.
 */
const NOT_STAMPED = '(!has(vars.contractRecord.executed_at) || vars.contractRecord.executed_at == null || vars.contractRecord.executed_at == "")';
const ALREADY_STAMPED = '(has(vars.contractRecord.executed_at) && vars.contractRecord.executed_at != null && vars.contractRecord.executed_at != "")';
const JUST_STAMPED = NOT_STAMPED;

/**
 * Whether a `final_signed` version already exists — read live by
 * `get_final_version`, NOT inferred from `executed_at`.
 *
 * This is the idempotence key, and which key it is decides whether the
 * wet-ink path works at all. MEASURED on 17.3.0: with the guard on
 * `executed_at`, a round whose formalities were ticked BEFORE the executed
 * copy was uploaded — the exact order DESIGN.md §06 F7 prescribes for wet ink
 * ("法务或档案岗在签署记录上传执行副本并勾选形式") — stamped `executed_at` on the
 * tick, and every later run short-circuited on "already executed", so the
 * upload filed nothing and no `final_signed` version was ever created. §03's
 * `signing → active` guard requires that version, and `executed_at` is
 * `readonly`, so the contract could not be activated and there was no
 * in-product way back. Keying on the version itself makes the two writes
 * independent: the stamp happens once, the filing happens when the copy
 * arrives, in either order.
 */
const FILED = '(has(vars.existingFinal) && vars.existingFinal != null && has(vars.existingFinal.id))';
const NOT_FILED = '(!has(vars.existingFinal) || vars.existingFinal == null || !has(vars.existingFinal.id))';

/** A file field READS as `{ id, name, size, mimeType, url }`; absent is null. */
const HAS_FILE = '(has(vars.signatureRecord.executed_file) && vars.signatureRecord.executed_file != null && has(vars.signatureRecord.executed_file.id))';
const NO_FILE = '(!has(vars.signatureRecord.executed_file) || vars.signatureRecord.executed_file == null || !has(vars.signatureRecord.executed_file.id))';

const HAS_RECIPIENT = '(has(vars.execution.recipient) && vars.execution.recipient != null && vars.execution.recipient != "")';
const NO_RECIPIENT = '(!has(vars.execution.recipient) || vars.execution.recipient == null || vars.execution.recipient == "")';

/** One decision's clauses, as a CEL predicate envelope. */
const when = (...clauses: string[]) => expression(clauses.join(' && '));

export const SignatureRecordFlow: Flow = {
  name: 'signature_record',
  label: 'Signature Completed — Execution Check',
  description: 'When a signing round completes, compare the formalities done against the ones the contract requires: stamp executed_at and file the final signed version when covered, or tell the legal owner which formality is missing.',
  type: 'record_change',
  status: 'active',
  // See the header: the stamp lands on a readonly, field-secured column, and
  // the round can be completed by a writer that carries no user at all.
  runAs: 'system',

  variables: [
    { name: 'signatureId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      config: {
        objectName: 'clm_signature',
        triggerType: 'record-after-update',
        // Re-entrant by design (see the header). Total over a sparse row:
        // `has()` before the read, because a condition that cannot be
        // evaluated ABORTS the dispatch rather than skipping it.
        condition: P`has(record.status) && record.status == "completed"`,
      },
    },
    {
      id: 'get_signature',
      type: 'get_record',
      label: 'Get Signature Round',
      // Re-read rather than trusting the trigger snapshot: `formalities_done`
      // is the value being compared, and the flow may also be entered from the
      // insert leg where the snapshot is the input payload.
      config: { objectName: 'clm_signature', filter: { id: '{record.id}' }, outputVariable: 'signatureRecord' },
    },
    {
      id: 'get_contract',
      type: 'get_record',
      label: 'Get Contract',
      config: { objectName: 'clm_contract', filter: { id: '{signatureRecord.contract}' }, outputVariable: 'contractRecord' },
    },
    {
      id: 'compare_formalities',
      type: 'script',
      label: 'Compare Execution Formalities',
      config: {
        function: 'clm_signature_execution',
        inputs: {
          required: '{contractRecord.execution_formalities}',
          done: '{signatureRecord.formalities_done}',
          versionCount: '{contractRecord.version_count}',
          legalOwner: '{contractRecord.legal_owner}',
          contractOwner: '{contractRecord.owner_id}',
        },
        outputVariable: 'execution',
      },
    },
    { id: 'decision_covered', type: 'decision', label: 'Every Required Formality Done?' },

    // ── Covered: stamp the contract and file the executed copy ────────────
    {
      id: 'stamp_executed',
      type: 'update_record',
      label: 'Stamp Executed At',
      config: {
        objectName: 'clm_contract',
        filter: { id: '{contractRecord.id}' },
        // `signed_at` is NOT written here. DESIGN.md §03 gives it to the
        // `signing → active` guard (which stamps both from the completed
        // round) and to F8's e-signature callback; F7's own sentence is
        // "盖合同 executed_at". Two writers for one column is the thing the
        // routing note in contract.hook.ts warns about.
        fields: { executed_at: '{signatureRecord.completed_at}' },
      },
    },
    {
      id: 'get_final_version',
      type: 'get_record',
      label: 'Existing Final Signed Version?',
      // The live idempotence key (see `FILED`). `findOne` sets the variable to
      // null when nothing matches, which is why every read of it is null-
      // guarded rather than only `has()`-guarded.
      config: {
        objectName: 'clm_contract_version',
        filter: { contract: '{contractRecord.id}', kind: 'final_signed' },
        fields: ['id', 'version_no'],
        outputVariable: 'existingFinal',
      },
    },
    { id: 'decision_executed_file', type: 'decision', label: 'Executed Copy Attached?' },
    {
      id: 'create_final_version',
      type: 'create_record',
      label: 'File Final Signed Version',
      config: {
        objectName: 'clm_contract_version',
        fields: {
          contract: '{contractRecord.id}',
          version_no: '{execution.nextVersionNo}',
          kind: 'final_signed',
          turn: 'internal',
          // `is_current` is deliberately left at its `false` default. The
          // negotiation flag is what `approved → signing` reads ("a current
          // clean version is required"), and DESIGN.md §03 keeps
          // `signing → approved` open for a failed signing round — moving the
          // flag onto the executed copy would make that rollback
          // unre-enterable.
          is_current: false,
          // A file field READS as `{ id, name, size, mimeType, url }` and is
          // WRITTEN as the id (card 05 measured the object form refused with
          // "expected string, received object").
          file: '{signatureRecord.executed_file.id}',
          notes: 'Executed copy filed from the completed signature round.',
        },
        outputVariable: 'finalVersion',
      },
    },
    {
      id: 'notify_executed_file_missing',
      type: 'notify',
      label: 'Notify — Executed Copy Missing',
      config: {
        recipients: '{execution.recipient}',
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'clm_execution_copy_missing',
        title: 'Executed copy missing: {contractRecord.title}',
        message: 'Every execution formality is done on the completed signing round, but no executed copy is attached, so no final signed version could be filed. Upload the executed document on the signature record.',
        sourceObject: 'clm_signature',
        sourceId: '{signatureRecord.id}',
      },
    },

    // ── Short: name the missing formalities to the legal owner ────────────
    { id: 'decision_recipient', type: 'decision', label: 'Someone To Tell?' },
    {
      id: 'notify_missing',
      type: 'notify',
      label: 'Notify — Formalities Missing',
      config: {
        recipients: '{execution.recipient}',
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'clm_execution_formalities_missing',
        title: 'Execution formalities outstanding: {contractRecord.title}',
        // The whole point of F7's short branch is naming WHICH one — a
        // notification that says "something is missing" sends the reader back
        // to the same comparison the flow just did.
        message: 'The signing round completed, but this contract cannot be activated until these execution formalities are recorded on the signature round: {execution.missingText}.',
        sourceObject: 'clm_signature',
        sourceId: '{signatureRecord.id}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_signature', type: 'default' },
    { id: 'e2', source: 'get_signature', target: 'get_contract', type: 'default' },
    { id: 'e3', source: 'get_contract', target: 'compare_formalities', type: 'default' },
    { id: 'e4', source: 'compare_formalities', target: 'decision_covered', type: 'default' },

    // Three-way, partitioned: the two `covered` branches differ only in
    // whether the contract was ALREADY stamped when this run started, and
    // both continue to the executed-copy check. `vars.contractRecord` is the
    // snapshot `get_contract` read at the top of the run, so
    // `contractRecord.executed_at` still reads EMPTY throughout the run that
    // stamps it — which is what makes it usable as "stamped on this run"
    // further down (`JUST_STAMPED`).
    {
      id: 'e5', source: 'decision_covered', target: 'stamp_executed', type: 'default', label: 'Covered — stamp it',
      condition: when(COVERED, NOT_STAMPED),
    },
    {
      id: 'e6', source: 'decision_covered', target: 'decision_recipient', type: 'default', label: 'Short',
      condition: when(NOT_COVERED),
    },
    {
      id: 'e7', source: 'decision_covered', target: 'get_final_version', type: 'default', label: 'Covered — already stamped',
      condition: when(COVERED, ALREADY_STAMPED),
    },

    { id: 'e8', source: 'stamp_executed', target: 'get_final_version', type: 'default' },
    { id: 'e8b', source: 'get_final_version', target: 'decision_executed_file', type: 'default' },

    // Four-way, partitioned. The `file` field is REQUIRED on
    // clm_contract_version, so a round with no executed copy cannot produce
    // one: creating it anyway would fail the run AFTER `executed_at` was
    // stamped. Say so instead — once.
    {
      id: 'e8c', source: 'decision_executed_file', target: 'end', type: 'default', label: 'Already filed',
      condition: when(FILED),
    },
    {
      id: 'e9', source: 'decision_executed_file', target: 'create_final_version', type: 'default', label: 'Attached',
      condition: when(NOT_FILED, HAS_FILE),
    },
    {
      id: 'e10', source: 'decision_executed_file', target: 'notify_executed_file_missing', type: 'default', label: 'Missing — tell them once',
      condition: when(NOT_FILED, NO_FILE, JUST_STAMPED, HAS_RECIPIENT),
    },
    {
      id: 'e11', source: 'decision_executed_file', target: 'end', type: 'default', label: 'Missing — already told, or nobody to tell',
      condition: when(NOT_FILED, NO_FILE, `(${ALREADY_STAMPED} || ${NO_RECIPIENT})`),
    },
    { id: 'e12', source: 'create_final_version', target: 'end', type: 'default' },
    { id: 'e13', source: 'notify_executed_file_missing', target: 'end', type: 'default' },

    // A notify node's `recipients` is required AT EXECUTE TIME — an empty one
    // fails the step, not the delivery. `legal_owner` is only assigned when
    // the type requires legal review, so the short branch checks before it
    // sends rather than failing a run over an unassignable notification.
    {
      id: 'e14', source: 'decision_recipient', target: 'notify_missing', type: 'default', label: 'Notify',
      condition: when(HAS_RECIPIENT),
    },
    {
      id: 'e15', source: 'decision_recipient', target: 'end', type: 'default', label: 'Nobody to tell',
      condition: when(NO_RECIPIENT),
    },
    { id: 'e16', source: 'notify_missing', target: 'end', type: 'default' },
  ],
};

/**
 * Insert-time twin of `signature_record` — see the header. A record-change
 * flow binds exactly one hook event, so the after-update flow above never sees
 * a round CREATED as `completed`, and `signature_state_machine` guards only
 * `beforeUpdate`, leaving that path open. Same nodes and edges; only the start
 * node is rebound.
 */
export const SignatureRecordOnCreateFlow: Flow = {
  ...SignatureRecordFlow,
  name: 'signature_record_on_create',
  label: 'Signature Completed — Execution Check (on create)',
  description: 'Execution-formalities check for a signing round created already completed (insert-time twin of signature_record).',
  nodes: SignatureRecordFlow.nodes.map((node) =>
    node.id === 'start'
      ? { ...node, config: { ...node.config, triggerType: 'record-after-create' } }
      : node,
  ),
};
