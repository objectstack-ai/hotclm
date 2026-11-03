import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Stored `display_name` mirrors for the two contract children whose title is
 * not composed of option labels (DESIGN.md §03). Each title is a STORED text
 * field, so something has to write it. These hooks do, on insert and whenever
 * one of the inputs the title is built from changes:
 *
 *   clm_obligation        "<title>"
 *   clm_payment_plan      "#<seq> · <planned_date>"
 *
 * The other four children name themselves with a formula `display_name`
 * instead: a name composed of select options reads `label(record.<field>)`,
 * which renders the option label in the READER's locale, where a stored string
 * has the one language it was written in (issue #157, objectstack#26608):
 *
 *   clm_contract_version  "v<version_no> · label(kind)"     contract-version.object.ts
 *   clm_review            "label(stage) · <reviewer name>"  review.object.ts
 *   clm_deviation         "<clause title> · label(status)"  deviation.object.ts
 *   clm_signature         "label(method) · label(status)"   signature.object.ts
 *
 * The two kept here hold no option label. An obligation's title is the text
 * its author typed. The payment mirror is `#<seq>` and not a localized
 * instalment word: a value stamped once cannot be re-rendered for the next
 * reader, so the localized form belongs to the zh-CN bundle (card 11), never
 * to the stored column.
 *
 * `display_name` is `readonly`: the engine keeps a key a before-hook assigned,
 * so the stamp survives the read-only strip while a hand-typed value does not.
 */

const obligationDisplayName: Hook = {
  name: 'obligation_display_name',
  object: 'clm_obligation',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as the obligation title.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.title !== undefined || !previous.display_name;
    if (!stale) return;
    const title = input.title !== undefined ? input.title : previous.title;
    const label = typeof title === 'string' ? title.trim() : '';
    input.display_name = label || 'Obligation';
  },
};

const paymentPlanDisplayName: Hook = {
  name: 'payment_plan_display_name',
  object: 'clm_payment_plan',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as "#<seq> · <planned_date>" (ASCII; the localized form belongs to the zh-CN bundle).',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.seq !== undefined || input.planned_date !== undefined || !previous.display_name;
    if (!stale) return;
    const seq = input.seq !== undefined ? input.seq : previous.seq;
    const plannedDate = input.planned_date !== undefined ? input.planned_date : previous.planned_date;
    // A date field reaches a hook as an ISO string from REST and as a Date
    // from an in-process write; both render to the calendar day, never to a
    // timestamp, so the mirror does not shift with the reader's clock.
    let dateLabel = '';
    if (plannedDate instanceof Date) {
      dateLabel = plannedDate.toISOString().slice(0, 10);
    } else if (typeof plannedDate === 'string' && plannedDate) {
      dateLabel = plannedDate.slice(0, 10);
    }
    const seqLabel = seq === undefined || seq === null || seq === '' ? '?' : String(seq);
    input.display_name = dateLabel ? `#${seqLabel} · ${dateLabel}` : `#${seqLabel}`;
  },
};

export default [
  obligationDisplayName,
  paymentPlanDisplayName,
];
