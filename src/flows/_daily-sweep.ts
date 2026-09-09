import type { Flow, FlowNode, FlowEdge } from '@objectstack/spec/automation';

/**
 * The shape the six daily jobs of DESIGN.md §06 share — F3, F4, F10, F11, F12
 * and F13 — and the two pure functions all of them call.
 *
 * ## Why there is a shared shape at all
 *
 * Every one of those six is the same sentence with different nouns: *once a
 * day, find the rows whose date has passed some threshold, act on each one,
 * and tell somebody*. Writing that skeleton out six times would be six chances
 * to forget the two things that are easy to get wrong and silent when they
 * are:
 *
 *  - **`runAs: 'system'`.** A schedule run has no trigger user, so under the
 *    default `runAs: 'user'` every data node is REFUSED at run time
 *    (ADR-0049 / #3760). `os lint` calls it `flow-runas-unscoped` and grades
 *    it an ERROR. It is set once, here, for every job built by this module.
 *  - **Per-iteration containment.** `loop-node.ts` iterates with a bare
 *    `await` and has no `try`/`catch`, so the FIRST failing row ends the whole
 *    run: every later row is never processed, and the work already done is
 *    reported as `acted: 0`. A sweep that stops at the first unreachable
 *    recipient is not a sweep. {@link sweepFlow} therefore wraps every body in
 *    a `try_catch` whose `catch` region is the minimal handler (one bare
 *    `assignment` node — a `catch` with no nodes is refused by the parse).
 *
 * ## Dates live in the QUERY, never in a formula
 *
 * DESIGN.md §12 gap #7: the platform CEL has no `daysBetween`, so "older than
 * 30 days" cannot be a formula field. It does not need to be. A flow node's
 * `filter` is resolved by `resolveFilterTokens()` on the ObjectQL read AND
 * write paths, which means the `{date-macro}` vocabulary — `{today}`,
 * `{30_days_ago}`, `{7_days_from_now}` — is available in every filter below
 * and is expanded to a real ISO comparand before the driver sees it.
 *
 * Measured consequence worth stating, because it decides how the windows are
 * written: the flow's own `interpolate()` runs FIRST and leaves an unresolved
 * date macro alone (`interpolateFilter` returns the literal when the token is
 * a known filter token), so the two resolvers compose rather than fight. What
 * they cannot do is compare two COLUMNS — "end_date minus this row's own
 * `renewal_notice_days`" is per-record arithmetic, and that is what the
 * `script` nodes in `renewal-notice.flow.ts` are for. Query filters and
 * `script`: the two places the card allows, and no formula field.
 *
 * ## The cap
 *
 * A sweep reads at most {@link SWEEP_LIMIT} rows per stage — the same number
 * the platform's own declarative sweep uses
 * (`TIME_RELATIVE_DEFAULT_MAX_RECORDS`). `maxIterations` is pinned to the same
 * value rather than left at the engine ceiling, because a `loop` whose
 * collection exceeds `maxIterations` FAILS the node instead of truncating, and
 * a run that fails is louder than one that quietly did nine tenths of the job.
 * The arrears stages are self-healing under the cap: their filters select on a
 * date that does not move, so a row the cap left out is selected again on the
 * next run. The exact-day reminder stages are not — a day with more than
 * {@link SWEEP_LIMIT} obligations falling due would under-remind — which is
 * why the number is stated here rather than buried.
 */

/** Rows read per sweep stage. Mirrors the platform's `TIME_RELATIVE_DEFAULT_MAX_RECORDS`. */
export const SWEEP_LIMIT = 1000;

/** 06:00 UTC — before the working day in every seeded region, after the previous day has closed. */
export const DAILY_CRON = '0 6 * * *';

/** One pass over one object: select rows, then run the body once per row. */
export interface SweepStage {
  /** Node-id prefix. Unique within the flow — the id space is one across regions. */
  readonly id: string;
  readonly label: string;
  readonly objectName: string;
  /** ObjectQL where-map. `{date-macro}` values are resolved server-side. */
  readonly filter: Record<string, unknown>;
  /** Projection. Everything the body interpolates must be listed. */
  readonly fields: readonly string[];
  /** Variable the current row is bound to inside the body. */
  readonly item: string;
  /** The per-row region. Wrapped in a `try_catch` by the builder. */
  readonly body: { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] };
}

