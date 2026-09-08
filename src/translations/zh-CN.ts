// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { appSurface } from './zh-CN/app.js';
import { catalog } from './zh-CN/objects.catalog.js';
import { contract } from './zh-CN/objects.contract.js';
import { lifecycle } from './zh-CN/objects.lifecycle.js';

/**
 * 简体中文 (`zh-CN`) — the full second bundle (DESIGN.md §01 全球优先).
 *
 * ⚠️ THE FAILURE MODE OF THIS FILE IS SILENCE. `fallbackLocale: 'en'` means a
 * key missing here renders its English source string, with no error, no warning
 * and no visible difference from a key nobody has translated yet. The only
 * instrument that can tell those two apart is `pnpm lint:i18n-gate`, which is
 * why that gate — not this file — is the deliverable card 11 was written
 * around.
 *
 * House copy rules (docs/backlog/11-i18n.md): no internal codenames, no raw
 * exception text, three-part error messages. So where the English `help` says
 * "Stamped daily by the expiry job (F13)" the Chinese says 每日检查 — the flow
 * ids, hook filenames and `DESIGN.md` section numbers are the maintainers'
 * vocabulary, not the user's, and a Chinese reader has no way to look them up.
 * The Chinese is therefore not a transliteration of the English and reviewing
 * the two side by side will show it.
 *
 * Same split axis as `en.ts`, file for file, so the two can be diffed.
 */
export const zhCN: TranslationData = {
  objects: {
    ...catalog,
    ...contract,
    ...lifecycle,
  },
  ...appSurface,
};
