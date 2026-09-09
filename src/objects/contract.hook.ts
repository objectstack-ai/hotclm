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
 * - `contract_route` (beforeUpdate, F2 of §06): on the way into `submitted`
 *   and into `in_approval`, evaluates the approval matrix and stamps the UNION
 *   of the `route_*` flags of every matching rule, and — when the type
 *   requires legal review — assigns `legal_owner` to the legal counsel with
 *   the fewest open contracts. Runs at priority 150, between the type stamp
 *   and the state machine, so the machine's onward hop can read what it set.
 * - `contract_state_machine` (beforeUpdate on `status`): the transition table
 *   and every guard of §03 状态机, refusing with a structured error rather
 *   than coercing, and stamping the stage timestamp on each entry. Since F2
 *   the machine also takes the AUTOMATIC onward hop of §06: `draft →
 *   submitted` continues to `in_review` (a legal owner was assigned) or to
 *   `in_approval` (the type needs no legal review) in the same write, and the
 *   hop is validated by the same guard block a hand-made transition meets.
 * - `contract_archive` (beforeUpdate, F14 of §06): a closed contract that
 *   gains an `archive_no` is stamped `archived_at`, an archive number on a
 *   live contract is refused, and an archived contract is frozen against
 *   everything but its `summary`.
 * - `contract_activate` (afterUpdate, F9 of §06): a contract ENTERING
 *   `active` gets its `activated_at` if the transition guard did not stamp
 *   one, and the renewal-reminder obligation §06 asks for. It expands NO
 *   payment arrangement — decision #14, ruled A on 2026-09-09. Insert-time
 *   activation is deliberately NOT bound; the measurement is on the hook.
 * - `deviation_gate` (afterUpdate on `clm_deviation`, F6 of §06): an accepted
 *   deviation from a clause that `requires_legal_head` stamps
 *   `route_legal_head` on the parent contract. The other half of F6 — no
 *   `open` deviation may enter `in_approval` — is the state machine's guard,
 *   applied on BOTH edges into `in_approval`.
 * - `deviation_state_machine`, `signature_state_machine`,
 *   `obligation_state_machine`, `payment_plan_state_machine`: the child
 *   machines. The last two also hold the `overdue` reservation — that state
 *   has exactly one writer, the daily job of card 09, and a write to it from
 *   a person is refused on BOTH write paths rather than hidden in the form.
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

