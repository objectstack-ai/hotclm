import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api.js';

/**
 * Contract lifecycle hooks — the write-layer truth for DESIGN.md §03.
 *
 * - `contract_type_stamp` (beforeInsert / beforeUpdate): a contract is born
 *   `draft` (the FSM entry point; a system write — F16 backfill, seed replay —
 *   is exempt), copies `category`, `direction` and `execution_formalities`
 *   from its type, and receives its number `<type.code>-<YYYY>-<0000>` — one
 *   sequence per type per year, next = max existing + 1 within the
 *   organization (§13 Q5). Changing the type is allowed only on a draft and
 *   re-stamps all four.
 * - `contract_state_machine` (beforeUpdate on `status`): the transition table
 *   and every guard of §03 状态机, refusing with a structured error rather
 *   than coercing, and stamping the stage timestamp on each entry.
 * - `deviation_state_machine`, `signature_state_machine`: the child machines.
 *
 * ## Why every helper lives INSIDE its handler
 *
 * `objectstack build` lowers each handler to a metadata-only body evaluated
 * in a sandbox with no module scope; a handler that references a module-level
 * helper or import cannot be lowered and is silently bundled instead
 * (`os lint` reports it as `hook-body/not-lowerable`). So `refuse()` and the
 * small tables are repeated per handler on purpose.
 *
 * ## The refusal envelope
 *
 * The REST layer maps a thrown error to its HTTP envelope from exactly two
 * properties: `status` (a number) and `code` (a member of the platform's
 * ErrorCode vocabulary — `INVALID_STATE` is the ledger's word for "understood,
 * but the record is not in a state that allows this"). A code without a
 * status is filed as a 500 server fault, which is why both are always set.
 */

const contractTypeStamp: Hook = {
  name: 'contract_type_stamp',
  object: 'clm_contract',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  // The sequence must count every contract of the organization, not the rows
  // the acting user happens to own: `clm_contract` is `private`, so an
  // inherited context would number per user and collide on the unique index.
  // `runAs` elevates the hook's `ctx.api` reads only; `ctx.session` still
  // describes the caller.
  runAs: 'system',
  description: 'Stamp category, direction, execution formalities and the contract number from the contract type; refuse a contract born in any state but draft.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const api = ctx.api as HookApi | undefined;

    if (event === 'beforeInsert') {
      const status = input.status;
      if (status !== undefined && status !== null && status !== 'draft' && ctx.session?.isSystem !== true) {
        throw refuse(
          `A contract is created as a draft, not as ${String(status)}. Submit it after creation; an already-executed contract is entered through the backfill action.`,
          'INVALID_STATE',
          422,
        );
      }
    }

    const typeChanged =
      event === 'beforeInsert' ||
      (typeof input.contract_type === 'string' && input.contract_type !== previous.contract_type);
    if (!typeChanged) return;

    if (event === 'beforeUpdate' && previous.status !== 'draft') {
      throw refuse(
        `The contract type can only change while the contract is a draft (it is ${String(previous.status)}); the number and the routing derive from it.`,
        'INVALID_STATE',
        422,
      );
    }

    const typeId =
      (typeof input.contract_type === 'string' && input.contract_type) ||
      (typeof previous.contract_type === 'string' && previous.contract_type) ||
      '';
    if (!typeId) throw refuse('A contract type is required.', 'MISSING_REQUIRED_FIELD', 422);
    if (!api) throw refuse('The data API is not available to the contract stamping hook.', 'INTERNAL_ERROR', 500);

    const type = await api.object('clm_contract_type').findOne({
      where: { id: typeId },
      fields: ['id', 'code', 'category', 'direction', 'execution_formalities'],
    });
    if (!type) throw refuse(`Contract type ${typeId} does not exist.`, 'INVALID_REFERENCE', 422);
    const code = typeof type.code === 'string' ? type.code.trim() : '';
    if (!code) throw refuse(`Contract type ${typeId} has no code; a code is what the contract number is built from.`, 'INVALID_STATE', 422);

    input.category = typeof type.category === 'string' ? type.category : null;
    input.direction = typeof type.direction === 'string' ? type.direction : null;
    input.execution_formalities = Array.isArray(type.execution_formalities) ? [...type.execution_formalities] : [];

    // Next number: max existing sequence for this type and year, plus one.
    // Scoped to the organization the write belongs to, in the blessed order
    // (acting user's org, session org, the row's own stamp); an unscoped read
    // under an elevated context would otherwise meet other organizations'
    // contracts. Max-plus-one rather than count-plus-one so a deleted draft
    // leaves a gap instead of a duplicate.
    const year = new Date().getUTCFullYear();
    const prefix = `${code}-${year}-`;
    const organizationId = [
      ctx.user?.organizationId,
      ctx.session?.organizationId,
      input.organization_id,
      previous.organization_id,
    ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
    const rows = await api.object('clm_contract').find({
      where: organizationId
        ? { organization_id: organizationId, contract_number: { $startsWith: prefix } }
        : { contract_number: { $startsWith: prefix } },
      fields: ['contract_number'],
      top: 10000,
    });
    let max = 0;
    for (const row of rows) {
      const number = typeof row.contract_number === 'string' ? row.contract_number : '';
      const seq = Number(number.slice(prefix.length));
      if (Number.isInteger(seq) && seq > max) max = seq;
    }
    input.contract_number = `${prefix}${String(max + 1).padStart(4, '0')}`;
  },
};

