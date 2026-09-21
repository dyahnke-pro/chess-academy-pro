/**
 * THE LOOP, IN THE GREEN DIRECTION — does the coach go QUIET about something
 * the student has proven?
 *
 * `audit-loop-closes-prod` proves the RED half on prod: a mistake in game A
 * changes what the coach says in game B. GREEN is the other half of the heat
 * map and has never been shown to fire on a device. Everything for it is
 * built — `capabilityEvidence` records holds, `getCapabilityProfile` reads
 * them, `needScore.capabilityTerm` is the one term that can LOWER need — and
 * "built and gated in isolation" is exactly what the red half looked like
 * before its own instrument found five real defects.
 *
 * THE SHAPE, three devices on ONE real game, so the only variable is the
 * student's record:
 * 🔴 UPDATED 2026-09-21 — THE METRIC CHANGED, AND THE OLD ONE IS WITHDRAWN.
 * This audit measured WORD COUNT and twice reported RUN UNUSABLE: green moved
 * 16 words against a 592-word between-run variance. The board concluded the
 * review arm "proves nothing either way and should not be re-run". That was
 * right about the word count and too broad as a verdict on the surface. Review
 * is `walk` posture so a lowering term cannot SILENCE a ply here — but the
 * term is still COMPUTED, and `coach-need-scores` already emits it per term.
 * So the wire is now read as a SIGN, deterministically, with no noise floor:
 * inert on control, negative on green, inert again on prompted. What still
 * needs an `interrupt` surface is the BEHAVIOUR — a ply that would have spoken
 * going quiet — and that is a separate measurement, not this one.
 *
 *   CONTROL   — fresh device. Whatever the coach says here is the baseline.
 *   GREEN     — the same game, with PROVEN capability evidence seeded first
 *               (holds at `posedImportance` 90, across two distinct games,
 *               unprompted: the bar measured on 15 real games, 2026-09-20).
 *               The tape must be QUIETER.
 *   PROMPTED  — the same seeded rows, flagged `prompted: true`. The app's own
 *               rule is that being TOLD the answer proves nothing, so this
 *               tape must match CONTROL. It is the negative control that
 *               stops "quieter" being an artifact of having any rows at all.
 *
 * Seeded evidence is the sanctioned method (David 2026-09-20) — the red half
 * seeded game A the same way. What it proves is the WIRE and the SENTENCE, not
 * that a real student accumulates holds at a realistic rate; that number is
 * measured offline in `capabilityGreen.measure.test.ts`.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-loop-green-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';
import { fetchGameById, movetextOf, verifyLegal, SEEDS } from './audit-lib/source-real-game.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const STUDENT = process.env.AUDIT_STUDENT || 'black';
const RATINGS = process.env.AUDIT_RATINGS || '1600,1800,2000';

/** The tags to declare proven. Not every tag in the app — the ones the
 *  15-game measurement actually saw posed on real amateur games, so the
 *  seeding models a plausible student rather than an omniscient one. */
const PROVEN_TAGS = [
  'neglected-development', 'passive-rook', 'misplaced-piece', 'space-conceded',
  'passive-king-endgame', 'passed-pawn-neglected', 'missed-opponents-threat',
  'weakened-king-safety', 'hung-material', 'greedy-pawn-grab',
];
/** Above `PROVEN_MIN_IMPORTANCE` (80) — the measured floor where the flip
 *  count reached zero. Seeding at the floor would test the boundary, not the
 *  wire; that boundary is unit-gated. */
const SEED_IMPORTANCE = 90;

/** A real AMATEUR game through the app's own explorer proxy (G3) — copied
 *  from `audit-loop-closes-prod`, for the reason recorded there: master games
 *  are the wrong population for this measurement. Deliberately NOT refactored
 *  into audit-lib while that instrument is in active use by another session. */