const contractRoute: Hook = {
  name: 'contract_route',
  object: 'clm_contract',
  events: ['beforeUpdate'],
  priority: 150,
  // System context, measured as REQUIRED rather than convenient: the two
  // reads this hook makes are outside a requester's reach by construction.
  // `sys_user_position` is a platform object a requester cannot list, and the
  // per-counsel open-contract tally counts OTHER people's contracts on a
  // `private` object — under an inherited context every counsel would tally
  // 0 and the "fewest open contracts" rule would degrade to "first in the
  // list". `runAs` elevates `ctx.api` only; `ctx.session` still describes
  // the caller.
  runAs: 'system',
  description: 'F2: on entering submitted (and again on entering in_approval), stamp the union of route_* from every matching approval rule; on submission assign legal_owner to the legal counsel with the fewest open contracts when the type requires legal review.',
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
    const submitting = from === 'draft' && to === 'submitted';
    const enteringApproval = to === 'in_approval' && (from === 'submitted' || from === 'in_review');
    if (!submitting && !enteringApproval) return;

    const api = ctx.api as HookApi | undefined;
    if (!api) throw refuse('The data API is not available to the contract routing hook.', 'INTERNAL_ERROR', 500);
    const id = typeof previous.id === 'string' ? previous.id : '';
    const get = (key: string): unknown => (input[key] !== undefined ? input[key] : previous[key]);
    const isSet = (value: unknown): boolean =>
      !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    const organizationId = [
      ctx.user?.organizationId,
      ctx.session?.organizationId,
      input.organization_id,
      previous.organization_id,
    ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
    const inOrganization = (row: Record<string, unknown>): boolean =>
      !organizationId || row.organization_id === undefined || row.organization_id === null || row.organization_id === '' || row.organization_id === organizationId;

    // The category and direction are card 02's stamps (contract_type_stamp,
    // priority 100, on insert and on a draft's type change). They are READ
    // here, never re-derived: a contract without them is a contract that
    // never went through the stamp, and the fix is to set its type on the
    // draft, not a second copy of the stamping.
    const category = get('category');
    const direction = get('direction');
    if (typeof category !== 'string' || !category) {
      throw refuse('The contract carries no category stamp, so the approval matrix cannot be evaluated; set its contract type while it is a draft.', 'INVALID_STATE', 422);
    }
    const rawAmount = get('amount');
    // A contract with no amount (an NDA, a framework without a value) sits in
    // the lowest band: an absent amount is 0, not "unbounded".
    const amount = typeof rawAmount === 'number' && Number.isFinite(rawAmount) ? rawAmount : Number(rawAmount) || 0;

    // Accepted deviations decide two things: the `only_with_deviation` match
    // and, through the clause's `requires_legal_head`, the legal-head rung
    // (F6, derived here so a resubmission never loses the stamp).
    const accepted = await api.object('clm_deviation').find({
      where: { contract: id, status: 'accepted' },
      fields: ['id', 'clause'],
      top: 500,
    });
    const clauseIds = [...new Set(accepted.map((row) => row.clause).filter((c): c is string => typeof c === 'string' && c !== ''))];
    let deviationNeedsLegalHead = false;
    if (clauseIds.length > 0) {
      const clauses = await api.object('clm_clause').find({
        where: { id: { $in: clauseIds } },
        fields: ['id', 'requires_legal_head'],
        top: 500,
      });
      deviationNeedsLegalHead = clauses.some((clause) => clause.requires_legal_head === true);
    }
    const hasAcceptedDeviation = accepted.length > 0;

    // The matrix: every ACTIVE rule that matches contributes its rungs, and
    // the contract climbs the union (clm_approval_rule.priority's own words).
    // A rule matches when: its categories are empty or contain the contract's;
    // its direction is empty / `any` or equals the contract's; the amount is
    // inside [amount_min, amount_max) with an absent bound meaning no bound;
    // and, if it is `only_with_deviation`, the contract carries an accepted
    // deviation.
    const rules = await api.object('clm_approval_rule').find({
      where: organizationId ? { is_active: true, organization_id: organizationId } : { is_active: true },
      fields: ['id', 'name', 'applies_to', 'direction', 'amount_min', 'amount_max', 'only_with_deviation', 'route_legal_head', 'route_finance', 'route_executive', 'route_gm'],
      top: 1000,
    });
    const flags = { route_legal_head: deviationNeedsLegalHead, route_finance: false, route_executive: false, route_gm: false };
    for (const rule of rules) {
      const appliesTo = Array.isArray(rule.applies_to) ? rule.applies_to : [];
      if (appliesTo.length > 0 && !appliesTo.includes(category)) continue;
      const ruleDirection = typeof rule.direction === 'string' ? rule.direction : 'any';
      if (ruleDirection !== 'any' && ruleDirection !== '' && ruleDirection !== direction) continue;
      const min = typeof rule.amount_min === 'number' ? rule.amount_min : rule.amount_min === null || rule.amount_min === undefined || rule.amount_min === '' ? null : Number(rule.amount_min);
      const max = typeof rule.amount_max === 'number' ? rule.amount_max : rule.amount_max === null || rule.amount_max === undefined || rule.amount_max === '' ? null : Number(rule.amount_max);
      if (min !== null && Number.isFinite(min) && amount < min) continue;
      if (max !== null && Number.isFinite(max) && amount >= max) continue;
      if (rule.only_with_deviation === true && !hasAcceptedDeviation) continue;
      if (rule.route_legal_head === true) flags.route_legal_head = true;
      if (rule.route_finance === true) flags.route_finance = true;
      if (rule.route_executive === true) flags.route_executive = true;
      if (rule.route_gm === true) flags.route_gm = true;
    }
    // The stamp IS the evaluation: all four flags are written, so a flag that
    // stopped matching (the amount was lowered before resubmission) clears,
    // and the record never carries a rung nothing routes it to.
    input.route_legal_head = flags.route_legal_head;
    input.route_finance = flags.route_finance;
    input.route_executive = flags.route_executive;
    input.route_gm = flags.route_gm;

    if (!submitting) return;

    // Legal owner: the legal counsel with the fewest open contracts, if the
    // type requires legal review and nobody assigned one by hand. Holders of
    // `clm_legal_counsel` are `sys_user_position` rows (position is the
    // position NAME there), within their validity window and this
    // organization. With no holder the contract stays `submitted` — the legal
    // queue of §05 ("待受理: submitted 且未分配") accepts it by hand.
    const typeId = get('contract_type');
    const type = isSet(typeId)
      ? await api.object('clm_contract_type').findOne({ where: { id: typeId }, fields: ['id', 'requires_legal_review'] })
      : null;
    if (!type) return; // the state machine refuses a contract without a type
    if (type.requires_legal_review === false) return;
    if (isSet(get('legal_owner'))) return;

    const nowMs = Date.now();
    const assignments = await api.object('sys_user_position').find({
      where: { position: 'clm_legal_counsel' },
      fields: ['id', 'user_id', 'organization_id', 'valid_from', 'valid_until'],
      top: 1000,
    });
    const holders = [...new Set(assignments
      .filter((row) => inOrganization(row))
      .filter((row) => {
        const fromMs = typeof row.valid_from === 'string' && row.valid_from ? Date.parse(row.valid_from) : row.valid_from instanceof Date ? row.valid_from.getTime() : NaN;
        const untilMs = typeof row.valid_until === 'string' && row.valid_until ? Date.parse(row.valid_until) : row.valid_until instanceof Date ? row.valid_until.getTime() : NaN;
        if (Number.isFinite(fromMs) && fromMs > nowMs) return false;
        if (Number.isFinite(untilMs) && untilMs <= nowMs) return false;
        return true;
      })
      .map((row) => row.user_id)
      .filter((user): user is string => typeof user === 'string' && user !== ''))];
    if (holders.length === 0) return;

    // "Open" = still moving toward execution; a closed or active contract is
    // no longer on the lawyer's desk.
    const OPEN_STATUSES = ['submitted', 'in_review', 'in_approval', 'approved', 'signing'];
    const open = await api.object('clm_contract').find({
      where: organizationId
        ? { organization_id: organizationId, legal_owner: { $in: holders }, status: { $in: OPEN_STATUSES } }
        : { legal_owner: { $in: holders }, status: { $in: OPEN_STATUSES } },
      fields: ['id', 'legal_owner'],
      top: 10000,
    });
    const load = new Map<string, number>(holders.map((user) => [user, 0]));
    for (const row of open) {
      const owner = typeof row.legal_owner === 'string' ? row.legal_owner : '';
      if (load.has(owner)) load.set(owner, (load.get(owner) ?? 0) + 1);
    }
    // Fewest open contracts wins; a tie breaks on the user id so the choice is
    // deterministic and re-runnable.
    const [chosen] = [...load.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))[0];
    input.legal_owner = chosen;
  },
};

