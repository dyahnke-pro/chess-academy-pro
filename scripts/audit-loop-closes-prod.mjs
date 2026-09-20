#!/usr/bin/env node
/**
 * audit-loop-closes-prod — THE INSTRUMENT FOR THE APP'S ONE-LINE DEFINITION.
 *
 *   "The coach learns you, and what it learned changes what it says next."
 *
 * Every half of that loop was built and gated in isolation. Nobody had ever
 * shown a real student's SECOND game sounding different because of their FIRST
 * (WO-LOOP-01, David 2026-09-20: "i want to get the main concept of the app
 * working"). This measures exactly that, on two fresh prod devices:
 *
 *   CONTROL  fresh device → seed real game B UNANALYSED → open its review → the
 *            app runs the genuine pipeline → read B's narration segments.
 *   LOOP     fresh device → seed real game A → open its review → wait until the
 *            post-analysis SWEEP has RECORDED a misconception row carrying a
 *            `fundamentalId` for A (RECORDED is its own row — "the coach never
 *            learned" and "it learned and never said so" are different bugs)
 *            → seed B → open B → read B's segments → walk B to the recurrence
 *            ply so the narration LISTENER proves the sentence was SPOKEN.
 *
 * Rows:
 *   A. game A RECORDED — ≥1 misconceptionTags row with fundamentalId + sourceGameId=A
 *   P. the pair SHARES a fundamental (B's sweep attributes an id A also has) —
 *      when it does not, the pair is unusable and the run says so; it never
 *      passes vacuously, and it never fails the product for the instrument's pick
 *   D. B's LOOP tape carries the recurrence clause; B's CONTROL tape does not
 *   N. the clause names A's opponent (the student's opponent in A), never B's
 *   S. the clause was SPOKEN on the walk (listener), not only computed
 *   M. muted — zero /api/tts requests
 *
 * Both tapes are PRINTED at the ply that differs. The row count is the harness;
 * the prose is the product.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-loop-closes-prod.mjs
 *   AUDIT_GAME_A=<lichess id> AUDIT_GAME_B=<lichess id> AUDIT_STUDENT=black  → pin the pair (printed by every run)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';
import { readWalkPly } from './audit-lib/review-explore.mjs';
import { SEEDS, pickRealGame, fetchGameById, movetextOf, verifyLegal } from './audit-lib/source-real-game.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const STUDENT = process.env.AUDIT_STUDENT || 'black';
// THE POPULATION IS AMATEURS (run 2, 2026-09-20). Three GM games in a row gave
// the student no second loose piece, and the one with flagged plies attributed
// nothing (two king moves — the known `other` gap). The app's real users are
// 1600–2000 club players, whose games are full of exactly the fundamentals this
// instrument needs. `AUDIT_SOURCE=masters` keeps the old population.
const SOURCE = process.env.AUDIT_SOURCE || 'lichess';
const RATINGS = process.env.AUDIT_RATINGS || '1600,1800,2000';
const MAX_B_CANDIDATES = Number(process.env.AUDIT_B_CANDIDATES || 5);
const RECUR_RE = /keeps recurring in your games — .+?, the \w+ game now/i;
const log = (s) => console.log(s);
const until = async (fn, ms, step = 500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };

const results = [];
const add = (id, pass, detail) => { results.push({ id, pass, detail }); log(`  ${pass ? '✅' : '❌'} ${id}: ${detail}`); };

/** A real AMATEUR game for a seed, through the app's own explorer proxy (G3).
 *  Prefers games the student side LOST — a losing player has slips to record.
 *  Same legality + ply gates as the masters picker. */
async function pickAmateurGame(base, seed, exclude, bounds = { min: 30, max: 110 }) {
  const url = `${base}/api/lichess-explorer?source=lichess&ratings=${RATINGS}&speeds=blitz,rapid&play=${seed.play}`;
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  const ex = await r.json();
  const games = [...(ex.recentGames || []), ...(ex.topGames || [])].filter((g) => g.id && !exclude.has(g.id));
  const lost = (g) => (g.winner === 'white' ? 'white' : g.winner === 'black' ? 'black' : 'draw') !== seed.student && g.winner;
  const ordered = [...games.filter(lost), ...games.filter((g) => !lost(g))];
  for (const g of ordered) {
    try {
      const rr = await fetch(`${base}/api/lichess-game-export?id=${g.id}`); if (!rr.ok) continue;
      const raw = await rr.text();
      const legal = verifyLegal(movetextOf(raw));
      if (!legal || legal.plyCount < bounds.min || legal.plyCount > bounds.max) continue;
      exclude.add(g.id);
      const res = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2';
      return { id: g.id, white: g.white?.name ?? '?', black: g.black?.name ?? '?', movetext: legal.canonical, plyCount: legal.plyCount, result: res, studentSide: seed.student, seedName: `${seed.name} (amateur ${g.white?.rating ?? '?'}/${g.black?.rating ?? '?'})` };
    } catch { /* next */ }
  }
  return null;
}

