// CONTRACT AUDIT (David 2026-09-01): "coach reminding users to upload their
// lichess and chess.com games! ... If user asks about weaknesses and has non
// analyzed or uploaded we need to verbally tell them to do this."
//
// With a NO-DATA profile (no analyzed games), every weakness/assessment question
// must (a) name the upload path (Lichess AND Chess.com, or the analyze step) and
// (b) surface the "Import & analyze my games" chip. Muted (G1) — text only.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `upload-${Date.now().toString(36)}`;

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 8000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

// Nuke any games / mistake data so analyzedGameCount === 0 deterministically.
async function clearGameData() {
  return page.evaluate(() => new Promise((resolve) => {
    let req; try { req = indexedDB.open('ChessAcademyDB'); } catch { return resolve('open-threw'); }
    req.onerror = () => resolve('open-error');
    req.onsuccess = () => {
      const db = req.result;
      const stores = ['games', 'mistakePuzzles'].filter((s) => db.objectStoreNames.contains(s));
      if (stores.length === 0) { db.close(); return resolve('no-stores'); }
      const tx = db.transaction(stores, 'readwrite');
      for (const s of stores) tx.objectStore(s).clear();
      tx.oncomplete = () => { db.close(); resolve('cleared'); };
      tx.onerror = () => { db.close(); resolve('tx-error'); };
    };
  }));
}

async function ask(question) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => { const now = tally(ls); const out = []; for (const [line, n] of now) { const extra = n - (seen.get(line) ?? 0); for (let k = 0; k < extra; k++) out.push(line); } return out.filter((l) => !l.includes(question)); };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(1500); if (freshFrom(await linesOf()).some(SUB)) { await page.waitForTimeout(2000); return freshFrom(await linesOf()).filter(SUB).join(' '); } }
  return '';
}

const QUESTIONS = [
  'break down my weaknesses',
  'what am I weakest at?',
  'what mistakes do I make?',
  'what endgame am I weakest at?',
  'am I improving?',
  "what's my skill breakdown?",
];

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const cleared = await clearGameData();
  record('setup: cleared games + mistakePuzzles (no-data profile)', cleared === 'cleared' || cleared === 'no-stores', cleared);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  for (const q of QUESTIONS) {
    const a = (await ask(q)).toLowerCase();
    // Names the upload path: Lichess AND Chess.com (fresh case), OR the
    // analyze-what-you-imported step (import + analyze).
    const namesUpload = (/lichess/.test(a) && /chess\.?com/.test(a) && /import/.test(a)) || (/import/.test(a) && /analy[sz]/.test(a));
    record(`"${q}": verbally points to uploading Lichess/Chess.com games`, a.length >= 20 && namesUpload, a ? `"${a.slice(0, 140)}"` : 'no reply');
    // The import chip must be offered.
    const chip = await page.locator('[data-testid="action-import_games"]').last().isVisible().catch(() => false);
    record(`"${q}": shows the "Import & analyze my games" chip`, chip, chip ? 'chip present' : 'no import chip');
  }
} catch (err) {
  record('audit ran without throwing', false, String(err).slice(0, 250));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n── ${pass}/${results.length} contracts green ──`);
  if (pass < results.length) console.log('FAILED:', results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