const contractStateMachine: Hook = {
  name: 'contract_state_machine',
  object: 'clm_contract',
  events: ['beforeUpdate'],
  priority: 200,
  description: 'Enforce the contract status transition table and its guards; stamp the stage timestamp on each entry; take the automatic onward hop out of submitted (F2).',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const requested = input.status;
    if (typeof requested !== 'string') return;
    let from = typeof previous.status === 'string' ? previous.status : 'draft';
    if (requested === from) return;

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

    const api = ctx.api as HookApi | undefined;
    if (!api) throw refuse('The data API is not available to the contract state machine.', 'INTERNAL_ERROR', 500);
    const id = typeof previous.id === 'string' ? previous.id : '';
    const get = (key: string): unknown => (input[key] !== undefined ? input[key] : previous[key]);
    const isSet = (value: unknown): boolean =>
      !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    const now = new Date().toISOString();

    let cachedType: Record<string, unknown> | null = null;
    async function loadType(): Promise<Record<string, unknown>> {
      if (cachedType) return cachedType;
      const typeId = get('contract_type');
      const type = isSet(typeId)
        ? await api!.object('clm_contract_type').findOne({
            where: { id: typeId },
            fields: ['id', 'intake_fields', 'requires_legal_review', 'template_file'],
          })
        : null;
      if (!type) throw refuse('The contract has no contract type; one is required to move it forward.', 'INVALID_STATE', 422);
      cachedType = type;
      return type;
    }

    // One write may carry MORE than one transition: `draft → submitted`
    // continues to `in_review` or `in_approval` in the same write (§06 F2).
    // Each hop goes through the SAME table check and the SAME guard blocks a
    // hand-made transition meets — the onward hop is a second iteration, not
    // a second copy of the guards. Two hops is the ceiling the table allows.
    let to = requested;
    for (let hop = 0; ; hop += 1) {
      if (hop > 2) throw refuse(`The contract status hopped more than twice in one write (${from} → ${to}); refusing to loop.`, 'INTERNAL_ERROR', 500);
      let onward: string | null = null;

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
        // F2's onward hop. `contract_route` (priority 150) has already stamped
        // the `route_*` union and, when the type requires legal review, assigned
        // `legal_owner` to the least-loaded legal counsel. No legal review →
        // straight to approval; a legal owner in hand → into review; a type
        // that wants legal review but no counsel could be assigned → the
        // contract stays `submitted` for the legal queue to accept by hand.
        if (type.requires_legal_review === false) onward = 'in_approval';
        else if (isSet(get('legal_owner'))) onward = 'in_review';
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

      // F6, first half (DESIGN.md §06 deviation_gate): no `open` deviation may
      // enter approval. Guarded on EVERY edge into `in_approval` — from
      // `in_review` (card 02) and from `submitted` (a type that skips legal
      // review), since a deviation can be recorded on a draft too.
      if (to === 'in_approval') {
        const openDeviations = await api.object('clm_deviation').count({ where: { contract: id, status: 'open' } });
        if (openDeviations > 0) {
          throw refuse(`${openDeviations} deviation(s) are still open; decide each one before the contract enters approval.`, 'INVALID_STATE', 422);
        }
      }

      if (from === 'in_review' && to === 'in_approval') {
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

      // DESIGN.md §03: `active → terminated` requires `closed_at` AND a
      // termination reason. `closed_at` is stamped here rather than demanded
      // (the moment IS this write); the reason cannot be — only the person
      // ending the contract knows it. Decision #6 ruled A on 2026-09-09 and
      // `clm_contract.termination_reason` is that field.
      //
      // The field also carries `requiredWhen`, which the engine enforces on
      // its own. This guard is not a duplicate of it: it refuses with the
      // machine's `INVALID_STATE` envelope and names the transition, which is
      // what the rest of §03's guards do, and AGENTS.md puts a state guard in
      // the hook rather than only in a declaration a form reads.
      if (to === 'terminated') {
        if (!isSet(get('termination_reason'))) {
          throw refuse(
            'A termination reason is required to terminate a contract; it is the first thing legal and audit ask for. Terminate from the contract page, which asks for it.',
            'INVALID_STATE',
            422,
          );
        }
        input.closed_at = now;
      }

      if (!onward) break;
      from = to;
      to = onward;
      input.status = onward;
    }
  },
};