// ── game sourcing (G3: real games through the app's own explorer proxy) ────
async function sourcePair() {
  const exclude = new Set();
  const byId = async (id) => {
    for (let i = 0; i < 3; i++) {
      try { const g = await fetchGameById(BASE, id); if (g) return { ...g, studentSide: STUDENT, seedName: `pinned ${id}` }; } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`pinned game ${id} could not be fetched`);
  };
  const a = process.env.AUDIT_GAME_A ? await byId(process.env.AUDIT_GAME_A) : null;
  const b = process.env.AUDIT_GAME_B ? await byId(process.env.AUDIT_GAME_B) : null;
  if (a) exclude.add(a.id);   // a pinned A must never come back as a B candidate (run 4 paired a game with itself)
  if (b) exclude.add(b.id);
  if (a && b) return { a, b, pool: [] };
  // Losing games first: a student who LOST has flagged plies to record; a GM who won rarely does.
  const seeds = SEEDS.filter((s) => s.student === STUDENT).sort((a, b) => Number(b.want !== b.student) - Number(a.want !== a.student));
  const picked = [];
  const pick = SOURCE === 'masters' ? pickRealGame : pickAmateurGame;
  for (const seed of seeds) {
    // amateur seeds are deep in games: take up to two per opening
    for (let k = 0; k < (SOURCE === 'masters' ? 1 : 2); k++) {
      const g = await pick(BASE, seed, exclude).catch(() => null);
      if (g) picked.push(g);
      if (picked.length >= 2 + MAX_B_CANDIDATES) break;
    }
    if (picked.length >= 2 + MAX_B_CANDIDATES) break;
  }
  if (picked.length < 2 && !(a && picked.length >= 1)) throw new Error('could not source two real games from the explorer');
  return { a: a ?? picked[0], b: b ?? picked[a ? 0 : 1], pool: picked.slice(a ? 1 : 2) };
}

