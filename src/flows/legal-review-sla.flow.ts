import type { Flow } from '@objectstack/spec/automation';
import { holdersPrelude, rowBody, sweepFlow } from './_daily-sweep.js';

/**
 * F3 `legal_review_sla` — the daily nudge on contracts sitting in legal review
 * (DESIGN.md §06 F3).
 *
 * ## The threshold is FIXED, and the wording says which one it is
 *
 * §06 F3 reads "`in_review` 超过类型 `review_sla_days`：提醒 `legal_owner`,
 * 超一倍抄送 `clm_legal_head`" — a PER-TYPE threshold, read off a row on
 * another object. Decision #31 was ruled **1C + 2B** by the maintainer on
 * 2026-09-09: the per-type comparison needs date arithmetic the platform does
 * not have (§12 gap #7 — no `daysBetween` in CEL; the analytics layer refuses
 * a cross-object filter), the blocking defect is a PLATFORM defect
 * (`objectstack-ai/objectstack#16737`), and an application repository does not
 * replicate a platform rule to route around one. So:
 *
 *  - ⛔ **No daily job stamps a computed duration or a `review_due_at` onto a
 *    field.** That was option 1A/2A and it was explicitly not adopted.
 *  - The job uses a **fixed threshold**, and every string it writes **states
 *    that threshold**: "over 30 days", never "over SLA". The nine seeded
 *    contract types have SLAs of 2, 3, 5 and 10 days, so a notification
 *    claiming an SLA breach over a 30-day filter would be false — and one
 *    claiming it over a 2-day type would be true for the wrong reason. 30 days
 *    is later than every one of them, which makes the reminder conservative:
 *    it never fires early, and it says what it measured.
 *  - "超一倍" is doubled the same way: 60 days, and the head of legal is
 *    copied there.
 *
 * The legal dashboard's matching tile (card 10) is titled "In Review Over 30
 * Days" for the same reason and against the same number, so the tile and the
 * reminder cannot tell two different stories.
 *
 * The per-type reminder returns when the platform gains the date capability;
 * #31 stays open and blocked on #16737, with the unlock criterion "this repo
 * upgrades to a version where the wrong path actually errors" — not "the
 * upstream PR merged".
 *
 * ## Two bands, two queries — not one query and a comparison
 *
 * Splitting "over 30" into `[30, 60)` and `[60, ∞)` keeps ALL of the date
 * arithmetic inside `filter` values, where the `{date-macro}` vocabulary is
 * resolved server-side. The alternative — one query and a per-row decision —
 * would need a date difference on a CEL edge, which is the thing that does not
 * exist. It also means a contract is in exactly one band, so it gets exactly
 * one notification a day rather than two.
 *
 * The bands abut on `{60_days_ago}` (`$gte` on the near band, `$lt` on the
 * far one), so they tile the timeline with no row in both and none in neither.
 */
export const LegalReviewSlaFlow: Flow = sweepFlow({
  name: 'legal_review_sla',
  label: 'Legal Review Running Long',
  description: 'Daily: remind the legal owner of a contract that has been in review over 30 days, and copy the head of legal once it passes 60. A fixed threshold, stated in the message — decision #31 ruled 2B, the per-type SLA needs platform date support (objectstack#16737).',
  prelude: holdersPrelude('clm_legal_head', 'legalHeads'),
  stages: [
    {
      id: 'over30',
      label: 'In Review Over 30 Days',
      objectName: 'clm_contract',
      filter: {
        status: 'in_review',
        review_started_at: { $lt: '{30_days_ago}', $gte: '{60_days_ago}' },
      },
      fields: ['id', 'title', 'contract_number', 'legal_owner', 'review_started_at'],
      item: 'review',
      body: rowBody({
        id: 'over30',
        recipients: { primary: '{review.legal_owner}' },
        notice: {
          topic: 'clm_legal_review_over_30_days',
          severity: 'warning',
          sourceObject: 'clm_contract',
          sourceId: '{review.id}',
          title: 'In legal review over 30 days: {review.title}',
          message: 'Contract {review.contract_number} has been in legal review since {review.review_started_at} — more than 30 days. This is a fixed 30-day threshold, not this contract type\'s own review SLA. Move it on, or record what it is waiting for.',
        },
      }),
    },
    {
      id: 'over60',
      label: 'In Review Over 60 Days',
      objectName: 'clm_contract',
      filter: {
        status: 'in_review',
        review_started_at: { $lt: '{60_days_ago}' },
      },
      fields: ['id', 'title', 'contract_number', 'legal_owner', 'review_started_at'],
      item: 'review',
      body: rowBody({
        id: 'over60',
        recipients: { primary: '{review.legal_owner}', also: '{legalHeads.userIds}' },
        notice: {
          topic: 'clm_legal_review_over_60_days',
          severity: 'critical',
          sourceObject: 'clm_contract',
          sourceId: '{review.id}',
          title: 'In legal review over 60 days: {review.title}',
          message: 'Contract {review.contract_number} has been in legal review since {review.review_started_at} — more than 60 days, twice the 30-day reminder threshold, so the head of legal is copied. This is a fixed threshold, not this contract type\'s own review SLA.',
        },
      }),
    },
  ],
});
