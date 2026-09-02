// LIVE-ENDGAME GROUNDING AUDIT (David 2026-09-02: "running that check is your
// job ... you touched that surface"). I widened matchEndgameLesson (concept-
// phrased endgame asks), so the endgame surface is mine to audit — including the
// LIVE board path: when a student is IN an endgame and asks a verdict question,
// the coach must answer from the syzygy TABLEBASE (literal truth ≤7 pieces,
// coachApi.ts lookupTablebase), NOT a generic "small edge" engine eval.
//
// Drives /coach/play?fen=<endgame> (CoachGamePage seeds the board from ?fen),
// asks verdict questions, and asserts the reply reflects the TRUE tablebase
// result. Muted per G1.
//
// Usage: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-coach-endgame-live-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `eglive-${Date.now().toString(36)}`;

// ≤7-piece positions with unambiguous tablebase verdicts. WIN cases must read
// as winning (never draw/equal/generic-eval); DRAW cases must read as a draw
// (never winning). The pool is large; each RUN takes 20 DISTINCT questions,
// rotated by AUDIT_BATCH so a restart-after-fix draws 20 brand-new ones
// (David 2026-09-02: "all different questions ... start over with 20 new").
const BATCH = Number(process.env.AUDIT_BATCH || 0);
const WIN_RE = /win|winning|won|mate|checkmate|queen|rook|promot|force|convert|technical|you'?re winning|white is winning/;
const WIN_NOT = /\bdraw|equal|dead\s*level|small edge|about 0\.5|can'?t win|cannot win|insufficient|not enough|hold the draw/;
const DRAW_RE = /draw|insufficient|can'?t win|cannot win|not enough|no mate|impossible to mate|hold|drawn|dead\s*level/;
const DRAW_NOT = /you'?re winning|white is winning|forced mate|you win|it'?s a win|winning for you/;

