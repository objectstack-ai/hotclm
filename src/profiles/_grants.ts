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
 * DESIGN.md §04 field-level security, the two rows that apply to EVERY
 * position: `route_*` and `approval_status` (written only by the routing hook
 * and the approval flow), the stage timestamps (written only by the state
 * machine), and the four `ai_*` fields (written only by the "adopt
 * suggestion" action). Read from the object's field groups so a new stamp
 * lands under the lock without a second edit here.
 */
export const CONTRACT_STAMPED_FIELDS = fieldsInGroups(Contract, ['routing', 'lifecycle', 'ai']);

/**
 * The legal fields of a contract — what DESIGN.md §04 locks for finance
 * ("FLS 锁法律字段") and, together with `status`, what §13 Q1 rules finance may
 * not touch on an approved contract: the `legal` field group plus the two
 * commercial-looking fields §04 assigns to legal's assessment (`risk_level`,
 * `liability_cap`).
 */
export const CONTRACT_LEGAL_FIELDS = [...fieldsInGroups(Contract, ['legal']), 'risk_level', 'liability_cap'];
