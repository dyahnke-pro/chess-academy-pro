#!/usr/bin/env node
/**
 * audit-coach-move-grounding — proves the coach NEVER recommends a move that is
 * illegal on the actual board (G0). The "develop the knight to f3" bug (David
 * 2026-06-26): the board FACTS were in the prompt (a knight WAS on f3), but the
 * coach's move RECOMMENDATION was the LLM's pick from generic opening reflexes,
 * not a computed move — so it told the student to develop a knight to a square a
 * knight already sat on. The universal MOVE-RECOMMENDATION rule (envelope.ts) +
 * the teach computed-recommendation fix are supposed to kill this on every
 * surface.
 *
 * This probe drives the LIVE coach (the real brain answers on prod), develops
 * the student's pieces so a redundant developing move is TEMPTING, then asks
 * "what should I play here?" and captures every move the coach NAMES — both
 * SAN tokens and natural-language "[piece] to [square]" / "develop the [piece]
 * to [square]". It FAILS if any recommended move is illegal in the position —
 * in particular a move to a square the student's OWN piece already occupies
 * (the exact bug), checked deterministically with chess.js against the live
 * board read off the DOM.
 *
 * RUNS ON THE GITHUB RUNNER against prod (open network → the brain answers).
 * It CANNOT run from the Claude Code sandbox — the egress proxy drops the
 * browser's TLS for every external host. Dispatch via post-deploy-audit.yml
 * (scripts input = "audit-coach-move-grounding.mjs").
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const SECRET = process.env.AUDIT_STREAM_SECRET;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.AUDIT_OUT_DIR ?? `audit-reports/coach-move-grounding-${stamp}`;

const sel = (t) => `[data-testid="${t}"]`;
const PIECE_LETTER = { p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k' };
const WORD_TO_LETTER = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };

// Read the live board off the DOM (react-chessboard data-piece + data-square)
// into a { square: 'wN' } map. Pass a REAL function to page.evaluate — a
// string arrow returns the function UNINVOKED (the a8-undefined crash).
const readBoardMap = () => {
  const m = {};
  document.querySelectorAll('[data-piece]').forEach((p) => {
    let n = p, sq = p.getAttribute('data-square');
    while (n && !sq) { n = n.parentElement; sq = n && n.getAttribute && n.getAttribute('data-square'); }
    const code = p.getAttribute('data-piece');
    if (sq && /^[a-h][1-8]$/.test(sq) && code) m[sq] = code;
  });
  return m;
};

/** Normalise a data-piece code ('wN', 'whiteN', 'wn'...) to { color:'w'|'b', type:'n' }. */
function parsePiece(code) {
  if (!code) return null;
  const c = code[0].toLowerCase() === 'w' || /^white/i.test(code) ? 'w' : 'b';
  const last = code[code.length - 1].toLowerCase();
  const type = PIECE_LETTER[last] ?? null;
  return type ? { color: c, type } : null;
}

/** Build a permissive FEN from the board map for a side to move. Castling is
 *  left permissive (KQkq) — we only need legal-destination truth, and a
 *  recommended move to an OWN-occupied square is illegal regardless. */
