#!/usr/bin/env node
/**
 * show-freeplay-narrations — drive a REAL free-play game on live prod (Learn),
 * then print the FULL computed-narration transcript: every
 * `coach-narration-spoken` line the app emitted, in order, with the board it
 * was spoken about and WHICH computer produced it (voicePackage / hintRegister
 * / engineRead / pieceQuality / trackA / rejectedTempting / plan / …).
 *
 * This is not a pass/fail audit — it is a window onto exactly what the free-play
 * coach says, move by move, so the narration quality can be read directly.
 *
 * Muted (muteTtsForAudit): the app still emits the SAME spoken text on the same
 * text-proportional delay, so nothing about the words changes and no TTS is
 * billed.
 *
 * Run:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   [PLIES=30] node scripts/show-freeplay-narrations.mjs
 */
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchAuditBrowser } from './audit-lib/engine.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PLIES = Number(process.env.PLIES || 30);
const OUT = join('audit-reports', `freeplay-narrations-${new Date().toISOString().replace(/[:.]/g, '-')}`);

/** Pull the spoken text out of an audit entry's summary (`… "the text"`) or,
 *  failing a quoted form, the whole summary. */
function saidText(e) {
  const s = e.summary ?? '';
  const m = /"([\s\S]*)"\s*$/.exec(s);
  return (m ? m[1] : s).trim();
}

/** A short label for which code-computer produced a spoken line. */
function computer(source) {
  const src = source ?? '';
  const tail = src.split('.').pop() || src;
  return tail || '(unknown)';
}

function bestPlausible(mirror, legal) {
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let best = null;
  let bestScore = -Infinity;
  for (const m of legal) {
    if (m.san.includes('#')) return m;
    let score = 0;
    if (m.captured) score += VAL[m.captured] * 10;
    const probe = new Chess(mirror.fen());
    probe.move(m.san);
    if (probe.isAttacked(m.to, probe.turn())) score -= VAL[m.piece] * 8;
    if (m.san.startsWith('O-O')) score += 25;
    if (m.piece === 'k') score -= 40;
    if (m.piece === 'q' && mirror.moveNumber() < 12) score -= 12;
    if ('nb'.includes(m.piece) && /[1-8]/.test(m.from[1]) && !m.captured) score += 6;
    if (['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to)) score += 4;
    if (probe.isCheck()) score += 3;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

/** The app's own rolling audit buffer, read live out of Dexie. */
async function dumpAudit(page) {
  return page.evaluate(async () => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    try {
      const db = await open();
      const row = await new Promise((res) => {
        const tx = db.transaction('meta', 'readonly').objectStore('meta').get('app-audit-log.v1');
        tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null);
      });
      return row?.value ? JSON.parse(row.value) : [];
    } catch { return []; }
  }).catch(() => []);
}

async function waitCoachReply(page, sinceTs, timeoutMs = 45_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.locator('[data-testid="blunder-interception"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="blunder-continue"]').click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    const hits = (await dumpAudit(page)).filter((e) =>
      e.kind === 'coach-turn-checkpoint'
      && typeof e.summary === 'string' && e.summary.startsWith('move-committed san=')
      && (e.timestamp ?? 0) > sinceTs);
    if (hits.length) {
      const latest = hits.reduce((a, b) => ((a.timestamp ?? 0) > (b.timestamp ?? 0) ? a : b));
      return { san: /san=(\S+)/.exec(latest.summary)?.[1] ?? null, fen: latest.fen ?? null, ts: latest.timestamp ?? Date.now() };
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function clearFirstRunOverlays(page) {
  for (const [modal, button] of [
    ['ai-consent-modal', 'ai-consent-allow'],
    ['strength-calibration-bubble', 'skill-band-intermediate'],
  ]) {
    if (await page.locator(`[data-testid="${modal}"]`).isVisible().catch(() => false)) {
      await page.locator(`[data-testid="${button}"]`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }
  await page.locator('[data-testid="page-help-close"], [data-testid="page-help-modal"] button')
    .first().click({ timeout: 2500 }).catch(() => {});
}

/** Play a real game on the Learn board; return the SAN move list. */
async function playGame(page, plies) {
  const mirror = new Chess();
  const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'];
  const moves = [];
  let lastTs = Date.now() - 1;
  for (let i = 0; i < plies && !mirror.isGameOver(); i += 1) {
    const scripted = OPENING[moves.length];
    const legal = mirror.moves({ verbose: true });
    const pick = (scripted && legal.find((m) => m.san === scripted)) || bestPlausible(mirror, legal);
    if (!pick) break;
    try {
      await page.locator(`[data-square="${pick.from}"]`).click({ force: true, timeout: 8000 });
      await page.locator(`[data-square="${pick.to}"]`).click({ force: true, timeout: 8000 });
    } catch { break; }
    mirror.move(pick.san);
    moves.push(pick.san);
    const reply = await waitCoachReply(page, lastTs);
    if (!reply?.san) break;
    lastTs = reply.ts;
    if (mirror.moves().includes(reply.san)) { mirror.move(reply.san); moves.push(reply.san); }
    else if (reply.fen) { try { mirror.load(reply.fen); moves.push(reply.san); } catch { break; } }
    else break;
    await page.waitForTimeout(1500);  // let the async narration land before the next move
  }
  return moves;
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const { engine, browser, contextOptions } = await launchAuditBrowser();
  console.log(`[freeplay-narr] engine=${engine} · ${BASE} · ${PLIES} plies`);
  const ctx = await browser.newContext(contextOptions);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(20_000);      // deferred seed + engine warm
  await clearFirstRunOverlays(page);

  const moves = await playGame(page, PLIES);
  console.log(`[freeplay-narr] played ${moves.length} half-moves: ${moves.join(' ')}`);

  const log = await dumpAudit(page);
  const spoken = log
    .filter((e) => e.kind === 'coach-narration-spoken')
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  // Build the transcript: each spoken line, its computer, and the board.
  const lines = [];
  lines.push(`FREE-PLAY NARRATION TRANSCRIPT — ${BASE}`);
  lines.push(`game: ${moves.join(' ')}`);
  lines.push(`${spoken.length} spoken lines captured (muted; text is exactly what the coach would speak)`);
  lines.push('='.repeat(78));
  let n = 0;
  for (const e of spoken) {
    const text = saidText(e);
    if (!text) continue;
    n += 1;
    const moveNo = e.fen ? (e.fen.split(' ')[5] ?? '?') : '?';
    const stm = e.fen ? (e.fen.split(' ')[1] === 'w' ? 'white to move' : 'black to move') : '';
    lines.push('');
    lines.push(`[${n}] «${computer(e.source)}»  move ${moveNo} · ${stm}`);
    if (e.fen) lines.push(`    fen: ${e.fen}`);
    lines.push(`    "${text}"`);
  }
  const transcript = lines.join('\n');
  await writeFile(join(OUT, 'transcript.txt'), transcript, 'utf8');
  await writeFile(join(OUT, 'raw-spoken.json'), JSON.stringify(spoken, null, 2), 'utf8');

  console.log('\n' + transcript + '\n');
  console.log(`[freeplay-narr] transcript → ${join(OUT, 'transcript.txt')}`);
  if (pageErrors.length) console.log(`[freeplay-narr] ${pageErrors.length} page error(s): ${pageErrors.slice(0, 3).join(' | ')}`);
  await browser.close();
};

main().catch((e) => { console.error('[freeplay-narr] FAILED', e); process.exit(1); });
