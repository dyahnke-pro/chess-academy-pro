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
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchAuditBrowser } from './audit-lib/engine.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PLIES = Number(process.env.PLIES || 30);
const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const STUDENT_DEPTH = Number(process.env.STUDENT_DEPTH || 14);

/** The student plays REAL Stockfish (full strength) so the game is sound and
 *  tactic-rich — a fair board for the DNA devices (but-turn, calculation,
 *  multi-reason why) to have genuine chances. Returns the best move in UCI. */
function bestMoveUci(fen) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let best = null;
    sf.stdout.on('data', (d) => {
      const m = /bestmove (\S+)/.exec(d.toString());
      if (m) { best = m[1]; sf.kill(); res(best); }
    });
    sf.on('error', () => res(null));
    sf.stdin.write(`position fen ${fen}\ngo depth ${STUDENT_DEPTH}\n`);
    setTimeout(() => { try { sf.kill(); } catch { /* */ } res(best); }, 12_000);
  });
}
const OUT = join('audit-reports', `freeplay-narrations-${new Date().toISOString().replace(/[:.]/g, '-')}`);

/** The FULL spoken text. `narrationText` carries the whole line; `summary` is
 *  length-capped by the audit logger and MUST NOT be used for display — reading
 *  it truncated every sample (David 2026-08-22: "STILL FUCKING CUT SHORT"). Fall
 *  back to the quoted tail of summary only when narrationText is absent. */
function saidText(e) {
  if (typeof e.narrationText === 'string' && e.narrationText.trim()) return e.narrationText.trim();
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

/** Play a real game on the Learn board; return the SAN move list. The STUDENT
 *  (the side we drive) plays a short opening book then full-strength Stockfish;
 *  the COACH replies through the app's own rating-limited engine. */
async function playGame(page, plies) {
  const mirror = new Chess();
  // A sharp, natural opening for the student side so tactics arise early.
  const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4'];
  const moves = [];
  let lastTs = Date.now() - 1;
  for (let i = 0; i < plies && !mirror.isGameOver(); i += 1) {
    const scripted = OPENING[moves.length];
    const legal = mirror.moves({ verbose: true });
    let pick = scripted && legal.find((m) => m.san === scripted);
    if (!pick) {
      const uci = await bestMoveUci(mirror.fen());
      pick = uci && legal.find((m) => m.from === uci.slice(0, 2) && m.to === uci.slice(2, 4)
        && (uci.length < 5 || (m.promotion ?? '') === uci[4]));
    }
    if (!pick) pick = bestPlausible(mirror, legal);
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

  // LLM FORWARD (branch-on-localhost mode): vite dev doesn't serve the
  // /api/llm/deepseek proxy, so the coach can't voice. Forward those POSTs to a
  // working origin (prod) from the NODE side — the branch code runs locally, only
  // the LLM HTTP round-trip goes to prod, so the narration is REAL voiced output
  // of the branch's computed facts. Set LLM_FORWARD_ORIGIN=https://chess-academy-pro.vercel.app.
  const fwd = process.env.LLM_FORWARD_ORIGIN;
  if (fwd) {
    let fwdOk = 0; let fwdErr = 0;
    await page.route('**/api/llm/**', async (route) => {
      const req = route.request();
      try {
        const res = await fetch(`${fwd}${new URL(req.url()).pathname}`, {
          method: req.method(),
          headers: { ...req.headers(), host: new URL(fwd).host },
          body: req.postData() ?? undefined,
        });
        const body = await res.text();
        fwdOk += 1;
        await route.fulfill({ status: res.status, body, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' } });
      } catch (e) {
        fwdErr += 1;
        await route.abort();
        void e;
      }
    });
    console.log(`[freeplay-narr] LLM forward → ${fwd}/api/llm (node-side)`);
    process.on('exit', () => console.log(`[freeplay-narr] LLM forward: ${fwdOk} ok, ${fwdErr} err`));
  }

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
  // ── ROUGH DNA TALLY (heuristic — a signal, not a grader) ─────────────────
  // Over the DISTINCT narration lines (drop the compute→package→speak echoes),
  // count how often each Naroditsky device appears. Answers "does it follow the
  // teaching DNA" quantitatively against the measured pattern spec.
  const distinct = [];
  const seenText = new Set();
  for (const e of spoken) {
    const t = saidText(e);
    if (!t || t.length < 8) continue;
    const key = t.slice(0, 40).toLowerCase();
    if (seenText.has(key)) continue;
    seenText.add(key);
    distinct.push(t);
  }
  const rx = {
    'but-turn':        /\b(but|however)\b.*\b(fails|runs into|refut|drops|loses|doesn.?t|falls apart)\b|tempt|you.?d (love|want) to|looks (natural|tempting|good)|seductive/i,
    'calculation':     /\bif\b[^.]*\bthen\b|\band if\b|→|\bfollowed by\b|[NBRQK]?[a-h]?x?[a-h][1-8][+#]?\b.*\b(and|then)\b.*[NBRQK]?[a-h]?x?[a-h][1-8]/,
    'multi-reason':    /,\s.*\band\b.*,|;.*\band\b/,
    'uncertainty':     /\b(unclear|murky|roughly|about equal|hard to say|double-edged|may|might|probably|likely|it.?s not obvious)\b/i,
    'opponent-intent': /\b(they want|he wants|she wants|watch out|threat|is coming)\b/i,
    'naming/pattern':  /\b(the same idea|pattern|fork|pin|skewer|outpost|battery|passed pawn|the .* mate)\b/i,
  };
  const tally = Object.fromEntries(Object.entries(rx).map(([k, re]) =>
    [k, distinct.filter((t) => re.test(t)).length]));
  const pct = (n) => distinct.length ? `${Math.round((100 * n) / distinct.length)}%` : '—';

  lines.push('');
  lines.push('─'.repeat(78));
  lines.push(`DNA TALLY (heuristic) over ${distinct.length} distinct narration lines:`);
  lines.push('  device            count   share    DNA target');
  const targets = { 'but-turn': '~33% (all 147 videos)', 'calculation': '~28% (beats principle 5:1)', 'multi-reason': 'avg 3.4 reasons/move', 'uncertainty': '~21%', 'opponent-intent': 'present (prophylaxis ~2%)', 'naming/pattern': '~8%' };
  for (const [k, n] of Object.entries(tally)) {
    lines.push(`  ${k.padEnd(17)} ${String(n).padStart(4)}   ${pct(n).padStart(5)}    ${targets[k]}`);
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