const contractActivate: Hook = {
  name: 'contract_activate',
  object: 'clm_contract',
  // `afterUpdate` ONLY, which is what DESIGN.md §06 F9 says — and the reason
  // is MEASURED, not deference. An earlier draft of this hook also bound
  // `afterInsert`, to cover the F16 backfill (a contract born `active`). One
  // `pnpm demo` showed what that costs: the demo fixture writes its 60 active
  // contracts as INSERTS, every one of them entered `active` on insert, and
  // the hook opened a renewal obligation on each — 60 rows nobody asked for,
  // in a fixture whose counts DESIGN.md §10 pins and whose plan asserts them
  // (`assertCount('clm_obligation', …, 200)` counts the PLAN, not the table,
  // so nothing caught it). Eleven of those 60 were already past their due
  // date, so the next arrears sweep would have moved them to `overdue` and
  // shifted `overdue_obligation_count` on eleven contracts.
  //
  // A hook cannot tell a seed insert from a backfill insert: both are
  // `isSystem`. So the insert leg is not narrowed, it is removed, and F16
  // stamps its own `activated_at` instead. A backfilled contract still gets
  // its renewal reminder — from F12, when its notice window arrives, which is
  // the path §06 gives every active contract.
  events: ['afterUpdate'],
  priority: 300,
  // The renewal obligation is a child row on a `private` object, written for
  // a contract the acting user may not own (the backfill path is a records
  // clerk entering somebody else's executed contract), and `activated_at` is
  // `readonly` and field-secured for every position (§04). `runAs` elevates
  // `ctx.api` only; `ctx.session` still describes the caller, which is what
  // the `isSystem` reads elsewhere in this file rely on.
  runAs: 'system',
  description: 'F9: on a contract entering active, stamp activated_at if unstamped and open the renewal-reminder obligation the type asks for.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const isSet = (value: unknown): boolean =>
      !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    const get = (key: string): unknown => (input[key] !== undefined ? input[key] : previous[key]);

    // ENTERING active, not "is active": the status moved here on THIS write.
    // §03 gives `active` exactly one inbound edge (`signing → active`), so
    // this fires once per contract, and a re-entrant write that touches other
    // columns leaves `previous.status` already `active` and returns.
    const status = get('status');
    if (status !== 'active') return;
    if (previous.status === 'active') return;

    const api = ctx.api as HookApi | undefined;
    if (!api) throw refuse('The data API is not available to the contract activation hook.', 'INTERNAL_ERROR', 500);

    // The id rides on the update pre-image.
    const id = typeof previous.id === 'string' && previous.id ? previous.id : typeof input.id === 'string' ? input.id : '';
    if (!id) return;

    if (!isSet(get('activated_at'))) {
      // Belt and braces on the one column §06 F9 names first. The
      // `signing → active` guard in `contract_state_machine` stamps it on the
      // only edge §03 draws into `active`, so on every path that exists today
      // this write does not happen — and if a future edge is added without
      // the stamp, the contract still gets one rather than silently carrying
      // an empty activation date.
      await api.object('clm_contract').update({ id, activated_at: new Date().toISOString() }, { where: { id } });
    }

    // ── The renewal reminder ────────────────────────────────────────────
    //
    // DESIGN.md §06 F9: "按类型默认建续签提醒义务". The date the reminder is
    // FOR is `end_date` minus the contract's own notice period — the day by
    // which a non-renewal notice has to be given — so a contract with no
    // `end_date` has nothing to remind anyone about and gets no obligation
    // rather than one with an invented date (`due_date` is required).
    //
    // ⛔ NOTHING here expands a payment arrangement, and there is deliberately
    // no hook, flag or placeholder for one. Decision #14 was ruled A on
    // 2026-09-09: F9 does not read any intake-captured payment schedule,
    // because nothing at intake can fill one and §04 gives the requester read
    // only on `clm_payment_plan`. Payment plans are created by finance after
    // activation, on the contract's own tab (§04 grants finance RCU).
    const endDate = get('end_date');
    if (!isSet(endDate)) return;
    const endMs = typeof endDate === 'string' ? Date.parse(endDate) : endDate instanceof Date ? endDate.getTime() : NaN;
    if (!Number.isFinite(endMs)) return;

    // Idempotent on the CHILD, not on a flag: a second entry into `active` is
    // not reachable through §03 (active's only exits are terminal), but a
    // re-run of this hook is — the platform dispatches `after*` inside the
    // unit of work, so a retried write re-enters it. One renewal obligation
    // per contract, checked live.
    const existing = await api.object('clm_obligation').count({ where: { contract: id, kind: 'renewal' } });
    if (existing > 0) return;

    const rawNotice = get('renewal_notice_days');
    const noticeDays = typeof rawNotice === 'number' && Number.isFinite(rawNotice) && rawNotice >= 0
      ? Math.floor(rawNotice)
      : 30;
    const dueMs = endMs - noticeDays * 86_400_000;
    const dueDate = new Date(dueMs).toISOString().slice(0, 10);
    const title = get('title');
    const owner = get('owner_id');

    await api.object('clm_obligation').insert({
      contract: id,
      // English is the source language (AGENTS.md 命名): a stored row is
      // written once and cannot be re-rendered per reader, the same reason
      // `clm_payment_plan.display_name` is ASCII.
      title: `Renewal decision: ${typeof title === 'string' && title ? title : 'contract'}`.slice(0, 200),
      kind: 'renewal',
      due_date: dueDate,
      owner: typeof owner === 'string' && owner ? owner : null,
      status: 'pending',
      notes: `Opened by F9 on activation. Decide renewal or notice by ${dueDate} — ${noticeDays} days before the contract ends.`,
    });
  },
};

