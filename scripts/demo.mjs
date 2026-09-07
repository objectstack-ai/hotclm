#!/usr/bin/env node
// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// `pnpm demo` — start HotCLM with the demo group loaded, in ONE command, on a
// clean checkout.
//
// ── Why this is a script and not `objectstack dev` with a flag ─────────────
//
// The demo dataset is opt-in and off by default (see src/data/index.ts for the
// product reasoning). Turning it on is one environment variable. On a database
// that already holds an account, that is genuinely all it takes.
//
// On a BRAND-NEW database it is not, and the reason is an ordering fact that
// was measured rather than assumed. The declarative seed runs BEFORE the dev
// admin account is minted and before the first organization is founded — on
// 17.3.0, the seed's last write landed at 18:59:54.118Z and the account was
// created at 18:59:54.931Z. Two things follow, and both are silent:
//
//   1. `clm_review.reviewer` is `required: true` and resolves against
//      `sys_user.name`. On a first boot the name matches nothing, the loader
//      defers the column to pass 2, and the engine refuses the row:
//      "Failed to write clm_review record #1: Reviewer is required". All 60
//      reviews are lost and the seed still reports success for everything else.
//   2. Rows written before the organization exists carry `organization_id:
//      null`, which is not what an org-scoped deployment expects of its data.
//
// DESIGN.md §10 forbids seeding users, so the fixture cannot supply the
// account itself. What this script does instead is sequence the two boots the
// evaluator would otherwise have to know about: once with the demo OFF, which
// mints the admin and founds the organization, then again with it ON. The
// first boot is quiet. The handover between them is VERIFIED — a real sign-in
// against the priming server — because the failure being guarded against is a
// seeded database with sixty missing reviews, which looks exactly like a
// working one.
//
// Measured on the same database: 13 ok / 4 errors on the first boot became
// 14 ok / 2 errors on the second, the difference being the review row that
// could finally resolve its reviewer.
//
// ── Why both boots pass `--compile` ────────────────────────────────────────
//
// The seed is baked into `dist/objectstack.json` at compile time, and `os dev`
// reuses an existing artifact rather than recompiling it (`--compile` defaults
// to false; it auto-compiles only when the artifact is MISSING). Without
// `--compile` the second boot would serve the artifact the priming boot just
// built — the one with no seed — and `pnpm demo` would print success and show
// an empty app.
//
// ── The language the demo is written in ────────────────────────────────────
//
// `OS_SEED_LOCALE` (unset = English, `zh-CN` = Chinese) chooses the fixture's
// language, and `pnpm demo:zh` is `pnpm demo` with it set. It reaches BOTH
// boots: the priming one so an unspellable value is refused before anything is
// written, and the demo one because the fixture is baked into the artifact
// that boot compiles.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const DEMO_SEED_ENV_VAR = 'CLM_DEMO_SEED';
const SEED_LOCALE_ENV_VAR = 'OS_SEED_LOCALE';

/**
 * The account name the fixture's `clm_review.reviewer`, `clm_obligation.owner`
 * and `clm_contract.legal_owner` references resolve against.
 *
 * ⚠️ This MIRRORS `DEMO_USER` in `src/data/keys.ts`. They have to agree, and
 * they cannot be one constant: this file is plain `.mjs` that runs before
 * anything is compiled, and that one is TypeScript baked into the artifact.
 * The check below is what keeps a drift from being silent — a fixture pointed
 * at a name no account carries loses every row that references it, and the
 * seed reports success for the rest.
 */
const DEMO_USER = 'Dev Admin';

// The same credentials and env overrides `@objectstack/plugin-auth` itself
// reads, so an operator who has changed them is not silently probed for an
// account that was never going to exist.
const ADMIN_EMAIL = process.env.OS_SEED_ADMIN_EMAIL?.trim() || 'admin@objectos.ai';
const ADMIN_PASSWORD = process.env.OS_SEED_ADMIN_PASSWORD?.trim() || 'admin123';

/** How long the priming boot gets to come up and mint the admin. */
const PRIMING_TIMEOUT_MS = 180_000;
/** How long a SIGTERM gets to bring the priming boot down before SIGKILL. */
const SHUTDOWN_GRACE_MS = 10_000;
/** Tail of the priming boot's output kept for the failure path. */
const LOG_TAIL_LINES = 40;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A port the priming server can have to itself.
 *
 * It must not land on the port the demo is about to run on, and it must not
 * collide with whatever else is listening — so it asks the OS for a free one
 * rather than guessing. `os dev` auto-shifts off a busy port, which would
 * leave the sign-in probe below talking to nothing.
 */
const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

/**
 * The handover check: can you actually log in yet?
 *
 * Not "did the server start" and not "did a line appear in the log" — the
 * whole point of the priming boot is a loginable account whose name the
 * fixture can resolve, so that is what is asserted. `localhost` (not
 * `127.0.0.1`) with a matching `Origin`: dev trusts `http://localhost:*` and
 * better-auth rejects anything else with 403 INVALID_ORIGIN.
 */
