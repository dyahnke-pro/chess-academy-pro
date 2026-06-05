/** Focused prod check: does the coach now respect the CORRECTED hanging
 *  ground truth (king/slider defenders counted)? Drives 3 positions and
 *  asks directly, prints verbatim answers for a human read. */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
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
  const ACK = /board'?s?\s+(?:is\s+)?set|you'?re\s+playing|position is set|taking too long|try again|trouble connecting/i;
  try {
    await page.waitForFunction((prev) => {
      const els = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')];
      return els.some((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b?.textContent ?? ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); t = t.trim(); return t.length > 12 && !prev.includes(t); });
    }, [...before], { timeout: 75000 });
  } catch { return '(no answer)'; }
  let prev = -1, stable = 0, ans = '';
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(600); const fresh = (await snap(page)).filter((t) => !before.has(t) && !ACK.test(t)); const cur = fresh.length ? fresh.reduce((a, b) => (b.length > a.length ? b : a)) : ''; if (cur.length === prev) { stable++; if (stable >= 3) { ans = cur; break; } } else stable = 0; prev = cur.length; ans = cur; }
  return ans || '(empty)';
}
async function scrapeFen(page) {
  const map = await page.evaluate(() => { const m = {}; document.querySelectorAll('[data-piece]').forEach((p) => { let n = p, sq = p.getAttribute('data-square'); while (n && !sq) { n = n.parentElement; sq = n?.getAttribute?.('data-square'); } if (sq) m[sq] = p.getAttribute('data-piece'); }); return m; });
  const P = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
  if (!Object.keys(map).length) return null;
  const rows = []; for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const pc = map[f + r]; if (pc && P[pc]) { if (e) { row += e; e = 0; } row += P[pc]; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join('/');
}
async function setBoard(page, fen) { const t = fen.split(' ')[0]; await ask(page, `set the board to ${fen}`); for (let i = 0; i < 30; i++) { await page.waitForTimeout(800); if ((await scrapeFen(page)) === t) return true; } return (await scrapeFen(page)) === t; }
async function goto(page) { await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 20000 }).catch(() => {}); await page.waitForTimeout(3500); try { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(1500); } catch {} }

const CASES = [
  { fen: '4k3/4q3/8/8/8/8/4P3/R3K3 w - - 0 1', q: 'Is my pawn on e2 hanging, or can Black win it for free? Explain.', want: 'NOT hanging — defended by the king on e1 (Qxe2+ Kxe2)' },
  { fen: '4k3/8/8/8/8/2b5/8/2R1K3 w - - 0 1', q: 'Are any of my pieces hanging right now? Name the square.', want: 'NOTHING of MINE is hanging (the black bishop on c3 is the one attacked+undefended; my rook is fine)' },
  { fen: '4k3/8/1b4q1/R6B/8/8/8/4K3 w - - 0 1', q: 'Is my bishop on h5 hanging?', want: 'NOT hanging — defended by the rook on a5 along the 5th rank' },
];

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'VerifyHanging/1.0' });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  log(`\n===== HANGING-DETECTION VERIFY — ${BASE} =====\n`);
  for (const c of CASES) {
    await goto(page);
    const ok = await setBoard(page, c.fen);
    if (!ok) { log(`\n[SKIP] board not placed: ${c.fen}`); continue; }
    const a = await ask(page, c.q);
    log(`\nQ: ${c.q}`);
    log(`  expect: ${c.want}`);
    log(`  A: ${a}`);
  }
  log(`\n===== END =====\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