// ── page helpers ───────────────────────────────────────────────────────────
const dismiss = async (page) => {
  for (let i = 0; i < 6; i++) {
    for (const [s, c] of [
      ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
      ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
    ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
    await page.waitForTimeout(400);
  }
};

async function seedGame(page, gid, g) {
  return page.evaluate(async ({ gid, g }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    // Two REAL dates, a fortnight apart, so the recurrence clause has honest
    // recency to speak ("the last one was … 17 days ago"), never "earlier today".
    await put('games', { id: gid, studentSide: g.studentSide, pgn: g.movetext, white: g.white, black: g.black, result: g.result, date: g.date, event: "Let's Play!", eco: 'A00', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) {
      p.preferences = p.preferences || {};
      p.preferences.chessComUsername = g.studentSide === 'white' ? g.white : g.black;
      p.preferences.coachNarration = 'full';
      p.preferences.lastAutoImportAt = Date.now();
      await put('profiles', p);
    }
    return { ok: true, profiles: profs.length };
  }, { gid, g });
}

/** What the app's engine FLAGGED for the student in this game, and how many
 *  misconception rows of ANY kind the sweep wrote — separates "nothing to
 *  record" from "the sweep never ran". */
async function recordDiagnostics(page, gid, studentSide) {
  return page.evaluate(async ({ gid, studentSide }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const flagged = (g?.annotations ?? []).filter((a) => a.color === studentSide && (a.classification === 'mistake' || a.classification === 'blunder')).map((a) => `${a.moveNumber}${a.color === 'black' ? '...' : '.'}${a.san} ${a.classification}`);
    let rows = 0;
    if (db.objectStoreNames.contains('misconceptionTags')) {
      const all = await new Promise((res, rej) => { const t = db.transaction('misconceptionTags', 'readonly'); const rq = t.objectStore('misconceptionTags').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
      rows = all.filter((r) => r.sourceGameId === gid).length;
    }
    return { depth: g?.analysisDepth, fully: g?.fullyAnalyzed, flagged, rows };
  }, { gid, studentSide }).catch((e) => ({ error: String(e) }));
}

/** Rows the SWEEP wrote for this game — the RECORD half of the loop. */
async function recordedFundamentals(page, gid) {
  return page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    if (!db.objectStoreNames.contains('misconceptionTags')) return [];
    const rows = await new Promise((res, rej) => { const t = db.transaction('misconceptionTags', 'readonly'); const rq = t.objectStore('misconceptionTags').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    return rows.filter((r) => r.sourceGameId === gid && r.fundamentalId).map((r) => ({ id: r.fundamentalId, ply: r.moveNumber, san: r.playedSan }));
  }, gid).catch(() => []);
}

/** The cached narration segments the app computed for this game. */
async function narrationSegments(page, gid) {
  return page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const segs = g?.reviewNarration?.narration?.segments;
    return Array.isArray(segs) ? segs.map((s) => ({ ply: s.ply, san: s.san, narration: s.narration ?? null })) : null;
  }, gid).catch(() => null);
}

/** Open the review for a seeded game and wait for the genuine pipeline. */
async function openReview(page, gid) {
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(page);
  const cardSel = `[data-testid="review-game-card-${gid}"]`;
  const cardUp = await until(() => has(page, cardSel), 60000, 800);
  if (!cardUp) return { ok: false, reason: 'game card never rendered' };
  const t0 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForURL(/\/coach\/review\//, { timeout: 15000 }).catch(() => undefined);
  await dismiss(page);
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 3000 }).catch(() => 'x')) === null; };
  const ready = await until(startable, 300000, 1500);
  // The narration is generated as the walk becomes startable; give the cache
  // write a moment, then read it back.
  const segs = ready ? await (async () => { let s = null; await until(async () => { s = await narrationSegments(page, gid); return Array.isArray(s) && s.length > 0; }, 60000, 1000); return s; })() : null;
  return { ok: ready && Array.isArray(segs), ms: Date.now() - t0, segs, reason: ready ? (segs ? '' : 'no cached narration segments') : 'analysis never settled (300s)' };
}

