import { AdminSet, FinanceSet, LegalSet, RecordsSet, RequesterSet } from '../profiles/index.js';
import { CLM_POSITION } from '../sharing/positions.js';

/**
 * Position ↔ permission-set bindings (DESIGN.md §04).
 *
 * The permission model is record-authoritative (ADR-0090/0094): declaring a
 * position and declaring a set grants nobody anything until a
 * `sys_position_permission_set` row joins them. Without this file every
 * persona silently degrades to the platform baseline — which reads as
 * "permissions are broken" rather than "a binding is missing".
 *
 * This cannot be a declarative seed: the seed loader runs before the security
 * bootstrap creates the `sys_position` / `sys_permission_set` rows, so the
 * name references would not resolve. We play the admin's part imperatively on
 * `kernel:bootstrapped` — the anchor that fires only after every
 * `kernel:ready` handler, the security bootstrap included, has settled (the
 * shape ATS ships in its `bind-position-sets.ts`).
 *
 * Two rows per position. Each position binds its own set, and every position
 * also binds `clm_requester`: §04 makes that set every employee's default, the
 * platform refuses to bind a set carrying a system permission to the
 * `everyone` anchor (see `requester.profile.ts`), and the two leadership
 * rungs hold no set of their own — the object-level read on `clm_contract`
 * that lets `contract_executive_routed` / `contract_gm_routed` deliver rows
 * comes from this binding.
 *
 * Catalog rows are per organization ("unique per organization"), so a
 * position is looked up by name WITHOUT a limit of one and paired with the
 * set row of the same organization; a single-tenant boot has one of each.
 * Idempotent: a binding that already exists is left alone, so a restart never
 * duplicates a row and an administrator's removal is not re-created behind
 * their back within a boot. The log line at the end is the boot-time
 * evidence that the grants landed.
 */

const BINDINGS: ReadonlyArray<readonly [position: string, permissionSet: string]> = [
  [CLM_POSITION.legalCounsel,      LegalSet.name],
  [CLM_POSITION.legalHead,         LegalSet.name],
  [CLM_POSITION.financeController, FinanceSet.name],
  [CLM_POSITION.recordsManager,    RecordsSet.name],
  [CLM_POSITION.admin,             AdminSet.name],
  ...Object.values(CLM_POSITION).map((position) => [position, RequesterSet.name] as const),
];

const SYS = { isSystem: true } as const;

interface CatalogRow {
  id?: string;
  organization_id?: string | null;
}

export interface BindHostContext {
  ql: {
    find: (object: string, query: unknown, options?: unknown) => Promise<unknown>;
    insert: (object: string, data: Record<string, unknown>, options?: unknown) => Promise<unknown>;
  };
  logger?: { info?: (...a: unknown[]) => void; warn?: (...a: unknown[]) => void };
  hook?: (event: string, handler: () => Promise<void> | void) => void;
}

function rowsOf(result: unknown): CatalogRow[] {
  if (Array.isArray(result)) return result as CatalogRow[];
  const records = (result as { records?: unknown })?.records;
  return Array.isArray(records) ? (records as CatalogRow[]) : [];
}

function organizationOf(row: CatalogRow): string | null {
  return typeof row.organization_id === 'string' && row.organization_id !== '' ? row.organization_id : null;
}

/** Every catalog row of that name, across organizations, under the system context the engine's read path expects. */
async function findAllByName(ctx: BindHostContext, object: string, name: string): Promise<CatalogRow[]> {
  try {
    return rowsOf(await ctx.ql.find(object, { where: { name }, limit: 50, context: SYS }));
  } catch (err) {
    ctx.logger?.warn?.('[clm] position binding lookup failed', {
      object, name, error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export function registerClmPositionBindings(ctx: BindHostContext): void {
  const run = async (): Promise<void> => {
    let created = 0;
    let existing = 0;
    let skipped = 0;
    for (const [positionName, setName] of BINDINGS) {
      const positions = await findAllByName(ctx, 'sys_position', positionName);
      const sets = await findAllByName(ctx, 'sys_permission_set', setName);
      if (positions.length === 0 || sets.length === 0) {
        ctx.logger?.warn?.('[clm] position binding skipped (row missing)', { position: positionName, set: setName });
        skipped += 1;
        continue;
      }
      for (const position of positions) {
        const organization = organizationOf(position);
        const set = sets.find((candidate) => organizationOf(candidate) === organization);
        if (!position.id || !set?.id) {
          ctx.logger?.warn?.('[clm] position binding skipped (no set in the same organization)', {
            position: positionName, set: setName, organization,
          });
          skipped += 1;
          continue;
        }
        const hit = rowsOf(await ctx.ql.find(
          'sys_position_permission_set',
          { where: { position_id: position.id, permission_set_id: set.id }, limit: 1, context: SYS },
        ))[0];
        if (hit) {
          existing += 1;
          continue;
        }
        try {
          await ctx.ql.insert(
            'sys_position_permission_set',
            {
              id: `ppsb_clm_${positionName}_${setName}${organization ? `_${organization.slice(0, 8)}` : ''}`,
              position_id: position.id,
              permission_set_id: set.id,
            },
            { context: SYS },
          );
          created += 1;
        } catch (err) {
          ctx.logger?.warn?.('[clm] position binding insert failed', {
            position: positionName, set: setName, error: err instanceof Error ? err.message : String(err),
          });
          skipped += 1;
        }
      }
    }
    ctx.logger?.info?.('[clm] position bindings ensured', { created, existing, skipped, declared: BINDINGS.length });
  };

  if (typeof ctx.hook === 'function') {
    ctx.hook('kernel:bootstrapped', run);
  } else {
    void Promise.resolve().then(run);
  }
}
