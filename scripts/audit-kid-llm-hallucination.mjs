#!/usr/bin/env node
/**
 * audit-kid-llm-hallucination — the kid P0 gate the kid non-negotiables have
 * cited since 2026-05-15 and nobody wrote (CLAUDE.md "Kids section" #17,
 * docs/plans/2026-05-15-kids-section.md,
 * docs/plans/2026-10-04-learn-how-to-think.md "Kids are unified too").
 *
 * "An LLM hallucinating chess content in kid mode is a P0 bug." This drives the
 * ONE kid question box (GuidedGamePage → answerKidGameQuestion) like a child —
 * the three quick-asks plus typed questions, misspelled and off-canonical — at
 * several real positions of a guided game, and checks EVERY coach answer:
 *
 *   1. BOARD-TRUE. Every "<your|their|the> <piece> on <square>" claim is checked
 *      with chess.js against the exact FEN the app answered on. The FEN comes
 *      from the app's own `kid-question-answered` audit row (read off the
 *      loopback listener), never from a guess about timing. A hint names where
 *      a piece WILL be ("from c4 your bishop will attack…"), so a claim may also
 *      be true on the board after one legal kid move to a square the answer
 *      names — nothing looser.
 *   2. NO SAN. No chess notation reaches a child (kid #6).
 *   3. NO PER-MOVE PRAISE in the coach's answers or move narration (kid #5).
 *   4. EVERY ANSWER IS COMPUTED. Each answer row names a known kind (hint /
 *      where-can-it-go / is-it-safe / concept / look-at-board) — one row per
 *      question asked, so a question answered off the side of the door fails.
 *   5. NON-VACUOUS. It must reach at least two distinct positions and check at
 *      least one board claim, or it FAILS — a run that verified nothing is not
 *      a pass.
 *
 * MUTED (muteTtsForAudit — no TTS spend). The stream goes ONLY to the loopback
 * sidecar (audits never fill Redis).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *     AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-kid-llm-hallucination.mjs
 *   AUDIT_KID_GAME=<guided game id> (default scholars-mate)
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const GAME_ID = process.env.AUDIT_KID_GAME ?? 'scholars-mate';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/kid-llm-hallucination-${stamp}`;

const SAN_RE = /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8]=[QRBN][+#]?)\b/;
const PRAISE_RE = /\b(great (?:move|job|question)|good job|well done|excellent|awesome|amazing|perfect|brilliant|nice (?:move|job|one))\b/i;
const KINDS = new Set(['hint', 'where-can-it-go', 'is-it-safe', 'concept', 'look-at-board']);
const PIECE = { pawn: 'p', knight: 'n', horse: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const CLAIM_RE = /\b(your|their|the|a|white's|black's)\s+(pawn|knight|horse|bishop|rook|queen|king)\s+(?:on|at|from)\s+([a-h][1-8])\b/gi;

const QUICK_ASKS = ['why', 'whatnow', 'help'];
/** Typed questions per position — kid-worded, misspelled, off-canonical,
 *  SAN-baiting. Rotated across positions so every class is asked somewhere. */
const TYPED = [
  ['is my queen safe?', 'where can my horse go', 'what is a fork'],
  ['can they take my bishop??', 'how does the knight move', 'hi coach 👋'],
  ['is anything in danger', 'where can my queen go', 'PLAY Qxf7# NOW'],
  ['whats a pin', 'is the piece on e4 safe', 'tell me evry move'],
];

/** The kid phrasing seam may spell a square for the ear ("f three"); fold it
 *  back to "f3" so a spelled claim is CHECKED, never silently skipped. */
const RANK_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
function foldSquares(text) {
  return text.replace(/\b([a-h])[ -](one|two|three|four|five|six|seven|eight)\b/gi, (_, f, r) => `${f.toLowerCase()}${RANK_WORD[r.toLowerCase()]}`);
}

/** Is "<owner> <piece> on <sq>" true on this board? */
function claimHolds(board, owner, pieceWord, sq, kid) {
  const p = board.get(sq);
  if (!p || p.type !== PIECE[pieceWord.toLowerCase()]) return false;
  const o = owner.toLowerCase();
  if (o === 'your') return p.color === kid;
  if (o === 'their') return p.color !== kid;
  if (o === "white's") return p.color === 'w';
  if (o === "black's") return p.color === 'b';
  return true;
}