async function pickAmateurGame(base, seed, exclude, bounds = { min: 30, max: 110 }) {
  const url = `${base}/api/lichess-explorer?source=lichess&ratings=${RATINGS}&speeds=blitz,rapid&play=${seed.play}`;
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  const ex = await r.json();
  const games = [...(ex.recentGames || []), ...(ex.topGames || [])].filter((g) => g.id && !exclude.has(g.id));
  for (const g of games) {
    try {
      const rr = await fetch(`${base}/api/lichess-game-export?id=${g.id}`); if (!rr.ok) continue;
      const legal = verifyLegal(movetextOf(await rr.text()));
      if (!legal || legal.plyCount < bounds.min || legal.plyCount > bounds.max) continue;
      exclude.add(g.id);
      const res = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2';
      return { id: g.id, white: g.white?.name ?? '?', black: g.black?.name ?? '?', movetext: legal.canonical, plyCount: legal.plyCount, result: res, studentSide: seed.student };
    } catch { /* next */ }
  }
  return null;
}

const log = (s) => console.log(s);
const until = async (fn, ms, step = 500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };
const results = [];
const add = (id, pass, detail) => { results.push({ id, pass, detail }); log(`  ${pass ? '✅' : '❌'} ${id}: ${detail}`); };

// ── helpers copied from audit-loop-closes-prod.mjs (same shape, same app) ──
const dismiss = async (page) => {
  for (let i = 0; i < 6; i++) {
    for (const [s, c] of [
      ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
      ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
    ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
    await page.waitForTimeout(400);
  }
};

const idbOpen = `const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });`;

async function seedGame(page, gid, g) {
  return page.evaluate(async ({ gid, g }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, studentSide: g.studentSide, pgn: g.movetext, white: g.white, black: g.black, result: g.result, date: g.date, source: 'lichess', importedAt: Date.now() });
    const profs = await getAll('profiles');
    for (const p of profs) {
      p.preferences = p.preferences || {};
      p.preferences.chessComUsername = g.studentSide === 'white' ? g.white : g.black;
      p.preferences.coachNarration = 'full';
      await put('profiles', p);
    }
    return { ok: true };
  }, { gid, g });
}

/** Declare a set of capabilities PROVEN (or prompted, for the control). */
async function seedCapabilities(page, { tags, prompted, importance }) {
  return page.evaluate(async ({ tags, prompted, importance }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    if (!db.objectStoreNames.contains('capabilityEvidence')) return { ok: false, reason: 'no capabilityEvidence store' };
    const put = (val) => new Promise((res, rej) => { const t = db.transaction('capabilityEvidence', 'readwrite'); t.objectStore('capabilityEvidence').put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    let n = 0;
    const now = Date.now();
    for (const tag of tags) {
      // TWO holds in TWO DIFFERENT games — the shipped bar. One game would
      // (correctly) prove nothing, which would make a green row unreadable.
      for (const [i, game] of ['green-seed-g1', 'green-seed-g2'].entries()) {
        await put({
          id: `green-seed-${tag}-${i}`, tag, outcome: 'held',
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          playedSan: 'Nf3', posedImportance: importance,
          recordedAt: now - (2 - i) * 86400000, origin: 'play',
          prompted, sourceGameId: game,
        });
        n += 1;
      }
    }
    return { ok: true, rows: n };
  }, { tags, prompted, importance });
}

/**
 * THE NEED TERMS, off the app's own `coach-need-scores` emission.
 *
 * 🔒 WHY THIS EXISTS, AND WHY THE WORD COUNT COULD NEVER HAVE WORKED
 * (2026-09-21). Run 1 reported GREEN quieter by 468 words with a PROMPTED arm
 * that moved 612 — a failing negative control. Run 2 measured the instrument
 * against itself: a 117-word floor WITHIN a run, 592 words BETWEEN runs, and
 * green moving 16. The verdict was RUN UNUSABLE, correctly, and the board
 * concluded the review arm "proves nothing either way".
 *
 * That conclusion was right about the WORD COUNT and wrong as a general
 * verdict on this surface. The reasoning: review is `walk` posture, so a term
 * that LOWERS need cannot silence a ply there — G4.5.15 says every ply is a
 * beat. True. But the TERM IS STILL COMPUTED, on both postures; posture only
 * decides whether importance may gate. So the mechanism — does proving a
 * capability actually lower this student's need, and does a PROMPTED row
 * correctly do nothing — is fully observable here, and it is observable
 * DETERMINISTICALLY, as a sign and a count rather than as an aggregate of
 * prose fighting a 592-word variance.
 *
 * What still needs an `interrupt` surface is the BEHAVIOUR: a ply that would
 * have spoken going quiet. That is a separate, later measurement. This one
 * answers the question that has never once been answered on a device — does
 * green FIRE — and it answers it without a noise floor.
 */
function needTerms(listener) {
  const totals = {}; const fired = {};
  let rows = 0; let plies = 0;
  for (const e of listener.getCapturedEvents()) {
    if (e.kind !== 'coach-need-scores') continue;
    let r = null;
    try { r = JSON.parse(e.details ?? ''); } catch { continue; }
    if (!r || !r.totals) continue;
    rows += 1; plies += r.plies ?? 0;
    for (const [k, v] of Object.entries(r.totals)) totals[k] = (totals[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.fired ?? {})) fired[k] = (fired[k] ?? 0) + v;
  }
  return { rows, plies, totals, fired, capability: totals.capability ?? 0, capabilityFired: fired.capability ?? 0 };
}

async function capabilityRowCount(page) {
  return page.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    if (!db.objectStoreNames.contains('capabilityEvidence')) return -1;
    const all = await new Promise((res, rej) => { const t = db.transaction('capabilityEvidence', 'readonly'); const rq = t.objectStore('capabilityEvidence').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    return all.length;
  }).catch(() => -1);
}

async function narrationSegments(page, gid) {
  return page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const segs = g?.reviewNarration?.narration?.segments;
    return Array.isArray(segs) ? segs.map((s) => ({ ply: s.ply, san: s.san, narration: s.narration ?? null })) : null;
  }, gid).catch(() => null);
}