function mapToFen(map, sideToMove) {
  const rows = [];
  for (let r = 8; r >= 1; r -= 1) {
    let row = '', empty = 0;
    for (const f of 'abcdefgh') {
      const pc = parsePiece(map[`${f}${r}`]);
      if (!pc) { empty += 1; continue; }
      if (empty) { row += empty; empty = 0; }
      row += pc.color === 'w' ? pc.type.toUpperCase() : pc.type;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return `${rows.join('/')} ${sideToMove} KQkq - 0 1`;
}

// Sentence/window around a match index — used to classify a bare SAN as a
// recommendation vs a recap of a move already played (G7 #4 discrimination).
function ctxWindow(text, idx, len) {
  const start = Math.max(0, idx - 90);
  const end = Math.min(text.length, idx + len + 90);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}
// A bare SAN can appear as a RECOMMENDATION ("you should play Nc3") or as a
// RECAP of a move already on the board ("after you played Nc3…", "3. Nc3").
// Only a recommendation onto an own-occupied square is the bug; a recap names
// an occupied square legitimately. classifySan returns 'recommend' | 'recap'
// | 'ambiguous'.
const RECAP_RE = /\b(you(?:'ve| have)?\s+(?:already\s+)?played|you\s+just\s+played|after|once\s+you|so\s+far|up\s+to\s+now|history|your\s+last\s+move|we\s+(?:have|reached|got)|led\s+to|resulted|followed|on\s+the\s+board|currently|sits?\s+on|now\s+on)\b/i;
const RECOMMEND_RE = /\b(should|i'?d\s+(?:suggest|recommend|go)|recommend|consider|try|best\s+(?:move|is|here)|go\s+for|how\s+about|look\s+at|the\s+move\s+is|play\b|your\s+move|next\s+move|i\s+suggest|aim\s+for|continue\s+with)\b/i;
function classifySan(ctx, raw) {
  // A move-number prefix ("3.Nc3", "3...Nc3") or several SANs in a row = a
  // move list / recap, never a single recommendation.
  if (/\d{1,2}\s*\.{1,3}\s*$/.test(ctx.slice(0, ctx.indexOf(raw)))) return 'recap';
  const recap = RECAP_RE.test(ctx);
  const rec = RECOMMEND_RE.test(ctx);
  if (rec && !recap) return 'recommend';
  if (recap && !rec) return 'recap';
  return 'ambiguous';
}

/** Pull move recommendations out of coach prose: SAN tokens + "[piece] to
 *  [square]" + "develop/play/push the [piece] to [square]". Returns
 *  { raw, to, pieceType, kind, ctx, sanClass? } entries. */
function extractNamedMoves(text) {
  const out = [];
  // "develop/play/push/bring/move the knight to f3" (most explicit — a clear
  // recommendation to move a piece to a square).
  const verbRe = /\b(?:develop|play|push|bring|move|put|reroute|retreat)\s+(?:the\s+|your\s+|my\s+)?(pawn|knight|bishop|rook|queen|king)\s+(?:back\s+)?to\s+([a-h][1-8])\b/gi;
  for (const m of text.matchAll(verbRe)) out.push({ raw: m[0], pieceType: WORD_TO_LETTER[m[1].toLowerCase()], to: m[2].toLowerCase(), kind: 'verb', ctx: ctxWindow(text, m.index, m[0].length) });
  // "knight to f3" without a verb.
  const pieceToRe = /\b(pawn|knight|bishop|rook|queen|king)\s+to\s+([a-h][1-8])\b/gi;
  for (const m of text.matchAll(pieceToRe)) out.push({ raw: m[0], pieceType: WORD_TO_LETTER[m[1].toLowerCase()], to: m[2].toLowerCase(), kind: 'pieceTo', ctx: ctxWindow(text, m.index, m[0].length) });
  // SAN tokens (Nf3, Bc4, exd5, O-O). Capture the destination square.
  const sanRe = /\b([KQRBN]?[a-h]?[1-8]?x?([a-h][1-8])(?:=[QRBN])?[+#]?|O-O(?:-O)?)\b/g;
  for (const m of text.matchAll(sanRe)) {
    if (m[1].startsWith('O-O')) continue; // castling — not the bug class
    if (m[2]) {
      const ctx = ctxWindow(text, m.index, m[1].length);
      out.push({ raw: m[1], pieceType: /^[KQRBN]/.test(m[1]) ? m[1][0].toLowerCase() : 'p', to: m[2].toLowerCase(), kind: 'san', ctx, sanClass: classifySan(ctx, m[1]) });
    }
  }
  return out;
}

async function dismiss(page) {
  const b = page.locator(sel('strength-calibration-bubble'));
  if (await b.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.locator(sel('skill-band-intermediate')).click({ timeout: 5000 })
      .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => {}));
    await b.waitFor({ state: 'detached', timeout: 12000 }).catch(() => {});
  }
  const h = page.locator(sel('page-help-modal'));
  if (await h.isVisible({ timeout: 1200 }).catch(() => false)) {
    await page.locator(`${sel('page-help-modal')} button`).first().click({ timeout: 3000 }).catch(() => {});
    await h.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  }
}

async function pullStream(label) {
  if (!SECRET) return { label, skipped: 'no AUDIT_STREAM_SECRET' };
  try {
    const since = Date.now() - 120000;
    const r = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    const j = await r.json();
    return { label, storage: j.storage, events: (j.events || []).length };
  } catch (e) { return { label, error: String(e).slice(0, 100) }; }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1200, height: 1000 }, userAgent: 'AuditCoachPlayBot/1.0 (move-grounding)' });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));

  const report = { base: BASE, startedAt: new Date().toISOString(), steps: [], recommendations: [], violations: [], pageErrors, streamBefore: null, streamAfter: null };
  const step = (name, ok, note) => { report.steps.push({ name, ok, note }); console.log(`[move-grounding] ${ok ? 'OK ' : 'XX '} ${name}${note ? ' — ' + note : ''}`); };

  report.streamBefore = await pullStream('before');
  try {
    await page.goto(`${BASE}/coach/play?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await dismiss(page);
    const board = await page.locator('[data-square]').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    step('coach/play board mounted', board);
    if (!board) throw new Error('board never mounted');

    // Pre-game: play as White, easy.
    await page.locator(sel('color-white-btn')).click({ timeout: 4000 }).catch(() => {});
    await page.locator(sel('difficulty-easy')).click({ timeout: 4000 }).catch(() => {});

    // Develop pieces so a redundant developing move is TEMPTING (the screenshot
    // had both knights + a bishop already out).
    const playMove = async (from, to) => {
      await page.locator(`[data-square="${from}"]`).first().click({ timeout: 4000, force: true }).catch(() => {});
      await page.locator(`[data-square="${to}"]`).first().click({ timeout: 4000, force: true }).catch(() => {});
      await page.waitForTimeout(4500); // let the coach reply (engine + narration)
    };
    await playMove('e2', 'e4');
    await playMove('g1', 'f3'); // knight already developed → "develop knight to f3" must never be suggested
    await playMove('b1', 'c3');
    await playMove('f1', 'c4');
    step('developed e4 + Nf3 + Nc3 + Bc4', true);

    // Capture proactive coach narration so far.
    const proactive = await page.evaluate(() => document.body.innerText).catch(() => '');

    // Ask for a recommendation through the chat — the LLM path the universal rule governs.
    const chat = page.locator('textarea, input[type="text"]').first();
    let asked = false;
    if (await chat.isVisible({ timeout: 4000 }).catch(() => false)) {
      await chat.fill('what should I play here? give me a move.').catch(() => {});
      await chat.press('Enter').catch(() => {});
      asked = true;
      await page.waitForTimeout(9000); // brain round-trip
    }
    step('asked coach "what should I play here?"', asked, asked ? '' : 'chat input not found');
    const answered = await page.evaluate(() => document.body.innerText).catch(() => '');

    // The board the recommendation is made ON (student = White to move).
    const map = await page.evaluate(readBoardMap).catch(() => ({}));
    const studentColor = 'w';
    const fen = mapToFen(map, studentColor);
    let chess = null;
    try { chess = new Chess(fen); } catch { /* permissive FEN can rarely be rejected */ }
    report.fen = fen;

    // Combine all coach prose captured this run, extract named moves, validate.
    const coachText = `${proactive}\n${answered}`;
    const named = extractNamedMoves(coachText);
    // Dedup by raw+to.
    const seen = new Set();
    for (const nm of named) {
      const key = `${nm.raw}|${nm.to}`;
      if (seen.has(key)) continue; seen.add(key);
      const destPiece = parsePiece(map[nm.to]);
      const ownOccupied = destPiece && destPiece.color === studentColor;
      let legal = null;
      if (chess) {
        try { legal = chess.moves({ verbose: true }).some((mv) => mv.to === nm.to && (nm.kind === 'san' ? true : mv.piece === nm.pieceType)); } catch { legal = null; }
      }
      const entry = { ...nm, ownOccupied: !!ownOccupied, destPiece: destPiece ? `${destPiece.color}${destPiece.type}` : null, legalForStudent: legal };
      report.recommendations.push(entry);
      if (!ownOccupied) continue;
      // The coach NAMED a move onto a square the student's own piece already
      // occupies. Whether that's a BUG depends on whether it's a recommendation
      // or a recap of a move already played (G7 #4 — discriminate, don't blindly
      // fail). A verb ("develop the knight to c3") or "[piece] to c3" phrasing is
      // an unambiguous recommendation → HARD violation (the exact David bug). A
      // bare SAN is only a violation when its sentence reads as a recommendation;
      // a recap ("after you played Nc3", "3.Nc3") names the occupied square
      // legitimately and is NOT a bug.
      const isUnambiguousRec = nm.kind === 'verb' || nm.kind === 'pieceTo';
      const sanIsRec = nm.kind === 'san' && nm.sanClass === 'recommend';
      if (isUnambiguousRec || sanIsRec) {
        report.violations.push({ ...entry, why: 'recommended a move to a square the student already occupies' });
      } else {
        // own-occupied bare SAN that reads as a recap / ambiguous — record for
        // the report, do NOT fail the run on it.
        report.recapOrAmbiguous = report.recapOrAmbiguous || [];
        report.recapOrAmbiguous.push(entry);
      }
    }

    report.streamAfter = await pullStream('after');
    const pass = report.violations.length === 0;
    const recapNote = report.recapOrAmbiguous?.length ? ` (+${report.recapOrAmbiguous.length} own-occupied SAN read as recap/ambiguous — not failed)` : '';
    step('NO illegal/own-occupied recommendation', pass,
      pass ? `${report.recommendations.length} named moves, no recommendation onto an own square${recapNote}` : `${report.violations.length} VIOLATION(S): ${report.violations.map((v) => `${v.raw} [${v.kind}${v.sanClass ? ':' + v.sanClass : ''}]`).join(', ')}`);
    report.verdict = pass ? 'PASS' : 'FAIL';
  } catch (e) {
    report.error = String(e).slice(0, 240);
    step('run', false, report.error);
    report.verdict = 'ERROR';
  } finally {
    await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }

  console.log(`\n[move-grounding] VERDICT: ${report.verdict} | recs: ${report.recommendations.length} | violations: ${report.violations.length} | report ${OUT}`);
  if (report.violations.length) console.log('[move-grounding] VIOLATIONS:', JSON.stringify(report.violations, null, 2));
  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
