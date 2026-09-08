#!/usr/bin/env node
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * One-shot ablation harness for `pnpm lint:i18n-gate` (card 11 / issue #32).
 *
 * NOT a committed test. This file exists to produce the evidence the card asks
 * for — that the gate FAILS, and fails once per surface class — and is deleted
 * in the same PR that adds it. The gate's own assertions are what ship.
 *
 * Usage: node scripts/ablate-i18n-gate.mjs
 *
 * ## Why the restore is written the way it is
 *
 * Three failure modes, each of which has silently produced a green ablation on
 * this repo's sibling in the last two cards, and each of which is defended
 * against here rather than trusted:
 *
 *   1. **A restore that exits 0 without doing anything.** `git checkout HEAD --
 *      <path>` is a no-op on an untracked file and exits 0. Every file this
 *      harness touches is therefore asserted to be TRACKED before it is
 *      touched, and the restore is verified by HASHING THE FILE, never by
 *      reading an exit code.
 *   2. **A `trap`/`finally` that fires on normal exit and is read as proof.**
 *      The `finally` below runs on every path, success included, so its running
 *      proves nothing at all. The proof is the hash comparison it performs.
 *   3. **A mutation that never reached disk.** A find/replace that matches
 *      nothing exits 0 too. Every mutation asserts the file's hash CHANGED
 *      before the gate is run — an unchanged file means the ablation did not
 *      happen and the run is void, not passing.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);