// ── main ───────────────────────────────────────────────────────────────────
const run = async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = `audit-reports/loop-closes-${stamp}`;
  mkdirSync(outDir, { recursive: true });

  log(`[loop] sourcing real ${SOURCE === 'masters' ? 'MASTER' : `AMATEUR (${RATINGS})`} games (student=${STUDENT}) through ${BASE}`);
  const { a: A, b: B, pool } = await sourcePair();
  const DAY = 24 * 60 * 60 * 1000;
  const dateOf = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`; };
  A.date = dateOf(Date.now() - 17 * DAY);
  B.date = dateOf(Date.now() - 1 * DAY);
  log(`[game A] ${A.white} vs ${A.black} ${A.result} (${A.plyCount} plies, id=${A.id}) ${A.seedName ?? ''}`);
  log(`[game B] ${B.white} vs ${B.black} ${B.result} (${B.plyCount} plies, id=${B.id})`);
  log(`[game] REPRODUCE: AUDIT_GAME_A=${A.id} AUDIT_GAME_B=${B.id} AUDIT_STUDENT=${STUDENT} node scripts/audit-loop-closes-prod.mjs  (a swapped B candidate is printed below if used)`);
  const oppA = STUDENT === 'white' ? A.black : A.white;
  const oppB = STUDENT === 'white' ? B.black : B.white;

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
    // Boot once so the app creates its profile + schema before we seed.
    for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
    await dismiss(page);
    await until(async () => (await page.evaluate(async () => {
      const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      try { const db = await open(); return db.objectStoreNames.contains('games') && db.objectStoreNames.contains('profiles'); } catch { return false; }
    }).catch(() => false)), 60000, 1000);
    return { ctx, page, listener };
  };

  // ── CONTROL: B alone ─────────────────────────────────────────────────────
  log('\n── CONTROL — game B on a fresh device ──');
  const control = await newDevice();
  const gidB0 = `loop-control-${Date.now()}`;
  await seedGame(control.page, gidB0, B);
  const cB0 = await openReview(control.page, gidB0);
  log(`  [control] B open: ${cB0.ok ? `${(cB0.ms / 1000).toFixed(1)}s, ${cB0.segs?.length} segments` : cB0.reason}`);
  const controlRecorded = await recordedFundamentals(control.page, gidB0);
  log(`  [control] B's own sweep recorded: ${JSON.stringify(controlRecorded)}`);
  const controlTape = cB0.segs ?? [];
  await control.listener.stop().catch(() => undefined);
  await control.ctx.close();

  // ── LOOP: A, then B ──────────────────────────────────────────────────────
  log('\n── LOOP — game A, then game B, one device ──');
  const loop = await newDevice();
  // A must RECORD A FUNDAMENTAL for the loop to have anything to say. Rows
  // without a fundamental (a pawn push, a king move — the `other` gap) are a
  // real record, but not one this sentence can name, so try the next A
  // candidate (bounded) before declaring the pair unusable.
  let Acur = A; let gidA = ''; let recA = []; let diagA = {};
  const aCandidates = [A, ...pool];
  let usedFromPool = 0;
  for (let k = 0; k < aCandidates.length && k < 3; k++) {
    Acur = aCandidates[k];
    if (k > 0) { Acur.date = A.date; usedFromPool = k; log(`  [loop] A candidate ${k + 1}: ${Acur.white} vs ${Acur.black} (id=${Acur.id})`); }
    gidA = `loop-a${k}-${Date.now()}`;
    await seedGame(loop.page, gidA, Acur);
    const cA = await openReview(loop.page, gidA);
    log(`  [loop] A open: ${cA.ok ? `${(cA.ms / 1000).toFixed(1)}s` : cA.reason}`);
    // THE RECORD HALF. The sweep runs after analysis; poll the store.
    recA = [];
    await until(async () => { recA = await recordedFundamentals(loop.page, gidA); return recA.length > 0; }, 90000, 2000);
    diagA = await recordDiagnostics(loop.page, gidA, STUDENT);
    log(`  [record A] engine flagged ${diagA.flagged?.length ?? '?'} student ply(ies): ${(diagA.flagged ?? []).join(' | ') || 'none'}; misconception rows: ${diagA.rows}; fundamentals: ${[...new Set(recA.map((r) => r.id))].join(', ') || 'none'}`);
    if (recA.length > 0) break;
  }
  if (usedFromPool > 0) pool.splice(0, usedFromPool);
  const oppAcur = STUDENT === 'white' ? Acur.black : Acur.white;
  add('A. game A RECORDED — the sweep wrote a row carrying a fundamental', recA.length > 0,
    recA.length ? `${recA.length} row(s): ${[...new Set(recA.map((r) => r.id))].join(', ')} (A=${Acur.id}, opponent ${oppAcur})`
      : (diagA.rows > 0 ? `the sweep RECORDED ${diagA.rows} row(s) for ${diagA.flagged?.length ?? '?'} flagged ply(ies) but attributed NO fundamental (the \`other\` gap) on every A candidate tried`
        : (diagA.flagged?.length ? `engine flagged ${diagA.flagged.length} student ply(ies) but the sweep wrote 0 rows — the RECORD half did not fire`
          : 'the engine flagged NO student ply in A — nothing to record')));
  const idsA = new Set(recA.map((r) => r.id));

  // Now B on the SAME device — a full navigation, like a student coming back.
  // If the pinned/first B shares no fundamental with A, try the pool (bounded)
  // — a different game, not a different instrument. The CONTROL tape belongs to
  // the first B only; a swapped B reports D against its own fresh control below.
  let gidB1 = `loop-b-${Date.now()}`;
  let Bcur = B;
  let cB1 = null; let recB = []; let idsB = new Set(); let shared = [];
  let controlTapeCur = controlTape;
  const candidates = [B, ...pool];
  for (let k = 0; k < candidates.length && k < 1 + MAX_B_CANDIDATES; k++) {
    Bcur = candidates[k];
    if (Bcur.id === Acur.id) { log(`  [loop] skipping B candidate ${k + 1}: same game as A`); continue; }
    if (k > 0) { Bcur.date = B.date; gidB1 = `loop-b${k}-${Date.now()}`; log(`  [loop] B candidate ${k + 1}: ${Bcur.white} vs ${Bcur.black} (id=${Bcur.id})`); }
    await seedGame(loop.page, gidB1, Bcur);
    cB1 = await openReview(loop.page, gidB1);
    log(`  [loop] B open: ${cB1.ok ? `${(cB1.ms / 1000).toFixed(1)}s, ${cB1.segs?.length} segments` : cB1.reason}`);
    recB = [];
    await until(async () => { recB = await recordedFundamentals(loop.page, gidB1); return recB.length > 0; }, 90000, 2000);
    const diagB = await recordDiagnostics(loop.page, gidB1, STUDENT);
    log(`  [record B] engine flagged ${diagB.flagged?.length ?? '?'}: ${(diagB.flagged ?? []).join(' | ') || 'none'}; rows: ${diagB.rows}; fundamentals: ${[...new Set(recB.map((r) => r.id))].join(', ') || 'none'}`);
    idsB = new Set(recB.map((r) => r.id));
    shared = [...idsB].filter((id) => idsA.has(id));
    if (shared.length > 0 || idsA.size === 0) break;
    if (k > 0 || candidates.length > 1) {
      // a swapped B needs its own control tape
      if (k + 1 < candidates.length && k + 1 < 1 + MAX_B_CANDIDATES) {
        const ctl = await newDevice();
        const gidC = `loop-control${k + 1}-${Date.now()}`;
        await seedGame(ctl.page, gidC, candidates[k + 1]);
        const c = await openReview(ctl.page, gidC);
        controlTapeCur = c.segs ?? [];
        await ctl.listener.stop().catch(() => undefined); await ctl.ctx.close();
      }
    }
  }
  const controlTapeUsed = Bcur === B ? controlTape : controlTapeCur;
  const oppBcur = STUDENT === 'white' ? Bcur.black : Bcur.white;
  add('P. the pair SHARES a fundamental (A ∩ B)', shared.length > 0,
    shared.length ? shared.join(', ') : `A={${[...idsA].join(',')}} B={${[...idsB].join(',')}} — no shared fundamental; this PAIR cannot show the loop. Pin another with AUDIT_GAME_A/B (pool: ${pool.map((g) => g.id).join(', ') || 'none'})`);

  const loopTape = cB1?.segs ?? [];
  const recurLoop = loopTape.filter((s) => s.narration && RECUR_RE.test(s.narration));
  const recurControl = controlTapeUsed.filter((s) => s.narration && RECUR_RE.test(s.narration));
  const usable = shared.length > 0;
  add('D. B narrates DIFFERENTLY after A — the recurrence clause is in the loop tape and not in the control tape',
    usable ? recurLoop.length > 0 && recurControl.length === 0 : recurControl.length === 0,
    usable ? `loop: ${recurLoop.length} ply(ies) carry it [${recurLoop.map((s) => s.ply).join(',')}]; control: ${recurControl.length}` : `n/a — pair shares nothing (control carries ${recurControl.length}, must be 0)`);
  const first = recurLoop[0];
  if (first) {
    const ctl = controlTapeUsed.find((s) => s.ply === first.ply);
    log(`\n  ── ply ${first.ply} (${first.san}) ──`);
    log(`  CONTROL: ${ctl?.narration ?? '(silent)'}`);
    log(`  LOOP:    ${first.narration}`);
  }
  const namesA = first ? new RegExp(oppAcur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(first.narration) : false;
  const namesB = first ? new RegExp(oppBcur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(first.narration.replace(/^.*?keeps recurring/i, '')) : false;
  add("N. the clause names A's opponent, never B's", usable ? namesA && !namesB : true,
    usable ? `expects "${oppAcur}"; names A=${namesA}, names B=${namesB}` : 'n/a');

  // THE SPOKEN HALF — walk B until the recurrence ply is voiced.
  let spokenIt = false;
  if (first) {
    const spoken = () => loop.listener.getCapturedEvents()
      .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText && String(e.source ?? '').startsWith('voiceService.'))
      .map((e) => String(e.narrationText));
    await loop.page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
    await loop.page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
    const skips = [
      ['review-find-shot-card', '[data-testid="review-find-shot-skip"]'], ['review-cameo-ask', '[data-testid="review-cameo-skip"]'],
      ['review-theory-ask', '[data-testid="review-theory-skip"]'], ['review-trap-card', '[data-testid="review-trap-pick-leave"]'],
      ['review-trap-reveal', '[data-testid="review-trap-done"]'], ['review-critical-reveal', '[data-testid="review-critical-done"]'],
      ['review-rewind-card', '[data-testid="review-rewind-decline"]'],
    ];
    const budgetMs = Math.min(15 * 60 * 1000, 12000 * (first.ply + 4));
    spokenIt = await until(async () => {
      for (const [card, btn] of skips) { if (await has(loop.page, `[data-testid="${card}"]`)) await loop.page.locator(btn).first().click({ timeout: 2000, force: true }).catch(() => undefined); }
      const n = (await readWalkPly(loop.page))?.n ?? 0;
      if (n > first.ply + 2) return true; // passed it — stop, the check below decides
      return spoken().some((t) => RECUR_RE.test(t));
    }, budgetMs, 1500);
    spokenIt = spoken().some((t) => RECUR_RE.test(t));
  }
  add('S. the recurrence clause was SPOKEN on the walk (listener)', usable ? spokenIt : true, usable ? (spokenIt ? 'heard off the wire' : 'never voiced within budget') : 'n/a');
  add('M. the run stayed MUTED', ttsRequests === 0, `${ttsRequests} /api/tts requests`);

  // ── THE READING: why the app could not NAME a slip ──────────────────────
  // Section 14's three detectors exist to shrink the `other` bucket (23% of
  // real flagged plies). They ship gated, and "gated correctly" vs "gated too
  // tightly" is only answerable from the real population — so the sweep emits
  // the GATE that stopped each one, and this tallies what came back across
  // every game this run analysed. Not a pass/fail row: it is a MEASUREMENT,
  // and a run with nothing unnamed is a good run, not a broken instrument.
  const unnamed = loop.listener.getCapturedEvents()
    .filter((e) => String(e.source ?? '') === 'autoAnalyzeGame.unnamedSlip')
    .map((e) => String(e.summary ?? ''));
  const tally = new Map();
  for (const line of unnamed) {
    for (const part of (line.split('section 14 declined: ')[1] ?? '').split(' | ')) {
      const m = /^([a-z-]+): (.*)$/.exec(part.trim());
      if (!m) continue;
      // Collapse the numbers out of the reason so the SHAPE tallies
      // ("cost 50cp is under the 150cp floor" and "cost 80cp…" are one gate).
      const shape = `${m[1]}: ${m[2].replace(/\d+/g, 'N').replace(/\b[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8][+#]?\b/g, '<san>')}`;
      tally.set(shape, (tally.get(shape) ?? 0) + 1);
    }
  }
  log(`\n  ── WHY THE APP COULD NOT NAME A SLIP (${unnamed.length} unnamed slip(s) this run) ──`);
  if (unnamed.length === 0) log('  (none — every flagged ply this run was named)');
  for (const [shape, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) log(`  ${String(n).padStart(3)}×  ${shape}`);
  for (const line of unnamed.slice(0, 3)) log(`  e.g. ${line.slice(0, 200)}`);

  await loop.listener.stop().catch(() => undefined);
  await loop.ctx.close();
  await browser.close();

  writeFileSync(`${outDir}/unnamed-slips.json`, JSON.stringify({ unnamed, tally: Object.fromEntries(tally) }, null, 2));
  writeFileSync(`${outDir}/report.json`, JSON.stringify({ base: BASE, student: STUDENT, gameA: { id: Acur.id, white: Acur.white, black: Acur.black }, gameB: { id: Bcur.id, white: Bcur.white, black: Bcur.black }, recordedA: recA, recordedB: recB, shared, results, controlTape: controlTapeUsed, loopTape }, null, 2));
  log(`[game] PAIR USED: AUDIT_GAME_A=${Acur.id} AUDIT_GAME_B=${Bcur.id} AUDIT_STUDENT=${STUDENT}  (A opponent ${oppAcur}, B opponent ${oppBcur}${oppB !== oppBcur ? `, first B was ${oppB}` : ''})`);
  const pass = results.filter((r) => r.pass).length;
  const verdict = usable ? (pass === results.length ? 'THE LOOP CLOSES' : 'THE LOOP DOES NOT CLOSE') : 'PAIR UNUSABLE — pin another pair';
  log(`\n${pass}/${results.length} — ${verdict} — report at ${outDir}/report.json`);
  process.exit(pass === results.length ? 0 : 1);
};

run().catch((e) => { console.error(e); process.exit(1); });