const contractStateMachine: Hook = {
  name: 'contract_state_machine',
  object: 'clm_contract',
  events: ['beforeUpdate'],
  priority: 200,
  description: 'Enforce the contract status transition table and its guards; stamp the stage timestamp on each entry.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const to = input.status;
    if (typeof to !== 'string') return;
    const from = typeof previous.status === 'string' ? previous.status : 'draft';
    if (to === from) return;

    // DESIGN.md §03 状态机 — from → allowed targets. expired, terminated and
    // cancelled are terminal; renewal and amendment are new contracts.
    const TRANSITIONS: Record<string, string[]> = {
      draft:       ['submitted', 'cancelled'],
      submitted:   ['in_review', 'in_approval', 'draft', 'cancelled'],
      in_review:   ['in_approval', 'draft', 'cancelled'],
      in_approval: ['approved', 'rejected', 'draft', 'cancelled'],
      approved:    ['signing', 'cancelled'],
      signing:     ['active', 'approved', 'cancelled'],
      active:      ['expired', 'terminated'],
      rejected:    ['draft'],
      expired:     [],
      terminated:  [],
      cancelled:   [],
    };
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw refuse(
        allowed.length === 0
          ? `A ${from} contract is closed; its status cannot change to ${to}. Start a renewal or an amendment instead.`
          : `Contract status cannot go from ${from} to ${to}. Allowed from ${from}: ${allowed.join(', ')}.`,
        'INVALID_STATE',
        422,
      );
    }

    const api = ctx.api as HookApi | undefined;
    if (!api) throw refuse('The data API is not available to the contract state machine.', 'INTERNAL_ERROR', 500);
    const id = typeof previous.id === 'string' ? previous.id : '';
    const get = (key: string): unknown => (input[key] !== undefined ? input[key] : previous[key]);
    const isSet = (value: unknown): boolean =>
      !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    const now = new Date().toISOString();

    async function loadType(): Promise<Record<string, unknown>> {
      const typeId = get('contract_type');
      const type = isSet(typeId)
        ? await api!.object('clm_contract_type').findOne({
            where: { id: typeId },
            fields: ['id', 'intake_fields', 'requires_legal_review', 'template_file'],
          })
        : null;
      if (!type) throw refuse('The contract has no contract type; one is required to move it forward.', 'INVALID_STATE', 422);
      return type;
    }

    if (from === 'draft' && to === 'submitted') {
      const type = await loadType();
      const partyId = get('party');
      if (!isSet(partyId)) throw refuse('A counterparty is required before submission.', 'INVALID_STATE', 422);
      const party = await api.object('clm_party').findOne({ where: { id: partyId }, fields: ['id', 'name', 'risk_flag'] });
      if (!party) throw refuse(`Counterparty ${String(partyId)} does not exist.`, 'INVALID_REFERENCE', 422);
      if (party.risk_flag === 'blocked') {
        throw refuse(`Counterparty ${String(party.name ?? partyId)} is blocked; a contract with a blocked party cannot be submitted.`, 'INVALID_STATE', 422);
      }
      const intake = Array.isArray(type.intake_fields) ? type.intake_fields : [];
      const missing = intake.filter((field): field is string => typeof field === 'string' && !isSet(get(field)));
      if (missing.length > 0) {
        throw refuse(`Intake fields required by the contract type are missing: ${missing.join(', ')}.`, 'INVALID_STATE', 422);
      }
      const versions = await api.object('clm_contract_version').count({ where: { contract: id } });
      if (versions === 0 && !isSet(type.template_file)) {
        throw refuse('Upload a first version, or choose a contract type that carries a template, before submitting.', 'INVALID_STATE', 422);
      }
      input.submitted_at = now;
    }

    if (from === 'submitted' && (to === 'in_review' || to === 'in_approval')) {
      const type = await loadType();
      // The field defaults to true; an unset value reads as the default.
      const requiresLegalReview = type.requires_legal_review !== false;
      if (to === 'in_review') {
        if (!requiresLegalReview) {
          throw refuse('This contract type does not require legal review; a submitted contract of this type goes straight to in_approval.', 'INVALID_STATE', 422);
        }
        if (!isSet(get('legal_owner'))) {
          throw refuse('Assign a legal owner before the contract enters review.', 'INVALID_STATE', 422);
        }
        input.review_started_at = now;
      } else if (requiresLegalReview) {
        throw refuse('This contract type requires legal review; the next state after submitted is in_review, not in_approval.', 'INVALID_STATE', 422);
      }
    }

    if (from === 'in_review' && to === 'in_approval') {
      const openDeviations = await api.object('clm_deviation').count({ where: { contract: id, status: 'open' } });
      if (openDeviations > 0) {
        throw refuse(`${openDeviations} deviation(s) are still open; decide each one before the contract enters approval.`, 'INVALID_STATE', 422);
      }
      const legalApprovals = await api.object('clm_review').count({ where: { contract: id, stage: 'legal', decision: 'approved' } });
      if (legalApprovals === 0) {
        throw refuse('An approved legal review is required before the contract enters approval.', 'INVALID_STATE', 422);
      }
    }

    if (from === 'in_review' && to === 'draft') {
      const sendBacks = await api.object('clm_review').count({
        where: { contract: id, decision: { $in: ['changes_requested', 'rejected'] } },
      });
      if (sendBacks === 0) {
        throw refuse('Returning a contract from review to draft needs a review with the decision changes_requested (or rejected) recorded.', 'INVALID_STATE', 422);
      }
    }

    if (from === 'in_approval' && to === 'approved') {
      input.approved_at = now;
    }

    if (from === 'approved' && to === 'signing') {
      const cleanVersions = await api.object('clm_contract_version').count({
        where: { contract: id, kind: 'clean', is_current: true },
      });
      if (cleanVersions === 0) {
        throw refuse('A current clean version is required before signing.', 'INVALID_STATE', 422);
      }
    }

    if (from === 'signing' && to === 'active') {
      const required = Array.isArray(get('execution_formalities'))
        ? (get('execution_formalities') as unknown[]).filter((f): f is string => typeof f === 'string')
        : [];
      const completed = await api.object('clm_signature').find({
        where: { contract: id, status: 'completed' },
        fields: ['id', 'formalities_done', 'completed_at'],
        top: 50,
      });
      const executed = completed.find((signature) => {
        const done = Array.isArray(signature.formalities_done) ? signature.formalities_done : [];
        return required.every((formality) => done.includes(formality));
      });
      if (!executed) {
        throw refuse(
          completed.length === 0
            ? 'A completed signature round is required before activation.'
            : `A completed signature round must record every execution formality the contract type requires (${required.join(', ')}) before activation.`,
          'INVALID_STATE',
          422,
        );
      }
      const finalVersions = await api.object('clm_contract_version').count({ where: { contract: id, kind: 'final_signed' } });
      if (finalVersions === 0) {
        throw refuse('A final_signed version is required before activation.', 'INVALID_STATE', 422);
      }
      const executedAt = typeof executed.completed_at === 'string' && executed.completed_at ? executed.completed_at : now;
      if (!isSet(get('signed_at'))) input.signed_at = executedAt;
      if (!isSet(get('executed_at'))) input.executed_at = executedAt;
      input.activated_at = now;
    }

    if (from === 'active' && to === 'expired' && ctx.session?.isSystem !== true) {
      throw refuse('Only the expiry job marks a contract expired; terminate it to end it by hand.', 'INVALID_STATE', 422);
    }

    if (to === 'terminated') {
      input.closed_at = now;
    }
  },
};