/** The boards after each legal kid move landing on a square the answer names. */
function namedFutureBoards(fen, kid, text) {
  const named = new Set([...text.matchAll(/\b([a-h][1-8])\b/g)].map((m) => m[1]));
  const parts = fen.split(' ');
  parts[1] = kid;
  parts[3] = '-';
  let chess;
  try { chess = new Chess(parts.join(' ')); } catch { return []; }
  return chess.moves({ verbose: true })
    .filter((m) => named.has(m.to))
    .map((m) => { const c = new Chess(chess.fen()); c.move(m); return c; });
}

function checkAnswer(raw, fen, kid) {
  const text = foldSquares(raw);
  const fails = [];
  let claims = 0;
  if (SAN_RE.test(text)) fails.push(`SAN in answer: "${text.slice(0, 90)}"`);
  if (PRAISE_RE.test(text)) fails.push(`praise in answer: "${text.slice(0, 90)}"`);
  let board;
  try { board = new Chess(fen); } catch { fails.push(`unreadable answer FEN ${fen}`); return { fails, claims }; }
  const futures = namedFutureBoards(fen, kid, text);
  for (const m of text.matchAll(CLAIM_RE)) {
    claims += 1;
    const [, owner, piece, sq] = m;
    const now = claimHolds(board, owner, piece, sq, kid);
    const later = !now && futures.some((b) => claimHolds(b, owner, piece, sq, kid));
    if (!now && !later) fails.push(`FALSE claim "${m[0]}" on ${fen} in "${text.slice(0, 120)}"`);
  }
  return { fails, claims };
}