// 24 distinct WIN phrasings, 24 distinct DRAW phrasings (48 pool → each run
// takes 10+10=20 fresh via the batch offset; 2 full non-overlapping batches).
const WIN_QS = [
  'how do I win this?', 'is this winning?', 'is this position won?', 'am I winning?',
  'is there a forced win?', 'can white win this?', 'is it a technical win?', 'how do I convert this?',
  "what's the result with best play?", 'is this lost for black?', 'can I force mate here?', 'is this a theoretical win?',
  'should I be winning this?', 'is the win straightforward?', 'do I have a forced mate?', 'is black busted here?',
  'is this resignable for black?', 'can I bring this home?', 'is there a clean win?', 'how many moves to mate?',
  'is this trivially winning?', 'is the game over for black?', 'is white just winning?', 'can I mate the king?',
];
const DRAW_QS = [
  'is this a draw?', 'can I win this?', 'will this be a draw?', 'is this a dead draw?',
  'can I force a win here?', 'is a draw the best I can get?', 'is this drawable?', 'can black hold this?',
  'is there any way to win?', 'is this a theoretical draw?', 'do I have enough to win?', 'is the draw unavoidable?',
  'can I make progress here?', 'is this a book draw?', 'am I able to promote?', 'is there enough material to mate?',
  'should this end in a draw?', 'can black defend this?', 'is this position saveable for black?', 'is a win possible at all?',
  'is it a fortress?', 'can I break through?', 'is this hopeless to win?', 'will best play draw?',
];
const WIN_POS = [
  { name: 'KQ vs K', fen: '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1' },
  { name: 'KR vs K', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1' },
  { name: 'K+P vs K (king ahead)', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1' },
];
const DRAW_POS = [
  { name: 'KB vs K (insufficient)', fen: '4k3/8/8/8/8/8/5B2/4K3 w - - 0 1' },
  { name: 'KN vs K (insufficient)', fen: '4k3/8/8/8/8/8/5N2/4K3 w - - 0 1' },
  { name: 'K+rook-pawn vs K (corner draw)', fen: '7k/8/6K1/7P/8/8/8/8 w - - 0 1' },
];
const pick = (arr, n, off) => { const out = []; for (let i = 0; i < n; i++) out.push(arr[(off * n + i) % arr.length]); return out; };
const CASES = [];
pick(WIN_QS, 10, BATCH).forEach((q, i) => { const p = WIN_POS[i % WIN_POS.length]; CASES.push({ name: `${p.name} (win)`, fen: p.fen, q, want: WIN_RE, notWant: WIN_NOT }); });
pick(DRAW_QS, 10, BATCH).forEach((q, i) => { const p = DRAW_POS[i % DRAW_POS.length]; CASES.push({ name: `${p.name} (draw)`, fen: p.fen, q, want: DRAW_RE, notWant: DRAW_NOT }); });

const results = [];
const rec = (name, q, pass, detail) => { results.push({ name, q, pass, detail }); console.log(`${pass ? '✅' : '❌'} [${name}] ${q} — "${detail.slice(0, 90)}"`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [g, b] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = page.locator(g); await G.waitFor({ timeout: 8000 }); await page.locator(b).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}
async function openChat() {
  const input = page.locator('[data-testid="chat-text-input"]');
  if (await input.isVisible().catch(() => false)) return true;
  const btn = page.locator('[data-testid="play-chat-button"]');
  try { await btn.waitFor({ timeout: 8000 }); await btn.click(); } catch { /* maybe already open */ }
  try { await input.waitFor({ timeout: 8000 }); return true; } catch { return false; }
}
async function askOnce(q) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 15000 });
  const msgs = page.locator('[data-testid="chat-message-assistant"]');
  const count0 = await msgs.count();
  await box.click(); await box.pressSequentially(q, { delay: 6 }); await box.press('Enter');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1400);
    const n = await msgs.count();
    if (n > count0) {
      const txt = (await msgs.nth(n - 1).innerText().catch(() => '')).trim();
      if (txt.length > 15) { await page.waitForTimeout(1200); return (await msgs.nth((await msgs.count()) - 1).innerText().catch(() => txt)).trim(); }
    }
  }
  return '';
}
async function loadCase(fen) {
  await page.goto(`${BASE}/coach/play?fen=${encodeURIComponent(fen)}&side=white`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates();
  await page.locator('[data-testid="coach-game-page"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await openChat();
}
// The app's own transient-timeout UI under rapid fire is a LOAD artifact, not a
// wrong verdict (CLAUDE.md load-vs-break) — retry, don't score it.
const TRANSIENT = /coach is taking too long|try again in a moment|taking longer than expected|please try again/;
async function ask(fen, q) {
  let last = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await loadCase(fen);
      last = (await askOnce(q)).toLowerCase();
      if (last.length > 12 && !TRANSIENT.test(last)) return last;
      if (TRANSIENT.test(last)) await page.waitForTimeout(4000);
    } catch { /* reload + retry */ }
  }
  return last;
}

try {
  console.log(`Batch ${BATCH}: ${CASES.length} distinct questions\n`);
  for (const c of CASES) {
    const a = await ask(c.fen, c.q);
    const notOk = c.notWant.test(a);
    const wantOk = c.want.test(a);
    const generic = /small edge|about 0\.5 of a point|worth nursing/.test(a); // the non-tablebase eval tell
    rec(c.name, c.q, a.length > 12 && wantOk && !notOk && !generic, a || '(empty)');
  }
} catch (err) {
  rec('HARNESS', 'ran', false, String(err).slice(0, 200));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n══ ENDGAME-LIVE: ${pass}/${results.length} green ══`);
  const fails = results.filter((r) => !r.pass);
  if (fails.length) { console.log('FAILURES:'); for (const f of fails) console.log(`  ❌ [${f.name}] "${f.q}" → "${f.detail.slice(0, 120)}"`); }
  await browser.close();
  process.exit(fails.length ? 1 : 0);
}
