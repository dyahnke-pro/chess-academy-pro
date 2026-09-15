/**
 * audit-tactic-type-backfill-prod — proves N0 (unified-coach plan, 2026-09-15)
 * actually FIRES on a real device: persisted tactic rows behind
 * `TACTIC_TYPE_REV` are re-tagged through the ONE unified classifier on boot.
 *
 * WHY A PROD PROBE. `tacticTypeBackfill.test.ts` proves the function; this
 * proves the WIRE — that `runSeedOnce` reaches `reconcileTacticTypes` on the
 * live bundle, that Dexie rows written by the OLD classifier get re-tagged,
 * and that the `coach-surface-migrated` audit is emitted. A wire that does not
 * fire is not a wire (David 2026-08-07).
 *
 * Instruments (G1): Playwright drives boot + reload; the app's own audit
 * events are captured at emission off the (locally fulfilled) audit-stream
 * route; the narration listener sidecar is attached for parity even though a
 * backfill speaks nothing — silence there is the CONTRACT, asserted.
 *
 * Three seeded rows, three contracts:
 *   fork-row      — old tag 'skewer' on a real knight fork  → re-tagged 'fork'
 *   positional    — `positionalMotif` set, tacticType null  → stays null, rev stamped
 *   no-inputs     — illegal bestMove                        → tag KEPT, flagged
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-tactic-type-backfill-prod.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { enableAuditCapture } from './audit-lib/enable-audit-capture.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const REV = '2026-09-15-unified-classifier';
// Knight fork: Nd3-e5 attacks the king on d7 and the rook on c6 (the unit
// test's fixture — computed 'fork' by the unified classifier).
const FORK_FEN = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1';

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const baseRow = (id, extra) => ({
  id,
  fen: FORK_FEN,
  playerMove: 'd3c5', playerMoveSan: 'Nc5',
  bestMove: 'd3e5', bestMoveSan: 'Ne5',
  moves: 'd3e5 d7d6 e5c6',
  cpLoss: 320, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40,
  sourceGameId: 'audit-n0-game', sourceMode: 'analysis', playerColor: 'white',
  promptText: 'White to play', narration: { hint: '', explanation: '' },
  createdAt: new Date('2026-09-01T00:00:00Z').toISOString(),
  opponentName: null, gameDate: null, openingName: null, evalBefore: 20,
  srsInterval: 1, srsEaseFactor: 2.5, srsRepetitions: 0,
  srsDueDate: new Date().toISOString(), srsLastReview: null,
  status: 'new', attempts: 0, successes: 0,
  ...extra,
});

const SEED = [
  baseRow('audit-n0-fork', { tacticType: 'skewer' }),                       // wrong old tag
  baseRow('audit-n0-positional', { tacticType: null, positionalMotif: 'exchange-sacrifice' }),
  baseRow('audit-n0-noinputs', { tacticType: 'pin', bestMove: 'zz99' }),    // illegal input
];

function idb(page, fn, arg) {
  return page.evaluate(async ({ src, arg }) => {
    // eslint-disable-next-line no-new-func
    const f = new Function('arg', `return (${src})(arg)`);
    return f(arg);
  }, { src: fn.toString(), arg });
}

const seedRows = (rows) => new Promise((resolve) => {
  const done = (v) => resolve(v);
  setTimeout(() => done({ ok: false, reason: 'open-timeout' }), 15000);
  const req = indexedDB.open('ChessAcademyDB');
  req.onerror = () => done({ ok: false, reason: 'open-error' });
  req.onsuccess = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('mistakePuzzles')) { db.close(); return done({ ok: false, reason: 'no-store' }); }
    const tx = db.transaction('mistakePuzzles', 'readwrite');
    const store = tx.objectStore('mistakePuzzles');
    for (const r of rows) store.put(r);
    tx.oncomplete = () => { db.close(); done({ ok: true, wrote: rows.length }); };
    tx.onerror = () => { db.close(); done({ ok: false, reason: 'tx-error' }); };
  };
});

const readRows = (ids) => new Promise((resolve) => {
  setTimeout(() => resolve({ ok: false, reason: 'open-timeout' }), 15000);
  const req = indexedDB.open('ChessAcademyDB');
  req.onerror = () => resolve({ ok: false, reason: 'open-error' });
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('mistakePuzzles', 'readonly');
    const store = tx.objectStore('mistakePuzzles');
    const out = {};
    for (const id of ids) { const g = store.get(id); g.onsuccess = () => { out[id] = g.result ?? null; }; }
    tx.oncomplete = () => { db.close(); resolve({ ok: true, rows: out }); };
    tx.onerror = () => { db.close(); resolve({ ok: false, reason: 'tx-error' }); };
  };
});

async function main() {
  const listener = await startAuditListener();
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);          // audits never spend TTS money (G1)
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(enableAuditCapture);
  const page = await ctx.newPage();

  const streamEvents = [];
  await page.route('**/api/audit-stream**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      try {
        const parsed = JSON.parse(req.postData() || '');
        for (const e of (Array.isArray(parsed) ? parsed : parsed.events || [parsed])) streamEvents.push(e);
      } catch { /* ignore */ }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // Boot 1: let the app create the DB + run its FULL seed. The reconcile
  // branch of runSeedOnce (where the backfill lives) only runs on an
  // already-seeded device — exactly the device that has old rows — so the
  // probe must wait for the seed key (`db_seeded_v12`) before it reloads, or
  // boot 2 re-enters the first-install branch and the wire is never reached.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const seededAt = Date.now();
  let seedKey = false;
  let hasSchema = false;
  while (Date.now() - seededAt < 120000) {
    const probe = await idb(page, () => new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve({ schema: false, seeded: false });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('meta')) { db.close(); return resolve({ schema: false, seeded: false }); }
        const g = db.transaction('meta', 'readonly').objectStore('meta').get('db_seeded_v12');
        g.onsuccess = () => { db.close(); resolve({ schema: true, seeded: g.result?.value === 'true' }); };
        g.onerror = () => { db.close(); resolve({ schema: true, seeded: false }); };
      };
    }), null);
    hasSchema = probe.schema;
    seedKey = probe.seeded;
    if (seedKey) break;
    // Vacuity guard: the real app creates its Dexie schema within seconds of
    // boot. No `meta` store after 20s means there is no app here — fail fast
    // instead of waiting out the seed budget (the vacuity control's 90s cap).
    if (!hasSchema && Date.now() - seededAt > 20000) break;
    await page.waitForTimeout(3000);
  }
  record('app created its Dexie schema (meta store present)', hasSchema, hasSchema ? 'present' : 'ABSENT — no app booted');
  record('device fully seeded (db_seeded_v12) before the probe reload', seedKey, `${Math.round((Date.now() - seededAt) / 1000)}s`);
  if (!hasSchema || !seedKey) {
    await browser.close(); await listener.stop();
    console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed — aborted: the app never seeded`);
    process.exit(1);
  }

  // Seed rows the OLD classifier "wrote" (no tacticTypeRev).
  const seeded = await idb(page, seedRows, SEED);
  record('seeded three stale-tagged rows into mistakePuzzles', seeded.ok === true, JSON.stringify(seeded));
  if (!seeded.ok) throw new Error('seed failed — cannot probe the wire');

  // Sanity: before reload they are untouched (the reconcile ran BEFORE our seed).
  const before = await idb(page, readRows, SEED.map((r) => r.id));
  record('rows untouched before reload (probe is not vacuous)',
    before.ok && before.rows['audit-n0-fork']?.tacticType === 'skewer' && !before.rows['audit-n0-fork']?.tacticTypeRev,
    `fork.tacticType=${before.rows?.['audit-n0-fork']?.tacticType} rev=${before.rows?.['audit-n0-fork']?.tacticTypeRev ?? 'none'}`);

  // Boot 2: the backfill runs inside runSeedOnce on every boot.
  streamEvents.length = 0;
  const listenerStart = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(20000);

  const after = await idb(page, readRows, SEED.map((r) => r.id));
  const fork = after.rows?.['audit-n0-fork'];
  const pos = after.rows?.['audit-n0-positional'];
  const bad = after.rows?.['audit-n0-noinputs'];

  record('fork row re-tagged skewer → fork through the unified classifier',
    fork?.tacticType === 'fork' && fork?.tacticTypeRev === REV && fork?.tacticTypeFlag === null,
    `tacticType=${fork?.tacticType} rev=${fork?.tacticTypeRev} flag=${fork?.tacticTypeFlag}`);
  record('positional row stays null-by-design, rev stamped',
    pos?.tacticType === null && pos?.tacticTypeRev === REV,
    `tacticType=${pos?.tacticType} rev=${pos?.tacticTypeRev}`);
  record('no-inputs row keeps its tag and is flagged, never guessed',
    bad?.tacticType === 'pin' && bad?.tacticTypeRev === REV && bad?.tacticTypeFlag === 'no-inputs',
    `tacticType=${bad?.tacticType} rev=${bad?.tacticTypeRev} flag=${bad?.tacticTypeFlag}`);

  const migrated = streamEvents.find((e) => e?.kind === 'coach-surface-migrated' && /tacticType re-tagged/.test(e?.summary ?? ''));
  record('coach-surface-migrated audit emitted with counts',
    !!migrated && /3 recomputed, 1 changed, 1 null-by-design, 1 flagged/.test(migrated.summary),
    migrated ? migrated.summary : `not found (stream events=${streamEvents.length})`);

  // Idempotence: a third boot writes nothing — no migration event.
  streamEvents.length = 0;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  const again = streamEvents.find((e) => e?.kind === 'coach-surface-migrated' && /tacticType re-tagged/.test(e?.summary ?? ''));
  record('idempotent: no re-tag event on the next boot', !again, again ? again.summary : 'silent');

  // Voice contract: a backfill speaks nothing.
  const spoken = listener.getCapturedEvents().filter((e) => e.kind === 'coach-narration-spoken' && (e.timestamp ?? 0) >= listenerStart);
  record('backfill spoke nothing (listener silent)', spoken.length === 0, `spoken=${spoken.length}`);
  record('no pageerrors across three boots', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'clean');

  // Cleanup our rows so the next audit on this profile sees a real device.
  await idb(page, (ids) => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => { const db = req.result; const tx = db.transaction('mistakePuzzles', 'readwrite'); for (const id of ids) tx.objectStore('mistakePuzzles').delete(id); tx.oncomplete = () => { db.close(); resolve(true); }; };
    req.onerror = () => resolve(false);
  }), SEED.map((r) => r.id));

  await browser.close();
  await listener.stop();

  const passed = results.filter((r) => r.pass).length;
  const dir = `audit-reports/tactic-type-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, results, streamEventCount: streamEvents.length }, null, 2));
  console.log(`\n${passed}/${results.length} passed — ${dir}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error('FATAL', err); process.exit(2); });