/**
 * Assemble a daily sweep: `start → [prelude] → (select → loop)* → end`, with
 * every stage's body contained per iteration.
 *
 * The graph is a straight line on purpose. A stage's loop continues to the
 * NEXT stage's select whether or not it matched anything, so the ordering of
 * `stages` is a real ordering — `payment-overdue.flow.ts` depends on it
 * (`planned → due` must run before `due → overdue`, because §03 has no
 * `planned → overdue` edge and a row has to take both hops in one run).
 */
export function sweepFlow(spec: {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  readonly cron?: string;
  /** Nodes that run once, before the first stage — position lookups, mostly. */
  readonly prelude?: readonly FlowNode[];
  readonly stages: readonly SweepStage[];
}): Flow {
  const nodes: FlowNode[] = [
    {
      id: 'start',
      type: 'start',
      label: 'Daily',
      config: { schedule: { type: 'cron', expression: spec.cron ?? DAILY_CRON } },
    },
  ];
  const edges: FlowEdge[] = [];
  let previous = 'start';
  let edgeNo = 0;
  const link = (source: string, target: string): void => {
    edgeNo += 1;
    edges.push({ id: `e${edgeNo}`, source, target, type: 'default' });
  };

  for (const node of spec.prelude ?? []) {
    nodes.push(node);
    link(previous, node.id);
    previous = node.id;
  }

  for (const stage of spec.stages) {
    const selectId = `${stage.id}_select`;
    const loopId = `${stage.id}_sweep`;
    nodes.push({
      id: selectId,
      type: 'get_record',
      label: `Select — ${stage.label}`,
      // `limit > 1` is what selects `find` over `findOne`, so the variable
      // holds a LIST. Without it the sweep would act on one row a day.
      config: {
        objectName: stage.objectName,
        filter: stage.filter,
        fields: [...stage.fields],
        limit: SWEEP_LIMIT,
        outputVariable: `${stage.id}Rows`,
      },
    });
    nodes.push({
      id: loopId,
      type: 'loop',
      label: stage.label,
      config: {
        collection: `{${stage.id}Rows}`,
        iteratorVariable: stage.item,
        maxIterations: SWEEP_LIMIT,
        body: {
          nodes: [
            {
              id: `${stage.id}_guard`,
              type: 'try_catch',
              label: `${stage.label} — one row`,
              config: {
                try: { nodes: [...stage.body.nodes], edges: [...stage.body.edges] },
                // The minimal handler. One bare `assignment` node: a `catch`
                // region's `nodes` is `.min(1)`, so `catch: {}` and
                // `catch: { nodes: [] }` are both refused by the parse, and a
                // `try_catch` with no `catch` at all contains nothing — the
                // failure propagates exactly as if the node were unwrapped.
                catch: { nodes: [{ id: `${stage.id}_handled`, type: 'assignment', label: 'Row failed — continue' }] },
              },
            },
          ],
          edges: [],
        },
      },
    });
    link(previous, selectId);
    link(selectId, loopId);
    previous = loopId;
  }

  nodes.push({ id: 'end', type: 'end', label: 'End' });
  link(previous, 'end');

  return {
    name: spec.name,
    label: spec.label,
    description: spec.description,
    type: 'schedule',
    status: 'active',
    // DESIGN.md §06, closing line: "定时流…一律 runAs: 'system' 并注明理由". The
    // reason is not a preference: a schedule run resolves NO trigger user, so
    // under `runAs: 'user'` every `get_record` / `update_record` / `notify`
    // below has no identity to scope to and is refused before it reads a row
    // (ADR-0049, #3760). These jobs also read and write across every owner's
    // contracts by definition — arrears are arrears whoever owns the row — and
    // `overdue` is a column `contract.hook.ts` reserves for a system write.
    runAs: 'system',
    nodes,
    edges,
  };
}

