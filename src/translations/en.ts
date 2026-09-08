// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationData } from '@objectstack/spec/system';

import { appSurface } from './en/app.js';
import { catalog } from './en/objects.catalog.js';
import { contract } from './en/objects.contract.js';
import { lifecycle } from './en/objects.lifecycle.js';

/**
 * English (`en`) — the DEFAULT and SOURCE locale.
 *
 * ⚠️ This bundle does not decide the English wording; the metadata does. Every
 * string here restates the `label` / `help` / `title` the object, view, action,
 * app, dashboard, dataset or page already authors inline, because DESIGN.md §01
 * makes English the source language: "对象、字段、选项的 label 先写英文".
 *
 * That makes the bundle look redundant, and for the coverage gate it partly is
 * — `computeI18nCoverage` counts an inline label as satisfying the DEFAULT
 * locale, so `en` would pass with no bundle at all. It is shipped anyway for
 * one reason: it is the translator's side-by-side. A `zh-CN` file whose English
 * twin does not exist is a file a translator has to read `*.object.ts` to
 * review.
 *
 * SPLIT AXIS: translation NAMESPACE first, then — within `objects` — the
 * lifecycle role of the object. `objects` is 80% of this bundle (606 of 752
 * keys), so a namespace-only split leaves one 606-key file; the role split puts
 * the largest part (`clm_contract`, 259 keys) at a third.
 */
export const en: TranslationData = {
  objects: {
    ...catalog,
    ...contract,
    ...lifecycle,
  },
  ...appSurface,
};