const deviationStateMachine: Hook = {
  name: 'deviation_state_machine',
  object: 'clm_deviation',
  events: ['beforeUpdate'],
  priority: 200,
  description: 'A deviation is decided once: open → accepted / rejected / withdrawn; stamp decided_at and decided_by on decision.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const to = input.status;
    if (typeof to !== 'string') return;
    const from = typeof previous.status === 'string' ? previous.status : 'open';
    if (to === from) return;
    const DECIDED = ['accepted', 'rejected', 'withdrawn'];
    if (from !== 'open' || !DECIDED.includes(to)) {
      throw refuse(
        from === 'open'
          ? `Deviation status cannot go from open to ${to}. Allowed: ${DECIDED.join(', ')}.`
          : `A ${from} deviation is final; its status cannot change to ${to}. Record a new deviation instead.`,
        'INVALID_STATE',
        422,
      );
    }
    const isSet = (value: unknown): boolean => !(value === undefined || value === null || value === '');
    if (!isSet(input.decided_at !== undefined ? input.decided_at : previous.decided_at)) {
      input.decided_at = new Date().toISOString();
    }
    if (!isSet(input.decided_by !== undefined ? input.decided_by : previous.decided_by)) {
      const actor = ctx.user?.id ?? ctx.session?.userId;
      if (typeof actor === 'string' && actor) input.decided_by = actor;
    }
  },
};