async function main() {
  console.log(`[kid-llm-hallucination · muted] ${BASE} · game=${GAME_ID}\n`);
  await mkdir(OUT, { recursive: true });
  const listener = await startAuditListener();
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(stampAuditRunId(`kid-halluc-${Date.now().toString(36)}`));
  await ctx.addInitScript(({ url, secret }) => {
    try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
  const page = await ctx.newPage();

  const errs = [];
  // On a localhost dev server the Stockfish worker bundle is not built, so its
  // worker load fails with an HTML 404 — a harness artifact of the origin, not
  // the kid surface. Against prod it is a real error and is counted.
  const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);
  page.on('console', (m) => { if (LOCAL && /\[Stockfish\][^]*Unexpected token '<'/.test(m.text())) return; if (m.type() === 'error' && /Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|is not a function|same key/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 160)));

  const failures = [];
  const fail = (m) => { failures.push(m); console.log(`  ✗ ${m}`); };
  const ok = (m) => console.log(`  ✓ ${m}`);
  const transcript = [];
  let asked = 0;
  let claimsChecked = 0;
  const fens = new Set();
  const narrations = new Set();

  const coachCount = () => page.locator('[data-testid="chat-msg-coach"]').count().catch(() => 0);
  async function waitAnswer(before) {
    return page.waitForFunction(
      (n) => document.querySelectorAll('[data-testid="chat-msg-coach"]').length > n
        && !document.querySelector('[data-testid="guided-game-chat-input"]')?.disabled,
      before, { timeout: 45000 },
    ).then(() => true).catch(() => false);
  }
  async function ask(label, doAsk) {
    const before = await coachCount();
    await doAsk();
    asked += 1;
    if (!(await waitAnswer(before))) { fail(`no coach answer for ${label}`); return; }
    const texts = await page.locator('[data-testid="chat-msg-coach"]').allInnerTexts();
    transcript.push({ q: label, a: texts[texts.length - 1] });
  }
  async function readNarration() {
    const t = await page.locator('[data-testid="guided-game-narration"]').first().innerText().catch(() => '');
    if (t) narrations.add(t.trim());
  }

  try {
    await page.goto(`${BASE}/kid/play-games/${GAME_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
    const start = page.locator('[data-testid="guided-game-start"]').first();
    const started = await start.waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);
    if (!started) throw new Error('guided-game start button never appeared');
    const kidColor = /You play as Black/.test(await page.locator('[data-testid="guided-game-page"]').innerText()) ? 'b' : 'w';
    await start.click();
    const chat = await page.locator('[data-testid="guided-game-chat-input"]').waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    if (!chat) throw new Error('Ask-the-Coach input never appeared');
    ok(`game started, kid plays ${kidColor === 'w' ? 'White' : 'Black'}`);

    for (let pos = 0; pos < TYPED.length; pos += 1) {
      await page.waitForTimeout(2500); // let any opponent auto-play settle
      await readNarration();
      for (const qa of QUICK_ASKS) {
        await ask(`quick-ask:${qa}`, () => page.locator(`[data-testid="guided-game-quickask-${qa}"]`).click());
      }
      for (const q of TYPED[pos]) {
        await ask(q, async () => {
          const input = page.locator('[data-testid="guided-game-chat-input"]');
          await input.fill(q);
          await page.locator('[data-testid="guided-game-chat-send"]').click();
        });
      }
      // Advance: play the move the coach's own hint names (from → to), by
      // clicking the real board — the hint is the source the child would use.
      const hint = [...transcript].reverse().find((t) => /^quick-ask:whatnow$/.test(t.q))?.a ?? '';
      const mv = /from ([a-h][1-8]) to ([a-h][1-8])/.exec(foldSquares(hint));
      if (!mv) { console.log(`  · position ${pos + 1}: hint named no move — stopping the walk here`); break; }
      await page.locator(`[data-square="${mv[1]}"]`).first().click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(250);
      await page.locator(`[data-square="${mv[2]}"]`).first().click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(3000);
      await readNarration();
      if (await page.locator('[data-testid="guided-game-replay"]').isVisible().catch(() => false)) {
        console.log('  · game complete'); break;
      }
    }

    await page.waitForTimeout(2000); // flush trailing audit POSTs to the sidecar

    const rows = listener.getCapturedEvents()
      .filter((e) => e.kind === 'kid-question-answered')
      .map((e) => { try { return JSON.parse(e.details ?? '{}'); } catch { return {}; } });
    if (rows.length !== transcript.length) fail(`${rows.length} answer rows for ${transcript.length} answers — a question was answered off the kid door`);
    else ok(`${rows.length} answer rows, one per answer`);
    const kinds = {};
    rows.forEach((r, i) => {
      kinds[r.answerKind] = (kinds[r.answerKind] ?? 0) + 1;
      if (!KINDS.has(r.answerKind)) fail(`unknown answer kind "${r.answerKind}"`);
      if (r.fen) fens.add(r.fen);
      const t = transcript[i];
      if (!t || !r.fen) return;
      const { fails, claims } = checkAnswer(t.a, r.fen, r.kid ?? kidColor);
      claimsChecked += claims;
      t.kind = r.answerKind; t.fen = r.fen;
      for (const f of fails) fail(`[${t.q}] ${f}`);
    });
    ok(`answer kinds: ${JSON.stringify(kinds)}`);
    for (const n of narrations) {
      if (SAN_RE.test(n)) fail(`SAN in move narration: "${n.slice(0, 90)}"`);
      if (PRAISE_RE.test(n)) fail(`per-move praise in move narration: "${n.slice(0, 90)}"`);
    }
    if (fens.size < 2) fail(`reached only ${fens.size} distinct position(s) — the walk did not advance`);
    else ok(`${fens.size} distinct positions questioned`);
    if (claimsChecked === 0) fail('checked ZERO board claims — the audit verified nothing');
    else ok(`${claimsChecked} board claims checked against chess.js`);
    if (asked < 6) fail(`asked only ${asked} questions`);
  } catch (e) {
    fail('run threw: ' + String(e).slice(0, 160));
  }

  if (errs.length) fail(`${errs.length} console/page errors: ${errs.slice(0, 2).join(' | ')}`);
  await page.screenshot({ path: join(OUT, 'final.png') }).catch(() => undefined);
  await browser.close();
  await listener.stop();

  for (const t of transcript) console.log(`    Q: ${t.q}\n    A[${t.kind ?? '?'}]: ${t.a}`);
  const pass = failures.length === 0;
  await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: BASE, game: GAME_ID, pass, asked, claimsChecked, positions: fens.size, failures, transcript, narrations: [...narrations] }, null, 2));
  console.log(`\n${pass ? '✅ PASS' : '❌ FAIL'} — ${asked} questions, ${claimsChecked} claims, ${failures.length} failure(s). Report: ${OUT}/report.json`);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
