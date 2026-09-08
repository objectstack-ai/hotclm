#!/usr/bin/env node
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * i18n zero-tolerance gate — `pnpm lint:i18n-gate`.
 *
 * ## Why an app-side gate exists at all
 *
 * `fallbackLocale: 'en'` (objectstack.config.ts) means a key missing from
 * `zh-CN` renders its English source string. Silently: no error, no warning, no
 * log line, and nothing on screen that tells a gap from a translation.
 *
 * `pnpm lint` does not catch it either. `objectstack lint` exits non-zero only
 * on rule-level ERRORS, and a non-default-locale translation gap is a WARNING —
 * only the default locale is an error. Measured on this repo, on this branch,
 * with two `zh-CN` keys deleted:
 *
 *     pnpm exec objectstack lint --json | node -e "const r=JSON.parse( \
 *       require('fs').readFileSync(0,'utf8')); console.log(r.errors, r.warnings)"
 *     # -> 0 2
 *     pnpm lint; echo $?
 *     # -> 0
 *
 * So the fallback hides the gap on screen and the exit code hides it in CI.
 * This script is the instrument that fails the build on one.
 *
 * ## What this is NOT: a violation counter
 *
 * HotCRM's `scripts/check-lint-i18n-gate.mjs` — this file's model — counts
 * `i18n/missing-*` issues and fails when the count is not zero. That is the
 * necessary half and it is not the sufficient half, because:
 *
 *   > A gate that passes because it enumerates nothing is indistinguishable
 *   > from a gate that passes because everything is translated.
 *
 * Three ways to reach a green zero with nothing translated, all of them one
 * edit away and none of them caught by counting violations:
 *
 *   1. delete `supportedLocales` from the `i18n` block — `computeI18nCoverage`
 *      then checks the default locale alone, which every inline label already
 *      satisfies, and reports nothing;
 *   2. delete `translations:` from `defineStack` — same outcome by a different
 *      route, since the locale set falls back to "whatever some bundle covers";
 *   3. a surface stops being WALKED — the app's own metadata still authors the
 *      strings, the extractor no longer produces keys for them, so there is
 *      nothing to be missing. Three dashboards stay English and the gate is
 *      greener than before.
 *
 * The three assertions below are one per failure. LOCALES kills (1) and (2);
 * REACH kills (3); COVERAGE is the violation count HotCRM's gate already had.
 * Only the third of them is the one an author expects to fail day to day, and
 * only the first two make its zero mean anything.
 *
 * ## The instrument
 *
 * `os i18n check --json`, which is the platform's own coverage report — the
 * same walker `os i18n extract` scaffolds from, so the gated surface and the
 * scaffolded surface cannot disagree. Two invocations:
 *
 *   - one with no `--locales`, so the locale set comes from the config and the
 *     report says what this app actually claims to speak (assertions 1 and 3);
 *   - one with `--locales=<PROBE_LOCALE>`, a tag no bundle covers, so every
 *     expected key comes back as missing and the report enumerates the WHOLE
 *     walked surface rather than only its gaps (assertion 2). Without this
 *     second run the walked surface is unobservable once coverage is complete,
 *     which is precisely why (3) above is invisible to a violation counter.
 *
 * ⚠️ NOT `objectstack lint --json --i18n-strict`, though that would work for
 * COVERAGE and is now a real option (the flag ships in @objectstack/cli 17.3.0;
 * HotCRM's script predates it and says such a gate is "out of this repo's
 * reach"). `os i18n check` is preferred because it reports a structured
 * `source` per issue — the surface class — where `os lint` folds that into a
 * rule NAME this script would have to parse back out, and because REACH needs
 * the `--locales` flag that only `os i18n check` exposes.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Locales this app promises. Pinned HERE and not read from the config, on
 * purpose: the thing being asserted is that the config still declares them, so
 * reading the answer out of the config would assert nothing (`supportedLocales:
 * []` would satisfy a check derived from `supportedLocales`).
 *
 * DESIGN.md §01 is the authority for the list being exactly these two.
 */
const REQUIRED_LOCALES = ['en', 'zh-CN'];

/**
 * A tag no bundle covers, used to make the walked surface observable.
 * `zz` is not an assigned ISO 639-1 language, so this can never collide with a
 * locale the app later adds — and if it somehow does, REACH turns into a second
 * COVERAGE check rather than into a false pass.
 */
const PROBE_LOCALE = 'zz-ZZ';

/**
 * The surface classes this app authors strings on, and which must therefore
 * still be reachable. Each is a `CoverageIssue.source` value.
 *
 * The list is CLOSED and hand-maintained, which is the point: it is a claim
 * about what this app has, checked against what the walker finds. Deriving it
 * from the walker would make it agree with the walker by construction and
 * assert nothing — the same mistake as deriving REQUIRED_LOCALES from the
 * config.
 *
 * Measured on `main` @ 0a61743 with `os i18n check --json --locales=zz-ZZ`:
 *
 *     action 82 · app 2 · dashboard 6 · dataset 70 · field 271 · navigation 28
 *     object 34 · option 188 · page 2 · section 35 · view 37 · widget 38
 *
 * The floor is ≥1, not the measured count. What this defends against is a
 * class going to ZERO — the walker stops reaching dashboards, or navigation, or
 * page components — which is a silent, total loss of coverage for that surface.
 * Pinning the exact counts instead would fire on every ordinary field removal
 * and the numbers would be edited down until they meant nothing.
 *
 * ⛔ Three `source` kinds the platform's taxonomy has that are deliberately NOT
 * required here, each for a measured reason rather than by omission:
 *
 *   - `globalAction` — this app authors no object-less actions. All seven
 *     actions carry `objectName` and report as `action`.
 *   - `flow` — the walker SKIPS the `flows` group wholesale. It is on the
 *     spec's author-warned list (`authorWarnedTranslationGroups()` returns
 *     exactly `['flows']` against @objectstack/spec 17.3.0), because no shipped
 *     flow runner reads it yet. Requiring it here would fail this gate forever
 *     over a platform gap. See the PR body for what that costs this app.
 *   - `metadataForm` — the Studio metadata-form baseline, ~773 keys walked from
 *     the platform's own registries. Those translations ship with the platform
 *     packages; `os lint` hides them behind `--include-platform` for that
 *     reason, and this gate excludes them for the same one. An app that
 *     translated them would be re-translating the platform.
 */
const REQUIRED_SURFACES = [
  'object', 'field', 'option', 'section', 'view', 'action',
  'app', 'navigation', 'dashboard', 'widget', 'dataset', 'page',
];

/** Excluded from every assertion — see the `metadataForm` note above. */
const PLATFORM_SOURCE = 'metadataForm';

/** Reads the value following `--fixture` in argv, if present. */
function fixtureArg(argv, flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
}

/**
 * Returns a parsed `os i18n check --json` report — from a real spawn, or
 * (test/ablation seam) from a JSON file on disk.
 *
 * The CLI's exit status is deliberately ignored: `--strict` is not passed, so a
 * non-default-locale gap exits 0, and the PROBE run exits 0 by design. This
 * script's verdict is computed from the report, never inherited from it.
 */
function getCoverageReport(locales, fixture) {
  if (fixture) return JSON.parse(readFileSync(fixture, 'utf8'));

  const args = ['exec', 'objectstack', 'i18n', 'check', '--json'];
  if (locales) args.push(`--locales=${locales}`);

  const result = spawnSync('pnpm', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`failed to spawn \`os i18n check\`: ${result.error.message}`);
  }
  const stdout = (result.stdout ?? '').trim();
  if (!stdout) {
    throw new Error(
      `\`os i18n check --json\` produced no stdout (exit ${result.status}).\n`
      + `stderr:\n${result.stderr ?? '(empty)'}`
    );
  }
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(
      `\`os i18n check --json\` did not print valid JSON: ${err.message}\n`
      + `--- stdout (first 2000 chars) ---\n${stdout.slice(0, 2000)}`
    );
  }
}

