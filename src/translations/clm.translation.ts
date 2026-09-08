// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle } from '@objectstack/spec/system';

import { en } from './en.js';
import { zhCN } from './zh-CN.js';

/**
 * HotCLM — the one translation bundle.
 *
 * `TranslationBundle` is `Record<locale, TranslationData>`, and `defineStack`
 * takes an ARRAY of them (`translations: TranslationBundle[]`), so one bundle
 * carrying both locales is the whole i18n surface of this app.
 *
 * TWO locales, deliberately. HotCRM ships four (`en`, `zh-CN`, `ja-JP`,
 * `es-ES`) and is this repo's reference for the layout, not for the locale
 * list: DESIGN.md §01 commits to English as the source language and 简体中文 as
 * a complete second bundle, and a third locale that is 40% translated is worse
 * than no third locale — `fallbackLocale` renders the gaps in English without
 * saying so.
 *
 * The per-locale file split (`<locale>.ts` assembling `<locale>/*.ts`) is a
 * convention of this source tree and nothing more. It was verified against the
 * spec rather than copied: `TranslationConfigSchema`'s own `guidance` retires
 * the `fileOrganization` key with "no runtime ever read it; how you split
 * bundle files is a convention of your source tree, and the loader reads
 * whatever `translations` you hand `defineStack`".
 */
export const ClmTranslations: TranslationBundle = {
  en,
  'zh-CN': zhCN,
};