/**
 * Holders of a position, as user ids — the pure half of "tell the finance
 * controller" / "copy the head of legal".
 *
 * `sys_user_position` rows carry the position NAME in `position` and a
 * validity window; a row outside its window is not a holder today. The same
 * filter `contract_route` applies in `contract.hook.ts` when it assigns a
 * legal owner, transcribed rather than shared because a flow function and a
 * lowered hook body cannot import each other.
 *
 * Returns a LIST. A notify node's `recipients` interpolates a single `{var}`
 * token to the value itself, so `recipients: '{holders.userIds}'` fans out
 * correctly for any number of holders — whereas an ARRAY of templates would
 * stringify a nested list into one bogus comma-joined recipient.
 */
export function positionHolders({ input }: { input: Record<string, unknown> }): {
  userIds: string[];
  count: number;
} {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const nowMs = Date.now();
  const at = (value: unknown): number =>
    typeof value === 'string' && value ? Date.parse(value) : value instanceof Date ? value.getTime() : NaN;
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const from = at(r.valid_from);
    const until = at(r.valid_until);
    if (Number.isFinite(from) && from > nowMs) continue;
    if (Number.isFinite(until) && until <= nowMs) continue;
    const user = r.user_id;
    if (typeof user === 'string' && user !== '') ids.add(user);
  }
  const userIds = [...ids];
  return { userIds, count: userIds.length };
}

/**
 * The recipient list for one notification: a named person plus whatever
 * standing audience the job copies, de-duplicated and with the empties gone.
 *
 * Every one of the six jobs needs this and none of them can do it on an edge:
 * `legal_owner` is only assigned when the contract type requires legal review,
 * an obligation's `owner` is explicitly allowed to be empty ("unassigned, not
 * the contract owner"), and a `notify` node whose recipients all resolve to
 * nothing FAILS the step rather than skipping it. `hasRecipient` is what the
 * decision edge reads, so the job stays quiet instead of failing a row over a
 * notification nobody could receive.
 *
 * A lookup value may arrive as a bare id or as an expanded `{ id, name }`
 * record depending on the projection, so both shapes are accepted.
 */
export function notifyRecipients({ input }: { input: Record<string, unknown> }): {
  userIds: string[];
  hasRecipient: boolean;
  count: number;
} {
  const push = (value: unknown, into: Set<string>): void => {
    if (typeof value === 'string' && value.trim() !== '') {
      into.add(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) push(entry, into);
      return;
    }
    if (value && typeof value === 'object' && 'id' in value) {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string' && id !== '') into.add(id);
    }
  };
  const ids = new Set<string>();
  push(input.primary, ids);
  push(input.also, ids);
  push(input.copy, ids);
  const userIds = [...ids];
  return { userIds, hasRecipient: userIds.length > 0, count: userIds.length };
}

/** CEL that reads the recipient decision. `has()` first: an unevaluable edge ABORTS the step. */
export const HAS_RECIPIENT = 'has(vars.recipients) && vars.recipients.hasRecipient == true';
/** Its exact complement — decisions here are partitioned, never defaulted. */
export const NO_RECIPIENT = '!has(vars.recipients) || vars.recipients.hasRecipient != true';

/**
 * The `sys_user_position` read + the pure reduction, as a prelude pair.
 * `positionVariable` ends up holding `{ userIds, count }`.
 */
export function holdersPrelude(position: string, variable: string): FlowNode[] {
  return [
    {
      id: `${variable}_rows`,
      type: 'get_record',
      label: `Holders of ${position}`,
      config: {
        objectName: 'sys_user_position',
        filter: { position },
        fields: ['id', 'user_id', 'organization_id', 'valid_from', 'valid_until'],
        limit: 200,
        outputVariable: `${variable}Rows`,
      },
    },
    {
      id: `${variable}_ids`,
      type: 'script',
      label: `${position} — user ids`,
      config: {
        function: 'clm_position_holders',
        inputs: { rows: `{${variable}Rows}` },
        outputVariable: variable,
      },
    },
  ];
}