const contractArchive: Hook = {
  name: 'contract_archive',
  object: 'clm_contract',
  events: ['beforeUpdate'],
  priority: 250,
  description: 'F14: stamp archived_at when the records desk gives a closed contract its archive number, refuse an archive number on a live one, and freeze an archived contract against everything but its summary.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    const isSet = (value: unknown): boolean =>
      !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
    const get = (key: string): unknown => (input[key] !== undefined ? input[key] : previous[key]);

    // DESIGN.md §03: the three terminal states. Archiving is what happens
    // AFTER the lifecycle ends, so it is gated on the state the record is
    // LANDING in — `terminated` and its archive number can arrive on one write.
    const TERMINAL = ['expired', 'terminated', 'cancelled'];
    const status = get('status');
    const terminal = typeof status === 'string' && TERMINAL.includes(status);

    const alreadyArchived = isSet(previous.archived_at);
    const gainsArchiveNo = input.archive_no !== undefined && isSet(input.archive_no) && !isSet(previous.archive_no);

    // ── The freeze ──────────────────────────────────────────────────────
    //
    // "此后除 notes 外只读" (§06 F14). `clm_contract` carries no `notes` field —
    // §03's field list gives the contract `summary` and puts `notes` on the
    // CHILD objects — so `summary`, the contract's one free-text column, is
    // the field that stays open. Freezing it too would leave an archived
    // record with a factual error and no in-product way to annotate it, since
    // `archived_at` is `readonly` and the terminal states have no outgoing
    // edge. Reported as a §06/§03 wording mismatch rather than resolved by
    // adding a field: §03 is a governed surface.
    //
    // System writes are exempt: the engine recomputes the five `summary`
    // roll-ups under an elevated context on every child write, and a frozen
    // parent would make an archived contract's children unwritable.
    if (alreadyArchived && ctx.session?.isSystem !== true) {
      // The platform's own audit columns ride along on every update and are
      // NOT the caller's payload, so they can never be the reason a write is
      // refused. They are named here exactly as the engine spells them —
      // `updated_at` / `updated_by`, which is what `clm_contract` actually
      // carries. MEASURED with the earlier `modified_at` / `modified_by`
      // spelling on a booted app: `PATCH { summary: '…' }` on an archived
      // contract was refused 422 "Fields refused: updated_at", so the ONE
      // field this rule exists to keep open was the one it closed, and an
      // archived contract could not be annotated at all — the outcome the
      // comment above says the exemption exists to avoid. A field-name typo in
      // an allow-list is silent until something runs.
      const OPEN_AFTER_ARCHIVE = [
        'summary',
        'id',
        'organization_id',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
      ];
      const attempted = Object.keys(input).filter(
        (key) => !OPEN_AFTER_ARCHIVE.includes(key) && input[key] !== previous[key],
      );
      if (attempted.length > 0) {
        throw refuse(
          `This contract was archived on ${String(previous.archived_at)}; only its summary can still be edited. Fields refused: ${attempted.join(', ')}.`,
          'INVALID_STATE',
          422,
        );
      }
      return;
    }

    if (gainsArchiveNo) {
      if (!terminal) {
        throw refuse(
          `An archive number is given when the contract is closed; this one is ${String(status)}. Let it expire, terminate it or cancel it first.`,
          'INVALID_STATE',
          422,
        );
      }
      // The stamp IS the archive event — DESIGN.md §06 F14: the records desk
      // fills the number, the platform records when.
      input.archived_at = new Date().toISOString();
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

const deviationGate: Hook = {
  name: 'deviation_gate',
  object: 'clm_deviation',
  events: ['afterUpdate'],
  priority: 250,
  // The parent contract's `route_legal_head` is `readonly` and locked by
  // field-level security for every position: it has exactly two writers, the
  // routing hook and this one. A system context is what lets a write from
  // OUTSIDE the contract's own hook chain land on a read-only column (the
  // strip is bypassed under `isSystem`, the same way the engine's roll-up
  // recompute lands). After the deviation row is committed, never before: a
  // refused deviation write must not leave a stamped contract behind.
  runAs: 'system',
  description: 'F6: an accepted deviation from a clause that requires the head of legal stamps route_legal_head on the parent contract.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous ?? {};
    if (input.status !== 'accepted' || previous.status === 'accepted') return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const clauseId = input.clause !== undefined ? input.clause : previous.clause;
    const contractId = input.contract !== undefined ? input.contract : previous.contract;
    if (typeof clauseId !== 'string' || !clauseId || typeof contractId !== 'string' || !contractId) return;
    const clause = await api.object('clm_clause').findOne({ where: { id: clauseId }, fields: ['id', 'requires_legal_head'] });
    if (clause?.requires_legal_head !== true) return;
    const contract = await api.object('clm_contract').findOne({ where: { id: contractId }, fields: ['id', 'route_legal_head'] });
    if (!contract || contract.route_legal_head === true) return;
    await api.object('clm_contract').update({ id: contractId, route_legal_head: true }, { where: { id: contractId } });
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

const obligationStateMachine: Hook = {
  name: 'obligation_state_machine',
  object: 'clm_obligation',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Obligation transitions: pending → in_progress / done / waived / overdue, in_progress → done / waived / overdue, overdue → done / waived; overdue is reserved for the daily job; stamp completed_at on done.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const to = input.status;
    if (typeof to !== 'string') return;

    // `overdue` is a MEASUREMENT, not an opinion: the daily job (card 09)
    // reads due_date and writes it. Guarding only the update path would leave
    // the insert path open — a row can be created straight into arrears — so
    // both events run through here.
    if (to === 'overdue' && ctx.session?.isSystem !== true) {
      throw refuse(
        'Only the daily obligation job marks an obligation overdue; it is measured from due_date, not typed in. Leave it pending or in_progress, or record the outcome as done or waived.',
        'INVALID_STATE',
        422,
      );
    }
    if (event === 'beforeInsert') return;

    const from = typeof previous.status === 'string' ? previous.status : 'pending';
    if (to === from) return;

    // DESIGN.md §03 状态机 — done and waived are terminal.
    //
    // `in_progress → overdue` is decision #10's question 1, ruled 1A on
    // 2026-09-09: the table drew `pending → overdue` and not this one, so an
    // obligation nobody had touched could be marked late while one somebody
    // had STARTED could not. The ruling's own consequence is written into the
    // daily job (`obligation-due.flow.ts`): the arrears sweep selects
    // `pending` AND `in_progress`, because skipping the started rows is the
    // silent under-reporting that card's analysis named as the thing to avoid.
    const TRANSITIONS: Record<string, string[]> = {
      pending:     ['in_progress', 'done', 'waived', 'overdue'],
      in_progress: ['done', 'waived', 'overdue'],
      overdue:     ['done', 'waived'],
      done:        [],
      waived:      [],
    };
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw refuse(
        allowed.length === 0
          ? `A ${from} obligation is closed; its status cannot change to ${to}. Record a new obligation instead.`
          : `Obligation status cannot go from ${from} to ${to}. Allowed from ${from}: ${allowed.join(', ')}.`,
        'INVALID_STATE',
        422,
      );
    }

    if (to === 'done') {
      const completedAt = input.completed_at !== undefined ? input.completed_at : previous.completed_at;
      if (completedAt === undefined || completedAt === null || completedAt === '') {
        input.completed_at = new Date().toISOString();
      }
    }
  },
};

const paymentPlanStateMachine: Hook = {
  name: 'payment_plan_state_machine',
  object: 'clm_payment_plan',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Payment instalment transitions: planned → due, due → partial / paid / overdue, overdue → partial / paid, partial → paid / overdue; overdue is reserved for the daily job; stamp actual_date on partial and paid.',
  handler: async (ctx: HookContext) => {
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const to = input.status;
    if (typeof to !== 'string') return;

    if (to === 'overdue' && ctx.session?.isSystem !== true) {
      throw refuse(
        'Only the daily payment job marks an instalment overdue; it is measured from planned_date, not typed in. Record what arrived as partial or paid instead.',
        'INVALID_STATE',
        422,
      );
    }
    if (event === 'beforeInsert') return;

    const from = typeof previous.status === 'string' ? previous.status : 'planned';
    if (to === from) return;

    // DESIGN.md §03 状态机. `partial` had NO outgoing edge — a dead end that
    // §03 marked terminal only by omission, which is decision #10's question 2,
    // ruled 2A on 2026-09-09: `partial → paid` (they paid half, then the rest)
    // and `partial → overdue` (they paid half and the date passed).
    //
    // The second of those is what makes the edge real rather than declared:
    // `overdue` has exactly one writer, the daily job, so if
    // `payment-overdue.flow.ts` did not sweep `partial` rows nothing in the
    // product could ever take that edge. It does (`due` and `partial`, both
    // past `planned_date`).
    //
    // `paid` stays terminal: the remainder of a settled instalment is a
    // further instalment row, which the unique `(contract, seq)` index shapes.
    const TRANSITIONS: Record<string, string[]> = {
      planned: ['due'],
      due:     ['partial', 'paid', 'overdue'],
      overdue: ['partial', 'paid'],
      partial: ['paid', 'overdue'],
      paid:    [],
    };
    const allowed = TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw refuse(
        allowed.length === 0
          ? `A ${from} instalment is settled; its status cannot change to ${to}. Record a further instalment instead.`
          : `Payment instalment status cannot go from ${from} to ${to}. Allowed from ${from}: ${allowed.join(', ')}.`,
        'INVALID_STATE',
        422,
      );
    }

    if (to === 'partial' || to === 'paid') {
      const actualDate = input.actual_date !== undefined ? input.actual_date : previous.actual_date;
      if (actualDate === undefined || actualDate === null || actualDate === '') {
        input.actual_date = new Date().toISOString().slice(0, 10);
      }
    }
  },
};

export default [
  contractTypeStamp,
  contractRoute,
  contractStateMachine,
  contractArchive,
  contractActivate,
  deviationStateMachine,
  deviationGate,
  signatureStateMachine,
  obligationStateMachine,
  paymentPlanStateMachine,
];
