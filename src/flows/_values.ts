import { expression } from '@objectstack/spec';

/**
 * The two ways a flow node's VALUE slot reads a run variable, since protocol 18
 * (ADR-0032: one expression dialect per slot).
 *
 * Up to 17.x every value slot — a CRUD node's `fields` and `filter`, a script's
 * `inputs`, a notify node's `recipients` and `sourceId`, a loop's `collection`,
 * a screen's defaults — read the single-brace `{path}` template, and a token
 * that resolved to nothing wrote nothing. 18 refuses that dialect in a value
 * slot: the slot takes a CEL value envelope, and CEL fails the run on a
 * variable or key that is not there instead of writing nothing. These two
 * helpers are the two answers to "what if it is not there", chosen per slot so
 * that each slot behaves as it did on 17.x.
 *
 * Text slots (a notify node's `title` / `message`, a screen's `description`)
 * are not values: they take `{{ path }}` holes, written in place. And a date
 * macro in a CRUD filter — `'{today}'`, `'{tomorrow}'`, `'{30_days_ago}'` — is
 * a query placeholder the ObjectQL read path resolves, not a run variable: it
 * stays a plain string, and wrapping it in either helper refuses the node.
 */

/**
 * A guarded read: `null` where any step of `path` is unbound or null — the
 * nearest CEL has to the template's "wrote nothing". The shape is the one
 * `os validate` prescribes, `has()` a step at a time from `vars`, which holds
 * every variable the run has bound (loop iterators and script outputs
 * included).
 *
 * Use it for every slot where an absent value is legitimate: an optional
 * lookup (`legal_owner` is only assigned when the type needs legal review), a
 * screen field the user left empty, a script input the function tolerates
 * missing.
 */
export function ref(path: string) {
  const steps = path.split('.');
  const guards: string[] = [];
  for (let i = 1; i <= steps.length; i += 1) {
    const at = `vars.${steps.slice(0, i).join('.')}`;
    guards.push(`has(${at})`);
    if (i < steps.length) guards.push(`${at} != null`);
  }
  return expression(`${guards.join(' && ')} ? vars.${path} : null`);
}

/**
 * An unguarded read, for a CRUD node's `filter` operand. An operand that is
 * absent or `null` refuses the node — an absent condition would widen the
 * query, not narrow it — which is what a `{path}` token that resolved to
 * nothing did on 17.x, so a guard would buy nothing here.
 */
export function must(path: string) {
  return expression(path);
}
