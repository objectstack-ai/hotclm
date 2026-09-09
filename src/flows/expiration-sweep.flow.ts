import type { Flow } from '@objectstack/spec/automation';
import { HAS_RECIPIENT, NO_RECIPIENT, rowBody, sweepFlow } from './_daily-sweep.js';
import { RENEWAL_DRAFT_FIELDS } from './renewal-notice.flow.js';

/**
 * F13 `expiration_sweep` — the day a contract's term runs out (DESIGN.md §06
 * F13: "`active` 且 `end_date < today`：非自动续签置 `expired`；自动续签则建续签
 * draft 并提醒").
 *
 * ## Two stages that partition the same rows
 *
 * `auto_renew` decides which of the two things happens, and the two filters
 * are exact complements: `{ $ne: true }` and `true`. Not `false` on the first
 * one — the column is `defaultValue: false`, but a row imported or seeded
 * without it holds NULL, and `auto_renew: false` would leave those rows in
 * neither stage: active for ever, past their end date, invisible to both
 * halves of the job. `$ne: true` catches false and NULL together.
 *
 * ## `active → expired` is a system-only edge, and this is the system
 *
 * `contract_state_machine` refuses that transition outright unless
 * `ctx.session.isSystem` — "Only the expiry job marks a contract expired;
 * terminate it to end it by hand." This flow is that job, and `runAs:
 * 'system'` (set by `sweepFlow`) is what satisfies the guard. It is also the
 * reason the guard can be that strict: there IS a writer.
 *
 * ## The auto-renewing branch leaves the contract active — so it needs a key
 *
 * §06 F13 does not expire an auto-renewing contract; it drafts the renewal and
 * tells someone. The contract therefore stays `active` past its end date and
 * matches this stage's filter again tomorrow, and every day after. Without a
 * key that would be a new draft a day. The key is a READ of the link itself —
 * does a contract already carry `renewed_from` pointing at this one — rather
 * than a flag, so it is true exactly when a renewal exists, whoever created
 * it: the daily sweep, or a person pressing 发起续签 (F12) the day before.
 * The two halves of the renewal story cannot double up on each other.
 *
 * The renewal draft's field map is `RENEWAL_DRAFT_FIELDS`, shared with F12's
 * button so "what a renewal inherits" has one answer in this repository.
 */

const RENEWAL_EXISTS = 'has(vars.existingRenewal) && vars.existingRenewal != null && has(vars.existingRenewal.id)';
const NO_RENEWAL_YET = '!has(vars.existingRenewal) || vars.existingRenewal == null || !has(vars.existingRenewal.id)';