const signIn = async (port) => {
  const origin = `http://localhost:${port}`;
  try {
    const response = await fetch(`${origin}/api/v1/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status !== 200) return null;
    const body = await response.json().catch(() => ({}));
    const user = body?.user ?? {};
    return { name: typeof user.name === 'string' ? user.name : null };
  } catch {
    // Not up yet, or up and not answering. Either way: not ready.
    return null;
  }
};

const fail = (headline, detail, log) => {
  console.error('');
  console.error(`❌  pnpm demo failed — ${headline}`);
  console.error('');
  for (const line of detail) console.error(`   ${line}`);
  if (log.length) {
    console.error('');
    console.error(`   Last ${Math.min(log.length, LOG_TAIL_LINES)} lines of the priming boot:`);
    console.error('');
    for (const line of log.slice(-LOG_TAIL_LINES)) console.error(`   | ${line}`);
  }
  console.error('');
  process.exit(1);
};

/**
 * Boot once with the demo OFF, wait until the dev admin can sign in, stop.
 *
 * Idempotent: on a database that already has an account this boot mints
 * nothing, the first probe succeeds, and it costs one short boot.
 */
const primeAdminAccount = async () => {
  const port = await freePort();

  // Deleted rather than set to a falsy string: this must be off regardless of
  // how the gate spells "off" and regardless of what the operator exported.
  //
  // ⚠️ ONLY the seed gate is deleted. `OS_SEED_LOCALE` is passed straight
  // through, so an unspellable locale is refused HERE — in the quiet boot,
  // before anything has been written — rather than after the priming step has
  // reported success.
  const env = { ...process.env };
  delete env[DEMO_SEED_ENV_VAR];

  const child = spawn('objectstack', ['dev', '--compile', '--seed-admin', '--port', String(port)], {
    env,
    // Quiet, but kept: nothing is printed unless the sequence fails, and then
    // all of it is.
    stdio: ['ignore', 'pipe', 'pipe'],
    // Its own process group, so the whole tree goes down with it. `os dev`
    // spawns a `serve` child; signalling only the parent orphans the server
    // and leaves it holding the port and the database.
    detached: true,
  });

  const log = [];
  const collect = (chunk) => {
    for (const line of String(chunk).split('\n')) if (line.trim()) log.push(line.trimEnd());
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  let exited = null;
  child.once('exit', (code, signal) => { exited = { code, signal }; });
  child.once('error', (error) => { exited = { code: null, signal: null, error }; });

  const stop = async () => {
    if (exited) return;
    const down = new Promise((resolve) => child.once('exit', resolve));
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
    let settled = false;
    await Promise.race([down.then(() => { settled = true; }), sleep(SHUTDOWN_GRACE_MS)]);
    if (settled) return;
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
    await Promise.race([down, sleep(2_000)]);
  };

  const deadline = Date.now() + PRIMING_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited) {
      fail(
        'the preparation step exited before an admin account existed.',
        [
          exited.error
            ? `Could not start \`objectstack dev\`: ${exited.error.message}`
            : `\`objectstack dev\` exited with ${exited.signal ? `signal ${exited.signal}` : `code ${exited.code}`}.`,
          'Nothing was seeded. Fix the error above and run `pnpm demo` again.',
        ],
        log,
      );
    }
    const session = await signIn(port);
    if (session) {
      // Stop the priming server FIRST: it is detached and holding the
      // database, so exiting around it would orphan a server nobody can see.
      await stop();
      if (session.name !== DEMO_USER) {
        fail(
          `the account you log in as is named ${JSON.stringify(session.name)}, not ${JSON.stringify(DEMO_USER)}.`,
          [
            'The demo fixture resolves `clm_review.reviewer`, `clm_obligation.owner` and',
            `\`clm_contract.legal_owner\` against a \`sys_user\` named ${JSON.stringify(DEMO_USER)}.`,
            'Against any other name those references resolve to nothing, and every',
            'review row is refused while the rest of the seed reports success — so',
            'nothing was seeded and the database is exactly as it was.',
            '',
            'Start over on a clean database:',
            '',
            '    rm -rf .objectstack/data && pnpm demo',
          ],
          log,
        );
      }
      return;
    }
    await sleep(1_000);
  }

  await stop();
  fail(
    `no account could sign in after ${PRIMING_TIMEOUT_MS / 1000}s, so the demo was NOT loaded.`,
    [
      `Expected \`${ADMIN_EMAIL}\` to be loginable after the preparation boot.`,
      '',
      'The most likely cause is a database that already holds accounts from an',
      'earlier run, which stops a fresh dev admin from being created. Start over:',
      '',
      '    rm -rf .objectstack/data && pnpm demo',
      '',
      'Nothing was seeded by this run — the database is exactly as it was.',
    ],
    log,
  );
};

/** Boot with the demo ON, in the foreground. This is the server you keep. */
const startDemo = () => {
  // Extra arguments are forwarded, so `pnpm demo -- --port 4000` works.
  const passthrough = process.argv.slice(2);
  const child = spawn('objectstack', ['dev', '--compile', '--ui', '--seed-admin', ...passthrough], {
    env: {
      ...process.env,
      [DEMO_SEED_ENV_VAR]: '1',
      ...(process.env[SEED_LOCALE_ENV_VAR] === undefined
        ? {}
        : { [SEED_LOCALE_ENV_VAR]: process.env[SEED_LOCALE_ENV_VAR] }),
    },
    // Inherited, and NOT detached: the demo server shares this terminal's
    // process group so Ctrl+C reaches it the way it would `pnpm dev`.
    stdio: 'inherit',
  });
  child.once('error', (error) => {
    fail('the demo server could not be started.', [error.message], []);
  });
  child.once('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 0));
  });
};

const locale = (process.env[SEED_LOCALE_ENV_VAR] ?? '').trim() || 'en (default)';
console.log('');
console.log(`  HotCLM demo — two steps, then the server is yours. Locale: ${locale}`);
console.log('');
console.log('  1/2  preparing an admin account and the organization (quiet, a few seconds)…');
await primeAdminAccount();
console.log('  1/2  done — admin account ready.');
console.log('  2/2  starting HotCLM with the demo group loaded…');
console.log('');
startDemo();