/** The app's own heat-map emission (`capability-heat-map`) out of the LOCAL
 *  Dexie audit log — the on-device source of truth, so no listener is needed.
 *  This is the ASSERT half for the green bar: the bar's values are MEASURED
 *  numbers, so which side of them the tags fall on has to be readable rather
 *  than inferred from how quiet the tape got. */
async function heatMap(page) {
  return page.evaluate(async () => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    try {
      const db = await open();
      if (!db.objectStoreNames.contains('meta')) return null;
      const rec = await new Promise((res, rej) => { const t = db.transaction('meta', 'readonly'); const rq = t.objectStore('meta').get('app-audit-log.v1'); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
      const log = JSON.parse(rec?.value ?? '[]');
      const rows = log.filter((e) => e && e.kind === 'capability-heat-map');
      if (rows.length === 0) return null;
      return JSON.parse(rows[rows.length - 1].details ?? 'null');
    } catch { return null; }
  }).catch(() => null);
}

async function openReview(page, gid) {
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(page);
  const cardSel = `[data-testid="review-game-card-${gid}"]`;
  if (!await until(() => has(page, cardSel), 60000, 800)) return { ok: false, reason: 'game card never rendered' };
  const t0 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForURL(/\/coach\/review\//, { timeout: 15000 }).catch(() => undefined);
  await dismiss(page);
  const ready = await until(async () => {
    const b = page.locator('[data-testid="start-walk-btn"]').first();
    return (await b.count()) > 0 && await b.isEnabled().catch(() => false);
  }, 300000, 1500);
  let segs = null;
  if (ready) await until(async () => { segs = await narrationSegments(page, gid); return Array.isArray(segs) && segs.length > 0; }, 30000, 1000);
  return { ok: ready && Array.isArray(segs), ms: Date.now() - t0, segs, reason: ready ? (segs ? '' : 'no cached narration') : 'walk never became startable' };
}

/** How much the coach SAID: narrated plies and total words. Two numbers, so
 *  "quieter" cannot be satisfied by rewording the same coverage. */
const volumeOf = (segs) => {
  const spoken = (segs ?? []).filter((s) => s.narration && String(s.narration).trim().length > 0);
  const words = spoken.reduce((n, s) => n + String(s.narration).trim().split(/\s+/).length, 0);
  return { plies: spoken.length, words };
};

const run = async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = `audit-reports/loop-green-${stamp}`;
  mkdirSync(outDir, { recursive: true });

  log(`[green] sourcing a real amateur game (student=${STUDENT}) through ${BASE}`);
  let game = null;
  if (process.env.AUDIT_GAME_ID) {
    game = await fetchGameById(BASE, process.env.AUDIT_GAME_ID).catch(() => null);
    if (game) game.studentSide = STUDENT;
  }
  const exclude = new Set();
  for (const seed of SEEDS.filter((s) => s.student === STUDENT)) {
    if (game) break;
    game = await pickAmateurGame(BASE, seed, exclude).catch(() => null);
  }
  if (!game) { add('SOURCE real game', false, 'explorer gave no usable game — NOT green, the run proves nothing'); return finish(outDir); }
  game.movetext = game.movetext ?? movetextOf(game);
  if (!verifyLegal(game.movetext)) { add('SOURCE legal', false, `game ${game.id} did not replay`); return finish(outDir); }
  const d = new Date(Date.now() - 86400000);
  game.date = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
  game.studentSide = STUDENT;
  add('SOURCE real game', true, `${game.white} vs ${game.black} ${game.result} (${game.plyCount ?? '?'} plies, id=${game.id}) — REPRODUCE: AUDIT_GAME_ID=${game.id} AUDIT_STUDENT=${STUDENT}`);

  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
  let ttsRequests = 0;

  const newDevice = async () => {
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
    await ctx.addInitScript(muteTtsForAudit);
    await ctx.addInitScript(autoDismissCalibration);
    const listener = await attachVoiceListener(ctx);
    const page = await ctx.newPage();
    await blockTtsNetwork(page);
    page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });
    for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { /* retry */ } }
    await dismiss(page);
    await until(async () => (await page.evaluate(async () => {
      const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      try { const db = await open(); return db.objectStoreNames.contains('games') && db.objectStoreNames.contains('profiles'); } catch { return false; }
    }).catch(() => false)), 60000, 1000);
    return { ctx, page, listener };
  };

  const tapeOf = async (label, seedCaps) => {
    const dev = await newDevice();
    const gid = `green-${label}-${Date.now()}`;
    if (seedCaps) {
      const r = await seedCapabilities(dev.page, seedCaps);
      const n = await capabilityRowCount(dev.page);
      add(`${label} SEED capability rows`, r.ok && n > 0, r.ok ? `${n} rows in capabilityEvidence` : `seed failed: ${r.reason}`);
    }
    await seedGame(dev.page, gid, game);
    const res = await openReview(dev.page, gid);
    const heat = await heatMap(dev.page);
    const vol = volumeOf(res.segs);
    const need = needTerms(dev.listener);
    log(`  [${label}] ${res.ok ? `${(res.ms / 1000).toFixed(1)}s, ${res.segs.length} segments, ${vol.plies} narrated plies, ${vol.words} words | need rows=${need.rows} plies=${need.plies} capability=${need.capability} (fired ${need.capabilityFired}x)` : res.reason}`);
    await dev.listener.stop().catch(() => undefined);
    await dev.ctx.close();
    return { ...res, vol, gid, heat, need };
  };

  // TWO UNSEEDED CONTROLS, and the second one is not redundant — it is the
  // instrument measuring ITSELF. Run 1 (2026-09-20) reported GREEN quieter by
  // 468 words AND the prompted arm, which must change nothing, quieter by 612.
  // With one device per arm there was no way to tell a real effect from
  // review's known run-to-run classification drift (#70), so a green row could
  // not be believed and neither could a red one. The gap between these two
  // tapes IS the noise floor; an effect smaller than it means the run proves
  // nothing and must say so rather than pick a side.
  const control = await tapeOf('control', null);
  const control2 = await tapeOf('control2', null);
  const noise = Math.abs(control.vol.words - (control2.vol.words ?? 0));
  add('NOISE FLOOR measured', control.ok && control2.ok,
    control.ok && control2.ok
      ? `two unseeded devices differ by ${noise} words (${control.vol.words} vs ${control2.vol.words})`
      : 'could not measure the instrument\'s own variance');
  add('CONTROL tape', control.ok && control.vol.plies > 0,
    control.ok ? `${control.vol.plies} narrated plies / ${control.vol.words} words` : `no baseline: ${control.reason}`);
  if (!control.ok || control.vol.plies === 0) { await browser.close(); return finish(outDir, { control }); }

  const green = await tapeOf('green', { tags: PROVEN_TAGS, prompted: false, importance: SEED_IMPORTANCE });
  const prompted = await tapeOf('prompted', { tags: PROVEN_TAGS, prompted: true, importance: SEED_IMPORTANCE });

  // The effect has to CLEAR the instrument's own variance, or the run is
  // unusable — that verdict is the honest one and is not a pass.
  const drop = control.vol.words - (green.vol.words ?? 0);
  const usable = control.ok && control2.ok && green.ok && prompted.ok && noise * 2 < drop;
  if (!usable) {
    // 🔒 THIS IS NO LONGER THE RUN'S VERDICT, ONLY THIS ARM'S (2026-09-21).
    // It used to fail the whole audit, which was right while the word count
    // was the only evidence. It is now the WEAKER of two instruments: the
    // mechanism rows below read the capability term's SIGN off the app's own
    // emission and need no noise floor at all. A prose effect too small to
    // resolve is an honest statement about PROSE — it says nothing about
    // whether the wire fired, and must not be allowed to overrule the rows
    // that answer that directly.
    add('PROSE ARM unusable (not a failure of the run)', true,
      `green dropped ${drop} words against a ${noise}-word noise floor — too small for this instrument to `
      + 'resolve, as expected on a WALK posture where need can only reorder. The mechanism rows below are the verdict');
  } else {
    add('GREEN is quieter than control', true,
      `${green.vol.plies} plies / ${green.vol.words} words vs control ${control.vol.plies} / ${control.vol.words} (noise ${noise})`);
    add('PROMPTED changes nothing — being told is not proving',
      Math.abs(prompted.vol.words - control.vol.words) <= noise,
      `${prompted.vol.words} words vs control ${control.vol.words} (within the ${noise}-word floor?)`);
  }
  // ── THE MECHANISM, MEASURED AS A SIGN RATHER THAN AS PROSE ────────────────
  //
  // These three rows are the load-bearing ones now. They are deterministic:
  // `capability` is the ONE term in `computeNeed` that can LOWER need, so its
  // total over a run is a signed number that says outright whether proving a
  // capability reached the decision. No aggregate, no variance, no floor.
  //
  // They also cover a case the old word-count arm could not express at all:
  // green firing with the RIGHT SIGN. A sign inversion would make proving a
  // capability make the coach LOUDER — and every sentence would still read
  // perfectly, which is why prose can never catch it.
  add('NEED rows emitted on every arm',
    control.need.rows > 0 && green.need.rows > 0 && prompted.need.rows > 0,
    `control=${control.need.rows} green=${green.need.rows} prompted=${prompted.need.rows} aggregated need rows`
    + ` (${control.need.plies}/${green.need.plies}/${prompted.need.plies} plies scored)`);

  // CONTROL: nothing is proven, so the term must be exactly inert. This is the
  // non-vacuity guard — without it, a `capability` of 0 on the green arm could
  // be read as "no effect" when it actually means "the emission never fired".
  add('CONTROL capability term is INERT (nothing proven)',
    control.need.rows > 0 && control.need.capability === 0 && control.need.capabilityFired === 0,
    `capability total=${control.need.capability}, fired ${control.need.capabilityFired}x on an unseeded device`);

  // GREEN: the wire. It must fire, and it must fire NEGATIVE.
  add('GREEN capability term FIRES, and LOWERS',
    green.need.capabilityFired > 0 && green.need.capability < 0,
    `capability total=${green.need.capability} over ${green.need.plies} plies, fired ${green.need.capabilityFired}x`
    + (green.need.capability > 0 ? ' — POSITIVE is a SIGN INVERSION: proving a capability would make the coach LOUDER' : ''));

  // PROMPTED: the negative control, and the app's own rule — being TOLD the
  // answer proves nothing, so `getCapabilityProfile` skips prompted rows and
  // this term must be as inert as the control's.
  add('PROMPTED capability term stays INERT — being told is not proving',
    prompted.need.capability === 0 && prompted.need.capabilityFired === 0,
    `capability total=${prompted.need.capability}, fired ${prompted.need.capabilityFired}x with the SAME rows flagged prompted`);

  // THE GREEN BAR IS OBSERVABLE (the algo-audit rule). The tape getting quieter
  // is the EFFECT; this is the CAUSE, read off the app's own emission — how
  // many tags the app itself counts as PROVEN, against the bar it used. A
  // quieter tape with zero proven tags would mean the drop came from something
  // else entirely, which is exactly the confusion run 1 fell into.
  const gHeat = green.heat;
  const cHeat = control.heat;
  add('HEAT MAP emitted', !!gHeat, gHeat
    ? `green device: ${gHeat.tags} tags with evidence, ${gHeat.proven} PROVEN, ${gHeat.red} with a break; bar=${JSON.stringify(gHeat.bar)}`
    : 'no capability-heat-map row on the green device — the green half ran unobserved');
  if (gHeat) {
    add('HEAT MAP the seeded arm is the one with proven tags', gHeat.proven > 0 && (cHeat?.proven ?? 0) === 0,
      `green proven=${gHeat.proven}, control proven=${cHeat?.proven ?? (cHeat === null ? 'no row (no evidence — correct for an unseeded device)' : 0)}`);
    // THE THREE HEAT-MAP STATES MUST PARTITION (2026-09-20). `proven` and
    // `red` stopped being mutually exclusive the moment green became
    // recoverable — a break RESETS the streak rather than closing the door —
    // so a student who FIXED a weakness counts in both and in neither alone.
    // `recovered` is that student, and it is the only number that answers the
    // heat map's reason for existing ("you have GOTTEN BETTER"); the board has
    // carried "has a student's Nth game ever gone quiet because of games
    // 1..N-1?" as NEVER SHOWN. The assertion is an arithmetic identity, so a
    // future change that makes the split incoherent fails here rather than
    // producing a plausible wrong number.
    const hasSplit = typeof gHeat.recovered === 'number' && typeof gHeat.currentlyRed === 'number';
    add('HEAT MAP the three states partition (recovered + currentlyRed === red)',
      hasSplit && gHeat.recovered + gHeat.currentlyRed === gHeat.red,
      hasSplit
        ? `red=${gHeat.red} = recovered=${gHeat.recovered} + currentlyRed=${gHeat.currentlyRed}`
        : 'the emission carries no recovered/currentlyRed split — running against a bundle older than the split');
    add('HEAT MAP RECOVERED is readable (the "you got better" number, reported not asserted)',
      hasSplit,
      hasSplit ? `${gHeat.recovered} tag(s) proven AFTER a break on the seeded device` : 'n/a');
  }
  add('MUTED', ttsRequests === 0, `${ttsRequests} /api/tts requests`);

  writeFileSync(`${outDir}/tapes.json`, JSON.stringify({ game: { id: game.id, white: game.white, black: game.black }, noise, control: control.segs, control2: control2.segs, green: green.segs, prompted: prompted.segs }, null, 2));
  await browser.close();
  return finish(outDir, { control, control2, green, prompted });
};

function finish(outDir, tapes = {}) {
  const passed = results.filter((r) => r.pass).length;
  log(`\nDONE — ${passed}/${results.length} checks`);
  writeFileSync(`${outDir}/report.json`, JSON.stringify({ results, volumes: Object.fromEntries(Object.entries(tapes).map(([k, v]) => [k, v?.vol ?? null])) }, null, 2));
  log(`report: ${outDir}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