export const ExpirationSweepFlow: Flow = sweepFlow({
  name: 'expiration_sweep',
  label: 'Contract Expiry',
  description: 'Daily: expire an active contract whose end date has passed, or — when it auto-renews — draft the renewal once and tell the business owner and legal.',
  // An hour after the other daily jobs. `renewal_notice` (F12) runs at 06:00,
  // so on the day a contract crosses both thresholds the notice is already in
  // the inbox when the expiry lands, rather than the reverse.
  cron: '0 7 * * *',
  stages: [
    {
      id: 'expire',
      label: 'Term Ended',
      objectName: 'clm_contract',
      filter: {
        status: 'active',
        auto_renew: { $ne: true },
        end_date: { $lt: '{today}' },
      },
      fields: ['id', 'title', 'contract_number', 'owner_id', 'legal_owner', 'end_date'],
      item: 'expired',
      body: rowBody({
        id: 'expire',
        lead: [
          {
            id: 'expire_flag',
            type: 'update_record',
            label: 'Mark Expired',
            config: {
              objectName: 'clm_contract',
              filter: { id: '{expired.id}' },
              fields: { status: 'expired' },
            },
          },
        ],
        recipients: { primary: '{expired.owner_id}', also: '{expired.legal_owner}' },
        notice: {
          topic: 'clm_contract_expired',
          severity: 'warning',
          sourceObject: 'clm_contract',
          sourceId: '{expired.id}',
          title: 'Expired: {expired.title}',
          message: 'Contract {expired.contract_number} ended on {expired.end_date} and is now expired. It does not auto-renew. Start a renewal if the relationship continues, and hand it to the records desk for archiving.',
        },
      }),
    },
    {
      id: 'autorenew',
      label: 'Term Ended, Auto-Renewing',
      objectName: 'clm_contract',
      filter: {
        status: 'active',
        auto_renew: true,
        end_date: { $lt: '{today}' },
      },
      fields: ['id', 'title', 'contract_number', 'contract_type', 'party', 'our_entity', 'department', 'owner_id', 'legal_owner', 'amount', 'currency_code', 'payment_terms', 'governing_law', 'jurisdiction', 'contract_language', 'confidentiality_term_months', 'auto_renew', 'renewal_notice_days', 'term_months', 'end_date', 'parent_contract'],
      item: 'expired',
      body: {
        nodes: [
          {
            id: 'auto_existing',
            type: 'get_record',
            label: 'Renewal Already Drafted?',
            config: {
              objectName: 'clm_contract',
              filter: { renewed_from: '{expired.id}' },
              fields: ['id', 'contract_number', 'status'],
              outputVariable: 'existingRenewal',
            },
          },
          { id: 'auto_gate', type: 'decision', label: 'Draft Needed?' },
          {
            id: 'auto_compute',
            type: 'script',
            label: 'Compute The Draft',
            config: {
              function: 'clm_renewal_draft',
              inputs: { title: '{expired.title}', endDate: '{expired.end_date}', termMonths: '{expired.term_months}' },
              outputVariable: 'draft',
            },
          },
          {
            id: 'auto_create',
            type: 'create_record',
            label: 'Create Renewal Draft',
            config: {
              objectName: 'clm_contract',
              fields: { ...RENEWAL_DRAFT_FIELDS },
              outputVariable: 'renewal',
            },
          },
          {
            id: 'auto_who',
            type: 'script',
            label: 'Who To Tell',
            config: {
              function: 'clm_notify_recipients',
              inputs: { primary: '{expired.owner_id}', also: '{expired.legal_owner}' },
              outputVariable: 'recipients',
            },
          },
          { id: 'auto_decide', type: 'decision', label: 'Someone To Tell?' },
          {
            id: 'auto_tell',
            type: 'notify',
            label: 'Notify',
            config: {
              recipients: '{recipients.userIds}',
              channels: ['inbox', 'email'],
              severity: 'warning',
              topic: 'clm_contract_auto_renewed',
              sourceObject: 'clm_contract',
              sourceId: '{renewal.id}',
              title: 'Renewal drafted: {expired.title}',
              message: 'Contract {expired.contract_number} auto-renews and its term ended on {expired.end_date}, so a renewal draft has been created and linked back to it. Review the terms and submit it.',
            },
          },
          { id: 'auto_done', type: 'assignment', label: 'Row Done' },
        ],
        edges: [
          { id: 'a1', source: 'auto_existing', target: 'auto_gate', type: 'default' },
          { id: 'a2', source: 'auto_gate', target: 'auto_done', type: 'default', label: 'Already drafted', condition: RENEWAL_EXISTS },
          { id: 'a3', source: 'auto_gate', target: 'auto_compute', type: 'default', label: 'Draft it', condition: NO_RENEWAL_YET },
          { id: 'a4', source: 'auto_compute', target: 'auto_create', type: 'default' },
          { id: 'a5', source: 'auto_create', target: 'auto_who', type: 'default' },
          { id: 'a6', source: 'auto_who', target: 'auto_decide', type: 'default' },
          { id: 'a7', source: 'auto_decide', target: 'auto_tell', type: 'default', label: 'Notify', condition: HAS_RECIPIENT },
          { id: 'a8', source: 'auto_decide', target: 'auto_done', type: 'default', label: 'Nobody to tell', condition: NO_RECIPIENT },
          { id: 'a9', source: 'auto_tell', target: 'auto_done', type: 'default' },
        ],
      },
    },
  ],
});
