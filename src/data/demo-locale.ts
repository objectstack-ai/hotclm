// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { DemoStrings } from './strings.js';
import { EN } from './demo-en/index.js';
import { ZH_CN } from './demo-zh/index.js';

/**
 * `OS_SEED_LOCALE` — which language the demo fixture is written in.
 *
 * English is the source language and the default (DESIGN.md §01); `zh-CN` is
 * the same demo, translated. `pnpm demo:zh` sets the variable, `pnpm demo`
 * does not.
 *
 * ## Read at COMPILE time, and that is why both demo scripts pass `--compile`
 *
 * The fixture is baked into `dist/objectstack.json` when the artifact is
 * compiled, not when the server starts, and `os dev` reuses an existing
 * artifact rather than rebuilding it. Without `--compile`, `pnpm demo:zh`
 * after `pnpm demo` would serve the English artifact the previous run built
 * and the switch would look broken. Both scripts pass it.
 *
 * ## An unrecognised spelling is a hard error, not a fallback to English
 *
 * `OS_SEED_LOCALE=zh_CN` (underscore) is a typo, and a silent fallback would
 * bring the demo up in English with everything apparently working — nobody
 * finds out until it is on a screen in front of a customer. The spellings
 * below are accepted; anything else stops the compile naming what it takes.
 * Unset is not a typo: that is the default, and the default is English.
 */
export const SEED_LOCALE_ENV_VAR = 'OS_SEED_LOCALE';

export type SeedLocale = 'en' | 'zh-CN';

// The one Node global this app reads. `@types/node` is deliberately not a
// dependency of a metadata package, so the single property the switch needs is
// declared narrowly and locally rather than pulling the whole Node type
// surface in for it. Module-scoped, so it shadows nothing globally.
declare const process: { env: Record<string, string | undefined> };

/**
 * The spellings each locale answers to, normalised (trimmed, lowercased).
 *
 * A `Map` rather than an object literal, deliberately: a plain-object lookup
 * answers `OS_SEED_LOCALE=constructor` with something off `Object.prototype`,
 * and a lookup that can return a function where a locale is expected is not a
 * lookup that can be trusted to say "unknown".
 */
const SPELLINGS = new Map<string, SeedLocale>([
  ['', 'en'],
  ['en', 'en'],
  ['en-us', 'en'],
  ['en-gb', 'en'],
  ['zh', 'zh-CN'],
  ['zh-cn', 'zh-CN'],
]);

/** Which language this compile was asked for. Unset means English. */
export const seedLocale = (): SeedLocale => {
  const raw = (process.env[SEED_LOCALE_ENV_VAR] ?? '').trim();
  const locale = SPELLINGS.get(raw.toLowerCase());
  if (locale === undefined) {
    throw new Error(
      `${SEED_LOCALE_ENV_VAR}=${JSON.stringify(raw)} is not a demo locale. ` +
        `Use one of: ${[...SPELLINGS.keys()].filter(Boolean).join(', ')} — or leave it unset for English.`,
    );
  }
  return locale;
};

/**
 * The locale this module graph was compiled for, resolved ONCE.
 *
 * Every generator reads {@link STRINGS} rather than the environment, so the
 * whole fixture agrees on one language per compile. A second read elsewhere
 * would be a second answer the day the variable changed under a long-lived
 * process.
 */
export const SEED_LOCALE: SeedLocale = seedLocale();

/** The string bundle this compile writes its rows in. */
export const STRINGS: DemoStrings = SEED_LOCALE === 'zh-CN' ? ZH_CN : EN;
