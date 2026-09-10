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
// admin account is minted and before the first organization is founded —
// re-measured on 17.4.0 (issue #35), one boot with the demo on and
// `--seed-admin` against an empty `.objectstack/data`: the seed's last pass-1
// write landed at 2026-09-09T14:26:53.833Z and the account was created at
// 2026-09-09T14:26:57.396Z, 3.563s later. This IS the interval — it is
// measured here and nowhere else, so there is one place to be wrong.
// Two things follow, and both are silent:
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
import { connect, createServer } from 'node:net';

const DEMO_SEED_ENV_VAR = 'CLM_DEMO_SEED';
const SEED_LOCALE_ENV_VAR = 'OS_SEED_LOCALE';

/**
 * The account name the fixture's `clm_review.reviewer`, `clm_obligation.owner`
 * and `clm_contract.legal_owner` references resolve against.
 *
 * NOT `clm_contract.owner_id`: that one names the three business-requester
 * accounts of DESIGN.md §10, which no seed may create and this script does not
 * mint. It can afford to — `owner_id` is optional, so a name with no account
 * lands NULL and the row survives — where `reviewer` is `required: true` and
 * must name an account that exists while the seed runs. See `src/data/keys.ts`.
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

/**
 * How long the demo boot gets to start listening before the closing note is
 * printed anyway. Generous on purpose: printing the note EARLY is the defect
 * being fixed (issue #49), so the deadline exists only so a boot that never
 * opens its port still ends with the note rather than losing it.
 */
const ANNOUNCE_DEADLINE_MS = 300_000;
/**
 * Quiet gap between the port answering and the note being printed.
 *
 * `os dev` opens the socket and then prints the rest of its banner — the URLs,
 * the dev-admin credentials, the config summary, the boot diagnostics and
 * `Press Ctrl+C to stop`. That tail is 22 lines, and it is the whole reason for
 * a gap: measured on a clean database (17.4.0, this container), `✓ Server is
 * ready` was line 147 and the terminal came to rest at line 169, after which
 * NOTHING was emitted for the 150s the run was held open to check. So the
 * settle only has to outlast a banner tail, and the note lands after that block
 * instead of inside it.
 */
const BANNER_SETTLE_MS = 2_500;

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
 *
 * Returns how long it took, in ms. That number is a MEASUREMENT of what a
 * compile-and-boot costs on this box right now, and the closing note below
 * uses it as its own timescale rather than carrying a guessed constant.
 */
const primeAdminAccount = async () => {
  const startedAt = Date.now();
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
      return Date.now() - startedAt;
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

/**
 * Is something accepting TCP connections on this port right now?
 *
 * Deliberately not an HTTP request: the question is whether the server has
 * reached `listen()`, and every answer an HTTP route could give — 200, 404,
 * 401 — means the same thing here.
 */
const accepting = (port) =>
  new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    const done = (up) => { socket.destroy(); resolve(up); };
    socket.setTimeout(1_000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });

/**
 * The port the demo boot is EXPECTED to bind, resolved the way `os dev`
 * resolves it: `--port` first, then `OS_PORT`, then `PORT`, then 3000
 * (node_modules/@objectstack/cli/dist/commands/dev.js — `flags.port ??
 * readEnvWithDeprecation('OS_PORT', 'PORT')`, defaulting to `'3000'`).
 *
 * ⚠️ EXPECTED, not guaranteed: `os dev` auto-shifts off a busy port (3000 busy
 * → 3001) and only its own banner knows where it landed. That is why the
 * caller treats a port that was ALREADY busy before the boot as no signal at
 * all rather than as readiness — see `announceOperatorSetup`.
 */
const expectedPort = (argv) => {
  const flag = argv.indexOf('--port');
  const inline = argv.find((arg) => arg.startsWith('--port='));
  const raw =
    (flag !== -1 ? argv[flag + 1] : undefined) ??
    (inline ? inline.slice('--port='.length) : undefined) ??
    process.env.OS_PORT ??
    process.env.PORT ??
    '3000';
  const port = Number.parseInt(String(raw).trim(), 10);
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : 3000;
};

