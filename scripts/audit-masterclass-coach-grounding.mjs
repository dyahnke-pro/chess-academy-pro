// Post-deploy audit for the OPENING-PAGE coach chat (MasterclassCoachChat)
// grounding (David 2026-07-04: "Coach is master of its domain"). This surface
// used to bypass the grounded assemblers (getCoachChatResponse with no
// grounding) — a "what's my strongest opening?" got an ungrounded free-LLM
// punt. It now passes buildQuestionGrounding, so it must answer from data like
// Learn. Drives the LIVE prod opening page against the real brain.
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const breaks = [];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
await attachProxyInterception(ctx);
const page = await ctx.newPage();
page.on('pageerror', (e) => breaks.push({ kind: 'pageerror', detail: (e.message || '').split('\n')[0] }));

async function dismiss() {
  const cb = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await cb.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => null); await cb.waitFor({ state: 'detached', timeout: 12000 }).catch(() => null); }
  const c = page.locator('[data-testid="ai-consent-allow"]');
  if (await c.count() && await c.isVisible().catch(() => false)) { await c.click({ force: true }).catch(() => null); await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null); }
  const h = page.locator('[data-testid="page-help-modal"]');
  if (await h.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(300); }
}

// A grounded reply for these questions references the student's data / weakness
// / opening; the OLD punt was "only you can tell me" / "I'd need you to name".
const PUNT_SIG = /only you can tell me|i'?d need you to name|you haven'?t (told|named)|what.?s your favou?rite|i can'?t tell you what your/i;
const PROBES = [
  { q: "what's my strongest opening", expectGround: true },
  { q: 'what am I weak in', expectGround: true },
  { q: 'what should I train', expectGround: true },
];

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500); await dismiss();
  // Seed a drilled repertoire opening + a tactical weakness so the grounded
  // answers have real data to voice.
  await page.evaluate(async () => {
    await new Promise((res) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => {
        const db = r.result;
        const stores = [];
        if (db.objectStoreNames.contains('openings')) stores.push('openings');
        if (db.objectStoreNames.contains('classifiedTactics')) stores.push('classifiedTactics');
        if (stores.length === 0) return res(0);
        const tx = db.transaction(stores, 'readwrite');
        if (stores.includes('openings')) {
          const s = tx.objectStore('openings');
          s.put({ id: 'italian-game', eco: 'C50', name: 'Italian Game', color: 'white', isRepertoire: true, keyIdeas: null, drillAccuracy: 0.91, drillAttempts: 14, woodpeckerSpeed: null, woodpeckerLastDate: null });
          s.put({ id: 'caro-kann', eco: 'B10', name: 'Caro-Kann Defense', color: 'black', isRepertoire: true, keyIdeas: null, drillAccuracy: 0.74, drillAttempts: 8, woodpeckerSpeed: null, woodpeckerLastDate: null });
        }
        if (stores.includes('classifiedTactics')) {
          const s2 = tx.objectStore('classifiedTactics');
          const now = new Date().toISOString();
          for (const [i, type] of [['1', 'fork'], ['2', 'fork'], ['3', 'back_rank']]) {
            s2.put({ id: `mc-ct-${type}-${i}`, sourceGameId: `g${i}`, moveIndex: 12, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4', bestMoveUci: 'f3g5', bestMoveSan: 'Ng5', playerMoveUci: 'd2d3', playerMoveSan: 'd3', playerColor: 'white', tacticType: type, evalSwing: 300, explanation: 'x', opponentName: null, gameDate: null, openingName: 'Italian Game', puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: now });
          }
        }
        tx.oncomplete = () => res(1); tx.onerror = () => res(0);
      };
      r.onerror = () => res(0);
    });
  });

  await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000); await dismiss();
  const openBtn = page.locator('[data-testid="masterclass-coach-open"]');
  if (!(await openBtn.count())) { breaks.push({ kind: 'no-surface', detail: 'masterclass-coach-open not found on /openings/caro-kann' }); }
  else {
    await openBtn.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); await dismiss();
    for (const p of PROBES) {
      const inp = page.locator('[data-testid="chat-text-input"]').first();
      for (let k = 0; k < 20 && !(await inp.isEnabled().catch(() => false)); k++) await page.waitForTimeout(1000);
      const before = await page.locator('[data-testid="chat-message-assistant"]').count();
      await inp.click().catch(() => null); await inp.pressSequentially(p.q, { delay: 10 }).catch(() => null); await page.keyboard.press('Enter').catch(() => null);
      let reply = '';
      const start = Date.now();
      while (Date.now() - start < 45000) {
        await page.waitForTimeout(1400);
        // MasterclassCoachChat renders messages oldest-FIRST, so the newest
        // reply is .last() (NOT .first() like the teach transcript).
        if ((await page.locator('[data-testid="chat-message-assistant"]').count()) > before) { reply = (await page.locator('[data-testid="chat-message-assistant"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ').trim(); if (reply.length > 25) break; }
      }
      const punted = PUNT_SIG.test(reply);
      const grounded = !punted && reply.length > 20;
      if (p.expectGround && !grounded) breaks.push({ kind: 'punt-or-silent', detail: `"${p.q}" → «${reply.slice(0, 110)}»` });
      console.log(`\nQ: ${p.q}\n  ${grounded ? '✅ grounded' : punted ? '❌ PUNTED' : '❌ silent'} :: «${reply.slice(0, 160)}»`);
    }
  }
} catch (e) { breaks.push({ kind: 'harness', detail: e.message.split('\n')[0] }); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} BREAKS ===`);
for (const b of real) console.log(`  ! [${b.kind}] ${b.detail}`);
process.exit(real.length ? 1 : 0);
