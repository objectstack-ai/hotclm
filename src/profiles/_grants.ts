import type { FieldPermission } from '@objectstack/spec/security';
import { Contract } from '../objects/contract.object.js';

/**
 * Helpers the five permission sets share, so a field-level or row-level rule
 * is derived from the object it governs instead of retyped beside it.
 *
 * Field-level security (FLS) on this platform is an allow-list only for the
 * fields a set enumerates: an unlisted field is fully readable and editable
 * whenever the object grant allows the verb. "Lock everything but X" is
 * therefore spelled as one `editable: false` entry per other field
 * ({@link editableOnly}), and every helper refuses a field name the object does
 * not declare — an FLS key on a phantom field is silently inert
 * (`security-fls-unqualified-key` catches the unqualified spelling, nothing
 * catches a typo in the field half).
 *
 * Enforcement, measured on `@objectstack/plugin-security` 17.3.0: a write that
 * touches a non-editable field is REFUSED with a 403 `PermissionDeniedError`
 * ("Field write denied: not permitted to edit [...]"), never silently stripped;
 * a non-readable field is removed from every read. Fields a hook stamps inside
 * the write (`submitted_at`, `approved_at`, …) are not the caller's payload and
 * pass — the check runs on what the caller sent, before the hooks run.
 */

export type FieldSecurity = Record<string, FieldPermission>;

export interface ObjectLike {
  name: string;
  fields: Record<string, unknown>;
}

function assertFields(object: ObjectLike, fields: readonly string[], helper: string): void {
  const missing = fields.filter((field) => !(field in object.fields));
  if (missing.length > 0) {
    throw new Error(
      `${helper}: ${object.name} declares no field ${missing.join(', ')} — a field-level rule on a field that does not exist is silently inert.`,
    );
  }
}

/** Readable, not editable. */
export function readOnly(object: ObjectLike, fields: readonly string[]): FieldSecurity {
  assertFields(object, fields, 'readOnly');
  return Object.fromEntries(fields.map((field) => [`${object.name}.${field}`, { readable: true, editable: false }]));
}

/** Neither readable nor editable — the value is absent from every read. */
export function hidden(object: ObjectLike, fields: readonly string[]): FieldSecurity {
  assertFields(object, fields, 'hidden');
  return Object.fromEntries(fields.map((field) => [`${object.name}.${field}`, { readable: false, editable: false }]));
}

/**
 * Every authored field of the object except `editable` becomes read-only.
 * Spread a {@link hidden} entry AFTER this one when a locked field must also
 * be withheld from reads.
 */
export function editableOnly(object: ObjectLike, editable: readonly string[]): FieldSecurity {
  assertFields(object, editable, 'editableOnly');
  const locked = Object.keys(object.fields).filter((field) => !editable.includes(field));
  return readOnly(object, locked);
}

/**
 * Readable AND editable, declared explicitly.
 *
 * Field permissions merge MOST PERMISSIVELY across the sets a person holds,
 * but only the sets that DECLARE a field vote: a set that says nothing about
 * `clm_party.bank_account` does not out-vote a co-held set that hides it
 * (`getFieldPermissions`, plugin-security 17.3.0 — measured on card 04: a
 * legal user who also held `clm_requester` lost the bank account and was
 * refused `internal_note`). So a set that must see or edit what another
 * co-holdable set locks says so here, in so many words — the same discipline
 * HotCRM adopted for its manager sets (#488).
 */
export function open(object: ObjectLike, fields: readonly string[]): FieldSecurity {
  assertFields(object, fields, 'open');
  return Object.fromEntries(fields.map((field) => [`${object.name}.${field}`, { readable: true, editable: true }]));
}

/** Every authored field of the object except `except` is {@link open}. */
export function openAllExcept(object: ObjectLike, except: readonly string[]): FieldSecurity {
  assertFields(object, except, 'openAllExcept');
  return open(object, Object.keys(object.fields).filter((field) => !except.includes(field)));
}

/** The names of the object's fields whose `group` is one of `groups`. */
export function fieldsInGroups(object: ObjectLike, groups: readonly string[]): string[] {
  const names = Object.entries(object.fields)
    .filter(([, def]) => groups.includes((def as { group?: string }).group ?? ''))
    .map(([name]) => name);
  if (names.length === 0) {
    throw new Error(`fieldsInGroups: ${object.name} has no field in group(s) ${groups.join(', ')}.`);
  }
  return names;
}

/**
 * A row-level-security predicate `field in [...]` in the canonical CEL the RLS
 * compiler lowers (`in` against a list literal). Values are JSON-quoted so a
 * status value can never break out of the literal.
 */
export function inList(field: string, values: readonly string[]): string {
  return `${field} in [${values.map((value) => JSON.stringify(value)).join(', ')}]`;
}

/**
 * The one member of the `lifecycle` group a PERSON writes.
 *
 * `group` does double duty on `clm_contract`: it is the detail page's section
 * layout AND, through `fieldsInGroups` below, the source of the "only the
 * platform writes this" lock. Every other `lifecycle` field is a timestamp a
 * hook or a flow stamps, so deriving the lock from the group is right for all
 * of them — and wrong for exactly this one. `termination_reason` (decision #6,
 * ruled A on 2026-09-09) belongs on the lifecycle section because that is
 * where a reader looks for it, but it is answered by the person ending the
 * contract, in the Terminate dialog.
 *
 * MEASURED before this exclusion existed, on a booted app as an admin holding
 * `clm_admin` and every position: `PATCH /api/v1/data/clm_contract/<id>` with
 * `{status: 'terminated', termination_reason: '…'}` was refused 403
 * "[Security] Field write denied: not permitted to edit [termination_reason]".
 * The state machine requires the reason and FLS forbade writing it, so
 * `active → terminated` — a transition DESIGN.md §03 declares — could not be
 * taken by anybody through any surface. A field nobody may write is not a
 * required field, it is a closed door.
 *
 * It stays read-only for `clm_requester` and `clm_finance`, which say so in
 * their own grants, and for `clm_records` through its `editableOnly` list.
 * `clm_legal` and `clm_admin` — the two sets holding the `terminate_contract`
 * capability the action is gated on (§04) — get it through `openAllExcept`.
 */
export const CONTRACT_TERMINATION_REASON = 'termination_reason';

/**
 * DESIGN.md §04 field-level security, the two rows that apply to EVERY
 * position: `route_*` and `approval_status` (written only by the routing hook
 * and the approval flow), the stage timestamps (written only by the state
 * machine), and the four `ai_*` fields (written only by the "adopt
 * suggestion" action). Read from the object's field groups so a new stamp
 * lands under the lock without a second edit here.
 */
export const CONTRACT_STAMPED_FIELDS = fieldsInGroups(Contract, ['routing', 'lifecycle', 'ai'])
  .filter((field) => field !== CONTRACT_TERMINATION_REASON);

/**
 * The legal fields of a contract — what DESIGN.md §04 locks for finance
 * ("FLS 锁法律字段") and, together with `status`, what §13 Q1 rules finance may
 * not touch on an approved contract: the `legal` field group plus the two
 * commercial-looking fields §04 assigns to legal's assessment (`risk_level`,
 * `liability_cap`).
 */
export const CONTRACT_LEGAL_FIELDS = [...fieldsInGroups(Contract, ['legal']), 'risk_level', 'liability_cap'];