/** App-owned issues only. Exported for the unit seam. */
export function appIssues(report) {
  if (!Array.isArray(report?.issues)) {
    throw new Error(
      'coverage report has no `issues` array — the CLI\'s JSON shape may have changed; '
      + `this gate needs updating. Got keys: ${Object.keys(report ?? {}).join(', ') || '(none)'}`
    );
  }
  return report.issues.filter((i) => i.source !== PLATFORM_SOURCE);
}

/** `source` -> count, over app-owned issues. Exported for the unit seam. */
export function countBySource(issues) {
  const counts = {};
  for (const issue of issues) counts[issue.source] = (counts[issue.source] ?? 0) + 1;
  return counts;
}

export function main(argv = process.argv.slice(2), { log = console.log, error = console.error } = {}) {
  let report;
  let probe;
  try {
    report = getCoverageReport(null, fixtureArg(argv, '--fixture'));
    probe = getCoverageReport(PROBE_LOCALE, fixtureArg(argv, '--probe-fixture'));
  } catch (err) {
    error(`✗ i18n gate: ${err.message}`);
    return 1;
  }

  const failures = [];

  // ── 1. LOCALES ──────────────────────────────────────────────────────────
  // The report's locale set is what the coverage numbers are ABOUT. If this
  // app stopped declaring zh-CN, every assertion below would pass vacuously.
  const checked = Array.isArray(report.locales) ? report.locales : [];
  const absent = REQUIRED_LOCALES.filter((l) => !checked.includes(l));
  if (absent.length > 0) {
    failures.push(
      `LOCALES: ${absent.map((l) => `"${l}"`).join(', ')} not among the locales checked `
      + `(checked: ${checked.map((l) => `"${l}"`).join(', ') || 'none'}).\n`
      + '    The coverage report only covers locales the stack declares, so a missing one here '
      + 'means\n    every other number below is about a smaller set than this app promises. Check '
      + '`i18n.supportedLocales`\n    and `translations:` in objectstack.config.ts.'
    );
  }

  // ── 2. REACH ────────────────────────────────────────────────────────────
  // Measured against a locale nothing covers, so the report enumerates the
  // whole walked surface instead of only its gaps.
  let reachCounts = {};
  try {
    reachCounts = countBySource(appIssues(probe));
  } catch (err) {
    failures.push(`REACH: ${err.message}`);
  }
  const unreached = REQUIRED_SURFACES.filter((s) => (reachCounts[s] ?? 0) === 0);
  if (unreached.length > 0) {
    failures.push(
      `REACH: the coverage walk produced no keys at all for ${unreached.map((s) => `\`${s}\``).join(', ')}.\n`
      + '    This app authors strings on those surfaces, so zero keys means they are no longer being\n'
      + '    walked — not that they are translated. Every string on them now renders in the source\n'
      + '    language in every locale, and COVERAGE below cannot see it. Re-measure with:\n'
      + `      pnpm exec objectstack i18n check --json --locales=${PROBE_LOCALE}`
    );
  }

  // ── 3. COVERAGE ─────────────────────────────────────────────────────────
  let gaps = [];
  try {
    gaps = appIssues(report);
  } catch (err) {
    failures.push(`COVERAGE: ${err.message}`);
  }
  if (gaps.length > 0) {
    const lines = gaps.map((i) => `      [${i.locale}] ${i.source.padEnd(10)} ${i.key}\n        ${i.message}`);
    failures.push(
      `COVERAGE: ${gaps.length} missing translation key(s) — must be zero.\n${lines.join('\n')}\n`
      + '    Each of these renders its English source string in the locale named, with no error and\n'
      + '    nothing on screen to say so. Author them in src/translations/<locale>/, or scaffold with:\n'
      + '      pnpm exec objectstack i18n extract --fill=todo'
    );
  }

  if (failures.length > 0) {
    error('✗ i18n gate FAILED\n');
    for (const f of failures) error(`  ${f}\n`);
    return 1;
  }

  const surfaces = REQUIRED_SURFACES.map((s) => `${s}=${reachCounts[s]}`).join(' · ');
  log('✓ i18n gate');
  log(`  LOCALES  : ${checked.map((l) => `"${l}"`).join(', ')} checked (required: ${REQUIRED_LOCALES.join(', ')})`);
  log(`  REACH    : ${REQUIRED_SURFACES.length} surface classes walked — ${surfaces}`);
  log(`  COVERAGE : 0 missing keys across ${report.stats?.length ?? checked.length} locale(s)`);
  log(`             (${report.totals?.expectedKeys ?? '?'} keys expected in total, of which the platform's`);
  log(`             metadata-form baseline is excluded — it ships with @objectstack/*)`);
  return 0;
}

/**
 * True when this module is the process entry point.
 *
 * ⚠️ NOT ``import.meta.url === `file://${process.argv[1]}` ``, the spelling this
 * check is usually written as. That comparison is false for every invocation
 * through a symlinked path AND for any checkout whose path needs
 * percent-encoding — and when it is false the gate runs nothing and exits 0,
 * which is the same green as a passing gate. HotCRM recorded exactly that
 * failure (#1252). Both sides are resolved to a real path here so neither
 * spelling difference can silence the gate.
 */
function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return fileURLToPath(import.meta.url) === entry;
  }
}

/* c8 ignore start -- exercised through the CLI */
if (isMainModule()) {
  process.exit(main());
}
/* c8 ignore stop */
