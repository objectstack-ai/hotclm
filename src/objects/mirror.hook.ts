import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api.js';

/**
 * Stored `display_name` mirrors for the six contract children (DESIGN.md
 * §03). Each child's title is a STORED text field — never a formula, because
 * a formula is not searchable and cannot be a `nameField` — so something has
 * to write it. These hooks do, on insert and whenever one of the inputs the
 * title is built from changes:
 *
 *   clm_contract_version  "v<version_no> · <kind>"
 *   clm_review            "<stage> · <reviewer>"
 *   clm_deviation         "<clause title> · <status>"
 *   clm_signature         "<method> · <status>"
 *   clm_obligation        "<title>"
 *   clm_payment_plan      "#<seq> · <planned_date>"
 *
 * The English option labels are repeated inline (a lowered hook body has no
 * module scope, and cannot read the object's own option list). A stored
 * title is untranslatable by nature; English is the source language
 * (DESIGN.md §01) — which is why the payment mirror is `#<seq>` and not a
 * localized instalment word: a value stamped once cannot be re-rendered for
 * the next reader, so the localized form belongs to the zh-CN bundle
 * (card 11), never to the stored column.
 *
 * `display_name` is `readonly`: the engine keeps a key a before-hook assigned,
 * so the stamp survives the read-only strip while a hand-typed value does not.
 */

const contractVersionDisplayName: Hook = {
  name: 'contract_version_display_name',
  object: 'clm_contract_version',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as "v<version_no> · <kind>".',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.version_no !== undefined || input.kind !== undefined || !previous.display_name;
    if (!stale) return;
    const KIND: Record<string, string> = {
      draft: 'Draft',
      internal_redline: 'Internal redline',
      counterparty_redline: 'Counterparty redline',
      clean: 'Clean',
      final_signed: 'Final signed',
    };
    const versionNo = input.version_no !== undefined ? input.version_no : previous.version_no;
    const kind = input.kind !== undefined ? input.kind : previous.kind;
    const kindLabel = typeof kind === 'string' ? (KIND[kind] ?? kind) : '';
    input.display_name = `v${versionNo ?? '?'} · ${kindLabel}`.trim();
  },
};

const reviewDisplayName: Hook = {
  name: 'review_display_name',
  object: 'clm_review',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as "<stage> · <reviewer name>".',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.stage !== undefined || input.reviewer !== undefined || !previous.display_name;
    if (!stale) return;
    const STAGE: Record<string, string> = {
      legal: 'Legal',
      finance: 'Finance',
      compliance: 'Compliance',
      business: 'Business',
    };
    const stage = input.stage !== undefined ? input.stage : previous.stage;
    const reviewer = input.reviewer !== undefined ? input.reviewer : previous.reviewer;
    const stageLabel = typeof stage === 'string' ? (STAGE[stage] ?? stage) : '';
    let reviewerLabel = typeof reviewer === 'string' && reviewer ? reviewer : '';
    const api = ctx.api as HookApi | undefined;
    if (reviewerLabel && api) {
      // The title is cosmetic; a user row the caller cannot read must not
      // block the review write. The id stands in for the name in that case.
      try {
        const user = await api.object('sys_user').findOne({ where: { id: reviewer }, fields: ['id', 'name', 'email'] });
        const name = typeof user?.name === 'string' && user.name ? user.name : (typeof user?.email === 'string' ? user.email : '');
        if (name) reviewerLabel = name;
      } catch {
        // keep the id
      }
    }
    input.display_name = `${stageLabel} · ${reviewerLabel || 'Unassigned'}`;
  },
};

const deviationDisplayName: Hook = {
  name: 'deviation_display_name',
  object: 'clm_deviation',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as "<clause title> · <status>".',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.clause !== undefined || input.status !== undefined || !previous.display_name;
    if (!stale) return;
    const STATUS: Record<string, string> = {
      open: 'Open',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
    };
    const clause = input.clause !== undefined ? input.clause : previous.clause;
    const status = input.status !== undefined ? input.status : previous.status;
    const statusLabel = typeof status === 'string' ? (STATUS[status] ?? status) : STATUS.open;
    let clauseLabel = typeof clause === 'string' && clause ? clause : '';
    const api = ctx.api as HookApi | undefined;
    if (clauseLabel && api) {
      const row = await api.object('clm_clause').findOne({ where: { id: clause }, fields: ['id', 'title'] });
      if (typeof row?.title === 'string' && row.title) clauseLabel = row.title;
    }
    input.display_name = `${clauseLabel || 'Clause'} · ${statusLabel}`;
  },
};

const signatureDisplayName: Hook = {
  name: 'signature_display_name',
  object: 'clm_signature',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description: 'Stamp display_name as "<method> · <status>".',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    const stale = event === 'beforeInsert' || input.method !== undefined || input.status !== undefined || !previous.display_name;
    if (!stale) return;
    const METHOD: Record<string, string> = { esign: 'E-signature', wet_ink: 'Wet ink' };
    const STATUS: Record<string, string> = {
      draft: 'Draft',
      sent: 'Sent',
      completed: 'Completed',
      declined: 'Declined',
      voided: 'Voided',
    };
    const method = input.method !== undefined ? input.method : previous.method;
    const status = input.status !== undefined ? input.status : previous.status;
    const methodLabel = typeof method === 'string' ? (METHOD[method] ?? method) : METHOD.esign;
    const statusLabel = typeof status === 'string' ? (STATUS[status] ?? status) : STATUS.draft;
    input.display_name = `${methodLabel} · ${statusLabel}`;
  },
};

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
  contractVersionDisplayName,
  reviewDisplayName,
  deviationDisplayName,
  signatureDisplayName,
  obligationDisplayName,
  paymentPlanDisplayName,
];
