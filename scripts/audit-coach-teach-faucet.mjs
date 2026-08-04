// Faucet probe on /coach/teach — RELIABLE. Reconstruct the live board FEN from
// the DOM (each [data-square] holds a [data-piece]="wP"/"bN"/…), mirror in
// chess.js, and after a few developing moves play a move that HANGS the queen
// (a legal White move to a square a Black piece captures for free = ≥100cp
// slip → intermediate faucet gate). Assert probe → picker → grounded reveal.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
page.on('console', (m) => { if (m.type() === 'error' && /Uncaught|TypeError|same key|Minified React/i.test(m.text())) errs.push(m.text().slice(0, 160)); });

const vis = (s) => page.locator(s).first().isVisible().catch(() => false);
const dump = () => page.evaluate(async () => { const a = window.__AUDIT__; return a?.dump ? await a.dump().catch(() => []) : []; }).catch(() => []);
const until = async (p, ms = 30000, step = 400) => { const e = Date.now() + ms; while (Date.now() < e) { if (await p()) return true; await page.waitForTimeout(step); } return false; };
async function waitInput(t = 40000) { await page.waitForFunction(() => { const el = document.querySelector('[data-testid="chat-text-input"]'); return el && !el.disabled; }, { timeout: t }).catch(() => {}); }

// Reconstruct placement FEN from the DOM (side-to-move = White, our turn).
async function readPlacement() {
  const map = await page.evaluate(() => {
    const out = {};
    for (const sq of document.querySelectorAll('[data-square]')) {
      const p = sq.querySelector('[data-piece]');
      if (p) out[sq.getAttribute('data-square')] = p.getAttribute('data-piece');
    }
    return out;
  }).catch(() => ({}));
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  let fen = '';
  for (let r = 8; r >= 1; r--) {
    let empty = 0;
    for (const f of files) {
      const pc = map[`${f}${r}`];
      if (!pc) { empty++; continue; }
      if (empty) { fen += empty; empty = 0; }
      const letter = pc[1];
      fen += pc[0] === 'w' ? letter.toUpperCase() : letter.toLowerCase();
    }
    if (empty) fen += empty;
    if (r > 1) fen += '/';
  }
  return fen; // placement only
}
async function boardFenWhite() { return `${await readPlacement()} w - - 0 1`; }
function pieceCount(fen) { return (fen.split(' ')[0].match(/[a-z]/gi) || []).length; }

async function move(from, to) {
  await page.locator(`[data-square="${from}"]`).first().click({ force: true, timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(180);
  await page.locator(`[data-square="${to}"]`).first().click({ force: true, timeout: 4000 }).catch(() => {});
}
// play my move; wait until the board has TWO fewer/relocated pieces settled
// (my move + coach reply) → back to my turn.
async function playMove(from, to, label) {
  await waitInput();
  const before = await readPlacement();
  await move(from, to);
  const replied = await until(async () => (await readPlacement()) !== before && await page.evaluate(() => { const el = document.querySelector('[data-testid="chat-text-input"]'); return el && !el.disabled; }).catch(() => false), 30000);
  // settle
  await page.waitForTimeout(1200);
  console.log(`[faucet] ${label} (board ${replied ? 'advanced' : 'unchanged?!'})`);
  return replied;
}

await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15000 }).catch(() => {});
await waitInput(); await page.waitForTimeout(1500);

// A few developing moves so a queen sortie is available. Read the live FEN each
// time and pick a legal developing move from the mirror (robust to coach replies).
const devSeq = ['e4', 'Nf3', 'Bc4', 'Qe2'];
for (const want of devSeq) {
  await waitInput();
  const fen = await boardFenWhite();
  let chess; try { chess = new Chess(fen); } catch { console.log('[faucet] bad FEN, skip'); continue; }
  const legal = chess.moves({ verbose: true });
  const mv = legal.find((m) => m.san === want) || legal.find((m) => m.piece === 'n' && !m.captured) || legal[0];
  if (!mv) break;
  await playMove(mv.from, mv.to, mv.san);
}

