/**
 * Structural type of the ObjectQL data API the runtime injects as `ctx.api`
 * inside a hook handler. The SDK types `HookContext.api` as `unknown`; every
 * `*.hook.ts` casts `ctx.api as HookApi | undefined` against this one shape so
 * the spellings cannot drift between hooks.
 *
 * Type-only: nothing here is a value, so importing it does not put a
 * module-scope identifier into a lowered hook body (the CLI's
 * `extractHookBody` refuses those — see `contract.hook.ts`).
 *
 * The legal key sets below are HotCRM's, measured against the pinned
 * `@objectstack` 17.3.0 packages on the object the kernel injects as `ctx.api`
 * (hotcrm `src/objects/_hook-api.ts`, pinned there by
 * `test/hook-query-predicate.test.ts` against a real engine):
 *   - the predicate key is `where`, and only `where` — `filter` is an alias the
 *     engine folds, and mixing the two spellings throws;
 *   - `count` accepts `where` alone; `fields` / `top` on it throw;
 *   - `update` takes the document (with its `id` inside) and a `{ where }`
 *     options bag — there is no `(id, doc)` overload.
 */

type Doc = Record<string, unknown>;

/** Options accepted by `find` / `findOne`. */
export interface HookQuery {
  where?: Doc;
  fields?: string[];
  top?: number;
}

/** Options accepted by `count` — the predicate, nothing else. */
export interface HookCountQuery {
  where?: Doc;
}

/** The document handed to `update`; the target `id` travels inside it. */
export type HookUpdateDoc = Doc & { id: string };

export interface HookUpdateOptions {
  where: Doc;
}

export interface HookDeleteOptions {
  where: Doc;
}

/** The methods present on BOTH surfaces the runtime can inject (in-process repository and sandbox facade). */
export interface HookObjectApi {
  count: (q: HookCountQuery) => Promise<number>;
  find: (q: HookQuery) => Promise<Array<Doc>>;
  findOne: (q: HookQuery) => Promise<Doc | null>;
  insert: (doc: Doc) => Promise<unknown>;
  update: (doc: HookUpdateDoc, options: HookUpdateOptions) => Promise<unknown>;
  delete: (options: HookDeleteOptions) => Promise<unknown>;
}

export interface HookApi {
  object: (name: string) => HookObjectApi;
}
