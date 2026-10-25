import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api.js';

/**
 * At most one current version per contract (DESIGN.md §03 `clm_contract_version`,
 * ruled 1A + 2A on #96).
 *
 * `is_current` is "the version negotiation is currently on" — singular, and
 * what the `approved → signing` guard in `contract.hook.ts` reads. A new
 * version is current by default (`defaultValue: true` on the field), so this
 * hook is what keeps the flag exclusive, on every door alike — the version
 * form, REST, flows, MCP:
 *
 * - a row that is current after the write un-marks every other current row of
 *   the same contract;
 * - a `final_signed` row does not take the flag from a negotiation version: it
 *   keeps `is_current: true` only while it is the contract's ONLY version (the
 *   F16 backfill files exactly that), and is otherwise stored `false`, leaving
 *   its siblings alone. That is what keeps `signing → approved` re-enterable
 *   after a failed signing round: the clean version stays current whoever
 *   files the executed copy — F7 writes it `false` explicitly, and a records
 *   clerk adding one through the version form gets the same answer.
 *
 * Nothing is promoted when a row is un-ticked: "no current version" is a state
 * the signing guard already refuses with its own message.
 *
 * `afterInsert` / `afterUpdate`, so the caller's own write is judged first and
 * a refused write never un-marks anything; the decision is taken on the
 * COMMITTED row, re-read here. `runAs: 'system'`: requesters and records hold
 * create but not edit on versions (DESIGN.md §04), so un-marking a sibling — or
 * storing `false` on the row just created — must be a system write. Same
 * precedent as `deviation_gate` in `contract.hook.ts`. The hook's own writes
 * set `is_current: false` and therefore return at the first check, so it does
 * not recurse.
 *
 * As in `contract.hook.ts`, everything the handler uses lives inside it: the
 * build lowers the body into a sandbox with no module scope.
 */
const contractVersionCurrent: Hook = {
  name: 'contract_version_current',
  object: 'clm_contract_version',
  events: ['afterInsert', 'afterUpdate'],
  priority: 300,
  runAs: 'system',
  description: 'Keep at most one current version per contract: a version that becomes current un-marks the others; a final signed copy keeps the flag only when it is the contract\'s only version.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous ?? {};
    // An update that touches none of the three inputs cannot change who is
    // current; skip the reads.
    if (event === 'afterUpdate' && input.is_current === undefined && input.kind === undefined && input.contract === undefined) return;

    const result = (ctx.result ?? {}) as Record<string, unknown>;
    const id = event === 'afterInsert' ? result.id : previous.id;
    if (typeof id !== 'string' || !id) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    const row = await api.object('clm_contract_version').findOne({
      where: { id },
      fields: ['id', 'contract', 'kind', 'is_current'],
    });
    if (!row || row.is_current !== true) return;
    const contractId = row.contract;
    if (typeof contractId !== 'string' || !contractId) return;

    if (row.kind === 'final_signed') {
      const versions = await api.object('clm_contract_version').count({ where: { contract: contractId } });
      if (versions > 1) {
        await api.object('clm_contract_version').update({ id, is_current: false }, { where: { id } });
      }
      return;
    }

    const others = await api.object('clm_contract_version').find({
      where: { contract: contractId, is_current: true, id: { $ne: id } },
      fields: ['id'],
      top: 200,
    });
    for (const other of others) {
      if (typeof other.id !== 'string' || other.id === id) continue;
      await api.object('clm_contract_version').update({ id: other.id, is_current: false }, { where: { id: other.id } });
    }
  },
};

export default [contractVersionCurrent];
