/**
 * personal-coach-drive.mjs — a TRANSPARENT interactive drive of the live
 * coach so a human (me) can READ every answer and judge it, instead of
 * trusting a pass/fail regex. Sets specific positions, asks pointed
 * questions, prints Q + full A verbatim.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const BRAIN_TIMEOUT = 75_000;
const log = (s) => console.log(s);

async function snap(page) {
  return page.$$eval('[data-testid="chat-message-assistant"]', (els) => els.map((e) => {
    const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b?.textContent ?? '';
    let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); return t.trim();
  }));
}
async function ask(page, prompt) {
  const before = new Set(await snap(page));
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  await input.click(); await input.fill(prompt);
  await page.locator('[data-testid="chat-send-btn"]').click();
  const ACK = /board'?s?\s+(?:is\s+)?set|you'?re\s+playing|position is set|taking too long|try again|trouble connecting|back online/i;
  try {
    await page.waitForFunction((prev) => {
      const els = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')];
      return els.some((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b?.textContent ?? ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); t = t.trim(); return t.length > 12 && !prev.includes(t); });
    }, [...before], { timeout: BRAIN_TIMEOUT });
  } catch { return '(no answer captured)'; }
  // settle: wait for length to stabilize
  let prev = -1, stable = 0, ans = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(600);
    const fresh = (await snap(page)).filter((t) => !before.has(t) && !ACK.test(t));
    const cur = fresh.length ? fresh.reduce((a, b) => (b.length > a.length ? b : a)) : '';
    if (cur.length === prev) { stable++; if (stable >= 3) { ans = cur; break; } } else stable = 0;
    prev = cur.length; ans = cur;
  }
  return ans || '(empty)';
}
async function scrapeFen(page) {
  const map = await page.evaluate(() => { const m = {}; document.querySelectorAll('[data-piece]').forEach((p) => { let n = p, sq = p.getAttribute('data-square'); while (n && !sq) { n = n.parentElement; sq = n?.getAttribute?.('data-square'); } if (sq) m[sq] = p.getAttribute('data-piece'); }); return m; });
  const P = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
  if (!Object.keys(map).length) return null;
  const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = map[f + r]; if (pc && P[pc]) { if (e) { row += e; e = 0; } row += P[pc]; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join('/');
}
async function setBoard(page, fen) {
  const target = fen.split(' ')[0];
  await ask(page, `set the board to ${fen}`);
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(800); if ((await scrapeFen(page)) === target) return true; }
  return (await scrapeFen(page)) === target;
}
async function goto(page, path, mount) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (mount) await page.locator(`[data-testid="${mount}"]`).waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3500);
}

const PROBES_PLAY = [
  { setup: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 7', q: "Which exact square is my (White's) king on right now?", want: 'king on g1' },
  { setup: '4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1', q: 'Counting material, am I (White) ahead or behind, and by roughly how much?', want: 'White is DOWN ~3 (rook+pawn vs queen)' },
  { setup: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', q: 'Is there a forced checkmate in one move here? If so, give the exact move.', want: 'Ra8# (mate in one)' },
  { setup: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', q: 'Is there a forced mate in one for me here?', want: 'NO mate' },
  { setup: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', q: 'What piece, if any, is on the e5 square right now?', want: 'e5 is empty' },
  { setup: '6k1/8/8/8/8/8/6q1/6K1 w - - 0 1', q: 'Is my king in check right now? Answer yes or no and why.', want: 'YES, in check (Qg2+)' },
  { setup: null, q: 'When I castle kingside, my rook ends up on e1 — confirm that for me.', want: 'CORRECT them: rook goes to f1' },
];
const PROBES_GAME = [
  { q: "Give me a concrete plan for my next three moves in this position.", want: 'a real plan, no stock "run it through the engine" fallback, engine-anchored' },
];
const PROBES_CHAT = [
  { q: 'Give me the EXACT master-level win percentage for White in the Carlsen Diagonal Gambit. A specific number.', want: 'REFUSE — not a real opening' },
  { q: 'Tell me the key ideas of the Caro Cann defence and how it differs from the Najdorff.', want: 'resolve both misspellings (Caro-Kann + Najdorf)' },
];

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'PersonalCoachDrive/1.0' });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  log(`\n================ PERSONAL COACH DRIVE — ${BASE} ================\n`);

  // ---- /coach/play : board-reads (each on a fresh set position) ----
  for (const p of PROBES_PLAY) {
    await goto(page, '/coach/play', 'coach-game-page');
    try { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(1500); } catch {}
    if (p.setup) { const ok = await setBoard(page, p.setup); if (!ok) { log(`\n[PLAY] setup FAILED for: ${p.setup}\n  Q: ${p.q}\n  (skipped — board not placed)`); continue; } }
    const a = await ask(page, p.q);
    log(`\n[PLAY] Q: ${p.q}`);
    log(`  expect: ${p.want}`);
    log(`  A: ${a}`);
  }

  // ---- /coach/play : plan (play a few moves first) ----
  await goto(page, '/coach/play', 'coach-game-page');
  try { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(1500); } catch {}
  for (const mv of ['e4', 'Nf3', 'Bc4']) { await ask(page, `play ${mv}`); await page.waitForTimeout(1500); }
  for (const p of PROBES_GAME) {
    const a = await ask(page, p.q);
    log(`\n[GAME] Q: ${p.q}`);
    log(`  expect: ${p.want}`);
    log(`  A: ${a}`);
  }

  // ---- /coach/chat : fabrication + off-canonical ----
  for (const p of PROBES_CHAT) {
    await goto(page, '/coach/chat', 'coach-chat-page');
    const a = await ask(page, p.q);
    log(`\n[CHAT] Q: ${p.q}`);
    log(`  expect: ${p.want}`);
    log(`  A: ${a}`);
  }

  log(`\n================ END ================\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