const signatureStateMachine: Hook = {
  name: 'signature_state_machine',
  object: 'clm_signature',
  events: ['beforeUpdate'],
  priority: 200,
  description: 'Signature round transitions: draft → sent / completed / voided, sent → completed / declined / voided, declined → draft; wet ink may complete straight from draft.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const to = input.status;
    if (typeof to !== 'string') return;
    const from = typeof previous.status === 'string' ? previous.status : 'draft';
    if (to === from) return;
    const TRANSITIONS: Record<string, string[]> = {
      draft:     ['sent', 'completed', 'voided'],
      sent:      ['completed', 'declined', 'voided'],
      declined:  ['draft'],
      completed: [],
      voided:    [],
    };
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw refuse(
        allowed.length === 0
          ? `A ${from} signature round is final; its status cannot change to ${to}. Open a new round instead.`
          : `Signature status cannot go from ${from} to ${to}. Allowed from ${from}: ${allowed.join(', ')}.`,
        'INVALID_STATE',
        422,
      );
    }
    const method = input.method !== undefined ? input.method : previous.method;
    if (from === 'draft' && to === 'completed' && method !== 'wet_ink') {
      throw refuse('An e-signature round completes from sent, not from draft; send the envelope first. Only a wet-ink round completes directly.', 'INVALID_STATE', 422);
    }
    if (to === 'completed') {
      const completedAt = input.completed_at !== undefined ? input.completed_at : previous.completed_at;
      if (completedAt === undefined || completedAt === null || completedAt === '') {
        input.completed_at = new Date().toISOString();
      }
    }
  },
};

export default [contractTypeStamp, contractStateMachine, deviationStateMachine, signatureStateMachine];