/** The notify slots a sweep row fills. `recipients` is supplied by {@link rowBody}. */
export interface RowNotice {
  readonly topic: string;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly title: string;
  readonly message: string;
  readonly sourceObject: string;
  readonly sourceId: string;
  readonly channels?: readonly string[];
}

/**
 * The per-row region every notifying stage uses: do the work, work out who to
 * tell, tell them if there is anyone, join.
 *
 * `lead` runs first, in order — the status write, a parent lookup, a
 * computation. The recipient script always runs, and its result is bound to
 * `recipients` so the two edges below can read `vars.recipients.hasRecipient`.
 *
 * The decision is PARTITIONED, not defaulted: both out-edges carry a
 * condition, and the two conditions are exact complements. A decision edge
 * that cannot be evaluated ABORTS the step rather than being skipped, which is
 * why every read is `has()`-guarded, and a `default` edge beside a conditional
 * one would make "nobody to tell" indistinguishable from "the condition threw".
 *
 * Omitting `notice` gives a body that only does `lead` — the bookkeeping hop
 * in `payment-overdue.flow.ts`, where moving `planned → due` is not news.
 */
export function rowBody(spec: {
  readonly id: string;
  readonly lead?: readonly FlowNode[];
  readonly recipients?: { readonly primary?: string; readonly also?: string; readonly copy?: string };
  readonly notice?: RowNotice;
}): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [...(spec.lead ?? [])];
  const edges: FlowEdge[] = [];
  const doneId = `${spec.id}_done`;
  let previous = nodes.length > 0 ? nodes[0]!.id : '';
  let edgeNo = 0;
  const link = (source: string, target: string, condition?: string, label?: string): void => {
    edgeNo += 1;
    edges.push({
      id: `${spec.id}_b${edgeNo}`,
      source,
      target,
      type: 'default',
      ...(condition ? { condition } : {}),
      ...(label ? { label } : {}),
    });
  };
  for (let i = 1; i < nodes.length; i += 1) {
    link(nodes[i - 1]!.id, nodes[i]!.id);
    previous = nodes[i]!.id;
  }

  if (spec.notice) {
    const whoId = `${spec.id}_who`;
    const decideId = `${spec.id}_decide`;
    const tellId = `${spec.id}_tell`;
    nodes.push({
      id: whoId,
      type: 'script',
      label: 'Who To Tell',
      config: {
        function: 'clm_notify_recipients',
        inputs: {
          ...(spec.recipients?.primary ? { primary: spec.recipients.primary } : {}),
          ...(spec.recipients?.also ? { also: spec.recipients.also } : {}),
          ...(spec.recipients?.copy ? { copy: spec.recipients.copy } : {}),
        },
        outputVariable: 'recipients',
      },
    });
    nodes.push({ id: decideId, type: 'decision', label: 'Someone To Tell?' });
    nodes.push({
      id: tellId,
      type: 'notify',
      label: 'Notify',
      config: {
        // ONE template resolving to the whole list. An array of templates
        // would stringify a nested list into a single comma-joined recipient;
        // a single `{var}` token interpolates to the value itself.
        recipients: '{recipients.userIds}',
        channels: [...(spec.notice.channels ?? ['inbox', 'email'])],
        severity: spec.notice.severity,
        topic: spec.notice.topic,
        title: spec.notice.title,
        message: spec.notice.message,
        sourceObject: spec.notice.sourceObject,
        sourceId: spec.notice.sourceId,
      },
    });
    if (previous) link(previous, whoId);
    link(whoId, decideId);
    link(decideId, tellId, HAS_RECIPIENT, 'Notify');
    link(decideId, doneId, NO_RECIPIENT, 'Nobody to tell');
    link(tellId, doneId);
    previous = '';
  }

  nodes.push({ id: doneId, type: 'assignment', label: 'Row Done' });
  if (previous) link(previous, doneId);
  return { nodes, edges };
}