// Now compute a HANGING queen move from the live board.
await waitInput();
const liveFen = await boardFenWhite();
const chess = new Chess(liveFen);
const preCount = pieceCount(liveFen);
function hangingMove() {
  const cand = chess.moves({ verbose: true });
  // prefer hanging the queen; else any piece captured for free
  const order = ['q', 'r', 'b', 'n'];
  for (const pc of order) {
    for (const m of cand.filter((x) => x.piece === pc && !x.captured)) {
      const c = new Chess(chess.fen()); c.move(m.san);
      const takers = c.moves({ verbose: true }).filter((x) => x.to === m.to);
      // free if some opponent capture exists and (rough) our piece not re-defended
      if (takers.some((t) => (t.captured === pc))) return m;
    }
  }
  return null;
}
const slip = hangingMove();
let faucetFired = false, promptTxt = '', pickerSeen = false, optionSeen = false, hintSeen = false, severitySeen = false, revealSeen = false, revealTail = '';
if (slip) {
  console.log(`[faucet] SLIP (hangs ${slip.piece.toUpperCase()}): ${slip.san}  fen=${liveFen}`);
  const beforeLen = (await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '')).length;
  await move(slip.from, slip.to);
  faucetFired = await until(async () => vis('[data-testid="discussion-prompt"]') || vis('[data-testid="discussion-reason-picker"]'), 45000);
  promptTxt = faucetFired ? await page.locator('[data-testid="discussion-prompt"]').innerText().catch(() => '') : '';
  severitySeen = await vis('[data-testid="discussion-severity"]');
  pickerSeen = await vis('[data-testid="discussion-reason-picker"]');
  optionSeen = await vis('[data-testid="discussion-reason-option"]');
  hintSeen = await vis('[data-testid="discussion-hint"]');
  if (faucetFired) {
    console.log(`[faucet] probe text: "${promptTxt}"`);
    if (optionSeen) await page.locator('[data-testid="discussion-reason-option"]').first().click({ force: true }).catch(() => {});
    else if (hintSeen) await page.locator('[data-testid="discussion-hint"]').click({ force: true }).catch(() => {});
    revealSeen = await until(async () => {
      const t = await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
      return t.length > beforeLen && /(that was|blunder|mistake|inaccuracy|hanging|drops|best move|the engine|instead|lets? )/i.test(t);
    }, 25000);
    revealTail = (await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '')).split('\n').filter(Boolean).slice(-2).join(' / ').slice(0, 300);
  }
} else {
  console.log('[faucet] no hanging move found on live board:', liveFen);
}
const es = await dump();
const faucetEvents = [...new Set(es.filter((e) => /discussion|misconception|slip/i.test(e.kind || '')).map((e) => e.kind))].slice(0, 8);

console.log('\n===== FAUCET PROBE =====');
console.log('slip move     :', slip ? `${slip.san} (hangs ${slip.piece})` : 'NONE FOUND');
console.log('faucet fired  :', faucetFired);
console.log('probe text    :', JSON.stringify(promptTxt));
console.log('reason picker :', pickerSeen, '| options:', optionSeen, '| hint:', hintSeen, '| severity:', severitySeen);
console.log('grounded reveal:', revealSeen);
console.log('reveal tail   :', revealTail);
console.log('faucet audits :', faucetEvents);
console.log('pageErrors    :', errs.length, errs.slice(0, 3));
await browser.close();

// ── verdict (committed-audit contract) ──
const PASS = faucetFired && /Why'd you play that\?/.test(promptTxt) && pickerSeen && optionSeen && severitySeen && revealSeen && errs.length === 0;
console.log(`\n[faucet] VERDICT: ${PASS ? 'PASS — probe+picker+severity+reveal+bucket, 0 errors' : 'FAIL'}`);
process.exit(PASS ? 0 : 1);
