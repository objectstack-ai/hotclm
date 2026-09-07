import { Contract } from '../objects/contract.object.js';
import { Obligation } from '../objects/obligation.object.js';
import { Review } from '../objects/review.object.js';

/**
 * The status vocabularies the security surface reasons about, READ FROM THE
 * OBJECTS rather than retyped. Every sharing-rule condition and every
 * row-level write window in `src/profiles/` is a subset of one of these lists;
 * a subset that names a value the object no longer declares throws at load,
 * which `pnpm validate` reports — a rule that quietly matched nothing would
 * otherwise read as "the grant holds".
 */

interface SelectLike {
  options?: ReadonlyArray<{ value: string }>;
}

interface ObjectLike {
  name: string;
  fields: Record<string, unknown>;
}

function selectValues(object: ObjectLike, field: string): string[] {
  const def = object.fields[field] as SelectLike | undefined;
  const values = def?.options?.map((option) => option.value) ?? [];
  if (values.length === 0) {
    throw new Error(`${object.name}.${field} is not a select field with options; the lifecycle constants derive from it.`);
  }
  return values;
}

function subset(all: readonly string[], wanted: readonly string[], what: string): string[] {
  const unknown = wanted.filter((value) => !all.includes(value));
  if (unknown.length > 0) {
    throw new Error(`${what} names value(s) the object does not declare: ${unknown.join(', ')}.`);
  }
  return [...wanted];
}

/** Every `clm_contract.status` value — what "all contracts" spells as a criteria (see contract.sharing.ts). */
export const CONTRACT_STATUSES = selectValues(Contract, 'status');

/** DESIGN.md §04: a requester edits their own contract only while it is `draft` or `submitted`. */
export const REQUESTER_EDITABLE_STATUSES = subset(CONTRACT_STATUSES, ['draft', 'submitted'], 'REQUESTER_EDITABLE_STATUSES');

/** DESIGN.md §04 `contract_finance_post_approval`: `approved` and everything after it. */
export const POST_APPROVAL_STATUSES = subset(
  CONTRACT_STATUSES,
  ['approved', 'signing', 'active', 'expired', 'terminated'],
  'POST_APPROVAL_STATUSES',
);

/** DESIGN.md §04 `contract_records_execution`: `signing` and everything after it. */
export const EXECUTION_STATUSES = subset(
  CONTRACT_STATUSES,
  ['signing', 'active', 'expired', 'terminated'],
  'EXECUTION_STATUSES',
);

/** Every `clm_review.stage` value. */
export const REVIEW_STAGES = selectValues(Review, 'stage');

/** Every `clm_obligation.status` value. */
export const OBLIGATION_STATUSES = selectValues(Obligation, 'status');