/** The blob git has at HEAD for this path. Empty/absent => the file is untracked. */
function headBlobHash(rel) {
  const out = execFileSync('git', ['rev-parse', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!out) throw new Error(`FATAL: no HEAD blob for ${rel} — the file is untracked, so no restore is possible.`);
  return out;
}

function gitTracked(rel) {
  const r = spawnSync('git', ['ls-files', '--error-unmatch', rel], { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0;
}

function runGate() {
  const r = spawnSync('pnpm', ['exec', 'node', 'scripts/check-lint-i18n-gate.mjs'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/**
 * Delete one key from a bundle file, run the gate, restore, verify the restore.
 *
 * Addressed by LINE NUMBER with the line's content asserted, not by a string
 * search: several of these values are legitimately repeated in the bundle
 * (`label: '合同'` is the contract object, a related-list title and the page
 * label), and a search-and-replace that hits the wrong one of the three would
 * still turn the gate red — for a key this harness did not name, which is a
 * false pass dressed as a proof.
 *
 * `expectKey` is the coverage key the gate must NAME in its failure output, not
 * merely fail on.
 */
function ablate({ surface, rel, line, content, span = 1, expectKey }) {
  const abs = path.join(ROOT, rel);

  if (!gitTracked(rel)) throw new Error(`FATAL: ${rel} is not tracked by git — refusing to mutate it.`);
  const headHash = headBlobHash(rel);
  const before = readFileSync(abs, 'utf8');
  const beforeSha = sha(abs);

  let verdict;
  try {
    // ── mutate ──
    const lines = before.split('\n');
    const actual = lines.slice(line - 1, line - 1 + span).join('\n');
    if (actual !== content) {
      throw new Error(
        `FATAL: ${rel}:${line} is not the line this ablation targets — the harness is stale.\n`
        + `    expected: ${content}\n    actual:   ${actual}`
      );
    }
    lines.splice(line - 1, span);
    writeFileSync(abs, lines.join('\n'), 'utf8');

    // ── prove the mutation reached disk ──
    const mutatedSha = sha(abs);
    if (mutatedSha === beforeSha) {
      throw new Error(`FATAL: ${rel} is byte-identical after the edit — the ablation did not happen.`);
    }
    if (readFileSync(abs, 'utf8').split('\n').slice(line - 1, line - 1 + span).join('\n') === content) {
      throw new Error(`FATAL: the deleted line is still at ${rel}:${line}.`);
    }

    // ── measure ──
    const gate = runGate();
    const named = gate.out.includes(expectKey);
    verdict = {
      surface,
      key: expectKey,
      exit: gate.status,
      failed: gate.status !== 0,
      namesKey: named,
      shaBefore: beforeSha,
      shaMutated: mutatedSha,
      gateLine: (gate.out.split('\n').find((l) => l.includes(expectKey)) ?? '(key NOT named in gate output)').trim(),
    };
  } finally {
    // ── restore, then PROVE the restore by hashing. The `finally` running is
    //    not the proof; it runs on the success path too.
    writeFileSync(abs, before, 'utf8');
    const restoredSha = sha(abs);
    const restoredBlob = execFileSync('git', ['hash-object', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (restoredSha !== beforeSha) {
      throw new Error(`FATAL: ${rel} not restored — sha ${restoredSha} != ${beforeSha}`);
    }
    if (!restoredBlob || restoredBlob !== headHash) {
      throw new Error(`FATAL: ${rel} blob ${restoredBlob || '(empty)'} != HEAD blob ${headHash}`);
    }
    process.stdout.write(`    restore verified: ${rel} blob ${restoredBlob.slice(0, 12)} == HEAD blob\n`);
  }
  return verdict;
}

// One ablation per surface class the gate claims to reach. The five the card
// names — navigation items, view names, page tabs, action labels, dashboard
// widget titles — are marked; the other seven are here because "at minimum"
// was the floor, not the target.
const C = 'src/translations/zh-CN/objects.contract.ts';
const A = 'src/translations/zh-CN/app.ts';

const ABLATIONS = [
  { surface: 'object',     rel: C, line:  16, content: "    label: '合同',",                      expectKey: 'objects.clm_contract.label' },
  { surface: 'field',      rel: C, line: 135, content: "        label: '合同金额',",              expectKey: 'objects.clm_contract.fields.amount.label' },
  { surface: 'option',     rel: C, line:  66, content: "          signing: '签署中',",            expectKey: 'objects.clm_contract.fields.status.options.signing' },
  { surface: 'section',    rel: C, line: 480, content: "        label: '商务条款',",              expectKey: 'objects.clm_contract._sections.commercial.label' },
  { surface: 'view',       rel: C, line: 448, content: "        label: '状态看板',",              expectKey: 'objects.clm_contract._views.status_kanban.label' },
  { surface: 'action',     rel: C, line: 415, content: "        label: '发起签署',",              expectKey: 'objects.clm_contract._actions.start_signing.label' },
  { surface: 'app',        rel: A, line:  23, content: "      description: '合同全生命周期管理 —— 发起、审查、审批、执行、履约与归档。',", expectKey: 'apps.clm.description' },
  // ⚠️ The whole ENTRY, not just its `label` line. `apps.<app>.navigation.<id>.label`
  // is one of only two non-optional string leaves in `TranslationData`, so an entry
  // with the label removed fails `defineStack` outright — a louder failure than the
  // coverage gap this ablation is meant to demonstrate, and a different one.
  { surface: 'navigation', rel: A, span: 3, line: 34, content: "        nav_my_approvals: {\n          label: '待我处理',\n        },", expectKey: 'apps.clm.navigation.nav_my_approvals.label' },
  { surface: 'dashboard',  rel: A, line: 178, content: "      label: '法务工作台',",              expectKey: 'dashboards.legal_workbench.label' },
  { surface: 'widget',     rel: A, line: 122, content: "          title: '90 天内到期',",         expectKey: 'dashboards.executive_overview.widgets.expiring_90_days.title' },
  { surface: 'dataset',    rel: A, line: 267, content: "          label: '合同额',",              expectKey: 'datasets.contract_metrics.measures.total_amount.label' },
  { surface: 'page',       rel: A, line: 430, content: "      label: '合同',",                    expectKey: 'pages.contract_detail.label' },
];


const results = [];
for (const a of ABLATIONS) {
  process.stdout.write(`\n── ablating ${a.surface}: ${a.expectKey}\n`);
  results.push(ablate(a));
}

process.stdout.write('\n\n=== ABLATION MATRIX ===\n');
process.stdout.write('surface     exit  failed  names-key  gate line\n');
for (const r of results) {
  process.stdout.write(
    `${r.surface.padEnd(11)} ${String(r.exit).padEnd(5)} ${String(r.failed).padEnd(7)} ${String(r.namesKey).padEnd(10)} ${r.gateLine.slice(0, 88)}\n`
  );
}
const bad = results.filter((r) => !r.failed || !r.namesKey);
process.stdout.write(`\n${results.length - bad.length}/${results.length} surfaces: gate went RED and NAMED the deleted key.\n`);
if (bad.length > 0) {
  process.stdout.write(`⛔ NOT PROVEN for: ${bad.map((r) => r.surface).join(', ')}\n`);
}
process.exit(bad.length === 0 ? 0 : 1);
