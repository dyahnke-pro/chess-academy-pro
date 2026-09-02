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

// ≤7-piece positions with unambiguous tablebase verdicts.
const CASES = [
  { name: 'KQ vs K (white winning)', fen: '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1',
    qs: ['how do I win this?', 'is this winning?'],
    want: /win|winning|mate|queen|checkmate|force the king|edge of the board/, notWant: /draw|equal|dead\s*level|small edge|about 0\.5|can'?t win|insufficient/ },
  { name: 'KR vs K (white winning)', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    qs: ['who is better here?', 'how do I win this?'],
    want: /win|winning|mate|rook|checkmate|box.*king|drive the king/, notWant: /draw|equal|dead\s*level|small edge|about 0\.5|insufficient/ },
  { name: 'KB vs K (dead draw, insufficient)', fen: '4k3/8/8/8/8/8/5B2/4K3 w - - 0 1',
    qs: ['is this a draw?', 'can I win this?'],
    want: /draw|insufficient|can'?t win|cannot win|not enough|no mate|impossible to mate/, notWant: /you'?re winning|white is winning|forced mate|you win/ },
];

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
async function ask(fen, q) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await loadCase(fen); const a = (await askOnce(q)).toLowerCase(); if (a.length > 12) return a; }
    catch { /* reload + retry */ }
  }
  return '';
}

try {
  for (const c of CASES) {
    for (const q of c.qs) {
      const a = await ask(c.fen, q);
      const notOk = c.notWant.test(a);
      const wantOk = c.want.test(a);
      const generic = /small edge|about 0\.5 of a point|worth nursing/.test(a); // the non-tablebase eval tell
      rec(c.name, q, a.length > 12 && wantOk && !notOk && !generic, a || '(empty)');
    }
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
