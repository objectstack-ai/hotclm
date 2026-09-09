import type { Flow } from '@objectstack/spec/automation';
import { rowBody, sweepFlow } from './_daily-sweep.js';

/**
 * F4 `turn_stalled` — the counterparty has had the ball for over a week
 * (DESIGN.md §06 F4: "`current_turn == counterparty` 且 `turn_since` 超 7 天:
 * 提醒业务承办催对方").
 *
 * Seven days is the design's own number, written into the query as
 * `turn_since < {7_days_ago}` rather than into a formula field — §12 gap #7
 * again: there is no CEL date difference, and there does not need to be one
 * when the window is a constant.
 *
 * ## The one condition §06 does not spell out, and why it is here
 *
 * The design names two conditions. Applied literally they include a
 * `cancelled` contract whose last recorded turn was the counterparty's, and
 * that contract would nudge its owner every morning forever: the turn is not
 * stalled, it is over. So the sweep also requires the contract to be one of
 * the statuses where a turn can still move — the same "open" set
 * `contract_route` counts when it balances legal load. This narrows nothing
 * anybody wants: no closed contract is waiting on anybody.
 *
 * ## Who is told, and what happens when nobody is
 *
 * The business owner (`owner_id`), exactly as §06 says — the person whose job
 * it is to chase the counterparty. `legal_owner` is deliberately NOT copied:
 * the legal queue has its own 谈判中 view (§05, sorted by `turn_since`), and a
 * daily copy of every stalled negotiation would make it noise.
 *
 * A contract with no business owner produces no notification and no failure —
 * `clm_contract.owner_id` is filled by the security middleware on a user
 * insert, but a seeded or imported contract may name an account that does not
 * exist yet (README: the three requester accounts). The row is skipped
 * quietly rather than failing the sweep at that row.
 */
export const TurnStalledFlow: Flow = sweepFlow({
  name: 'turn_stalled',
  label: 'Counterparty Turn Stalled',
  description: 'Daily: tell the business owner when the counterparty has held the turn for more than 7 days on a contract that is still moving.',
  stages: [
    {
      id: 'stalled',
      label: 'Counterparty Over 7 Days',
      objectName: 'clm_contract',
      filter: {
        current_turn: 'counterparty',
        turn_since: { $lt: '{7_days_ago}' },
        status: { $in: ['submitted', 'in_review', 'in_approval', 'approved', 'signing'] },
      },
      fields: ['id', 'title', 'contract_number', 'owner_id', 'turn_since', 'status'],
      item: 'stalled',
      body: rowBody({
        id: 'stalled',
        recipients: { primary: '{stalled.owner_id}' },
        notice: {
          topic: 'clm_turn_stalled',
          severity: 'warning',
          sourceObject: 'clm_contract',
          sourceId: '{stalled.id}',
          title: 'Waiting on the counterparty since {stalled.turn_since}: {stalled.title}',
          message: 'The turn on contract {stalled.contract_number} has been with the counterparty for more than 7 days. Chase them, or take the turn back and record where the negotiation stands.',
        },
      }),
    },
  ],
});
