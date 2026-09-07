import type { Hook } from '@objectstack/spec/data';

import contractHooks from './contract.hook.js';
import mirrorHooks from './mirror.hook.js';

/**
 * Every lifecycle hook of the app, flat, for `defineStack({ hooks })`. Kept
 * apart from `index.ts` on purpose: that barrel is spread into `objects` via
 * `Object.values()`, and a hook array in it would be registered as an object.
 */
export const allHooks: Hook[] = [...contractHooks, ...mirrorHooks];