/**
 * What the operator has to do next, printed WHERE THE TERMINAL COMES TO REST.
 *
 * ── Why this is not printed inline, above the boot ─────────────────────────
 *
 * It used to be, and that was issue #49. Measured on `main` @ a7b7db5, one
 * clean-database `pnpm demo` captured to a file: the note was line 12, `✓
 * Server is ready` was line 147, and the terminal came to rest at line 169 —
 * the one instruction that decides whether the app has anything in it scrolled
 * 157 lines out of sight, past a wall of author-time warnings, before the
 * terminal stopped moving. The dogfood pass (#45) found the same thing with the
 * seed's per-row errors on screen too. Printing it EARLIER, LOUDER or TWICE
 * does not fix that: anything emitted before the boot finishes is buried by
 * definition.
 *
 * ── Why the child's output is not piped ────────────────────────────────────
 *
 * Reading the boot stream would give an exact "it has stopped printing" signal,
 * and it would cost the thing this note is about. `stdio: 'inherit'` hands the
 * child a real TTY; through a pipe the same boot loses its colour, so the
 * seed's `ERROR` lines would arrive dimmed by the very edit that set out to
 * explain them. The port probe below keeps the boot's own output untouched,
 * byte for byte, and the note lands after it.
 *
 * ── What happens when the probe cannot see the boot ────────────────────────
 *
 * Two cases, and both degrade to the OLD behaviour (a note printed mid-stream),
 * never to a lost note:
 *
 *   · the port was already busy before the boot — `os dev` will auto-shift and
 *     the socket that answers is somebody else's, so readiness is unknowable.
 *     The note waits one priming-boot's worth of time instead, that being a
 *     measurement of what a compile-and-boot costs on this box today.
 *   · nothing ever listens — `ANNOUNCE_DEADLINE_MS` fires and the note prints.
 *
 * A boot that DIES is the one case with no note at all: `os dev` has already
 * said why on its way out, and an instruction about accounts to create would
 * be the loudest thing on a failed screen.
 *
 * ── What the ready banner does NOT settle, and why the note says so ────────
 *
 * The banner is where the BOOT comes to rest, and on a first boot that is not
 * always where the SEED does. Measured on this branch, one clean-database run
 * on a contended box: the inline seed overran its 8000ms budget, the boot
 * carried on and printed `⚠ Boot diagnostics … WARN [Seeder] … continuing in
 * background`, the banner and this note landed at 07:03:48, and the seed's 120
 * `ERROR [SeedLoader]` lines arrived from that background continuation at
 * 07:05:09 — 82 seconds AFTER the note. The same command on `main`, held open
 * for 150s past its banner, never emitted them at all, while its database held
 * the same 820 seeded rows. Same code, same fixture, two different clocks.
 *
 * Nothing this script can observe distinguishes those cases: the WARN, the
 * errors and the loader's summary are all in the child's inherited stream. So
 * the note does not claim the errors are above it. It says which clock puts
 * them above and which puts them below, and it is the frame either way —
 * ⛔ never printed twice to cover both.
 *
 * ⛔ SHAPE, never a census: no error-line count, no row totals, nothing quoted
 * from the loader's summary. Dealing owners differently or seeding differently
 * moves such a number, no gate reads printed prose, and it reads as a promise.
 */
const OPERATOR_SETUP_NOTE = [
  '',
  '  ────────────────────────────────────────────────────────────────────────',
  '   Before you open the app — one setup step, and one thing about the log',
  '  ────────────────────────────────────────────────────────────────────────',
  '',
  '  1. The seeded contracts have no owner yet. Every contract is launched by',
  '     one of the three business requesters DESIGN.md §10 asks you to create,',
  '     and no seed may create a user (§10) — so until those accounts exist,',
  '     `owner_id` is NULL on every contract row and 我的合同 stays empty. Add',
  '     them in Setup → Users and run this again; the README names them and',
  '     says who gets what.',
  '',
  '  2. The `ERROR [SeedLoader]` lines are that same missing owner: one per',
  '     contract whose requester account does not exist yet, expected on a',
  '     first boot, and nothing is lost to them. The loader defers `owner_id`,',
  '     finds no such account on its last pass, writes the row anyway and',
  '     leaves that one column NULL — every seeded row is in the database and',
  '     only its owner is missing. Step 1 is what fills it in.',
  '',
  '     The loader then signs off with a summary that counts those rows as',
  '     dropped while they sit in the database: its own accounting, not the',
  '     state of your data, and upstream as objectstack#17177. And where those',
  '     lines fall relative to this note is a clock, not a verdict — above it',
  '     when the seed finished inside its inline budget, up to a couple of',
  '     minutes below it when the boot said `WARN [Seeder] … continuing in',
  '     background`.',
  '',
];

const announceOperatorSetup = async (child, port, blindWaitMs) => {
  const alive = () => child.exitCode === null && child.signalCode === null;
  const deadline = Date.now() + ANNOUNCE_DEADLINE_MS;

  if (blindWaitMs !== null) {
    await sleep(blindWaitMs);
  } else {
    while (Date.now() < deadline) {
      if (!alive()) return;
      if (await accepting(port)) {
        await sleep(BANNER_SETTLE_MS);
        break;
      }
      await sleep(1_000);
    }
  }

  if (!alive()) return;
  for (const line of OPERATOR_SETUP_NOTE) console.log(line);
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
  return child;
};

const locale = (process.env[SEED_LOCALE_ENV_VAR] ?? '').trim() || 'en (default)';
console.log('');
console.log(`  HotCLM demo — two steps, then the server is yours. Locale: ${locale}`);
console.log('');
console.log('  1/2  preparing an admin account and the organization (quiet, a few seconds)…');
const primingMs = await primeAdminAccount();
console.log('  1/2  done — admin account ready.');
console.log('  2/2  starting HotCLM with the demo group loaded…');
console.log('');

// The demo boot owns the terminal from here to the ready banner. The one thing
// about this fixture an evaluator cannot see from the app — that every contract
// names a business-requester account no seed may create (DESIGN.md §10), so
// every `owner_id` lands NULL in silence — is said AFTER that banner, by
// `announceOperatorSetup`, because said here it is 160 lines from the bottom of
// the screen (issue #49).
const port = expectedPort(process.argv.slice(2));
const portWasBusy = await accepting(port);
const demo = startDemo();

// Not awaited: `startDemo` hands back a foreground server that only ends on
// Ctrl+C, and its own `exit` handler is what ends this process. This promise
// races the boot, prints once, and resolves.
void announceOperatorSetup(
  demo,
  port,
  // A port that already answered before the boot started tells us nothing
  // about the boot (`os dev` will auto-shift off it), so fall back to the
  // timescale the priming boot just measured on this box.
  portWasBusy ? Math.min(Math.max(primingMs, 20_000), 180_000) : null,
);
