#!/usr/bin/env node
/**
 * audit-monkey — ADVERSARIAL monkey/chaos tester. Navigates each interactive
 * surface and fires RAPID RANDOM actions: click a random visible button / role
 * button, click random board squares, spam messy text into any chat input,
 * navigate back — fast, escalating. Captures EVERY pageerror / console-error /
 * React correctness warning (same key / each child / max update depth) tagged
 * to the action sequence that triggered it. The point is to BREAK it.
 *
 * Usage: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *        AUDIT_MONKEY_ACTIONS=80 node scripts/audit-monkey.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ACTIONS = Number(process.env.AUDIT_MONKEY_ACTIONS ?? 70);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/monkey-${stamp}`;

const SURFACES = [
  { name: 'coach-chat', url: '/coach/chat', chat: true },
  { name: 'coach-teach', url: '/coach/teach', chat: true },
  { name: 'openings-detail', url: '/openings/italian-game', chat: false },
  { name: 'tactics-drill', url: '/tactics/drill', chat: false },
  { name: 'tactics-adaptive', url: '/tactics/adaptive', chat: false },
  { name: 'kid-pawn', url: '/kid/pawn-games', chat: false },
  { name: 'coach-endgame', url: '/coach/endgame', chat: false },
  { name: 'weaknesses', url: '/weaknesses', chat: false },
];
const SPAM = ['asdf qwer', '🔥🔥♞', 'teach me the najdorf AND quiz me AND trap', 'Philidor Defence', 'KID', '1. e4 e5 2. Nf3', "'; DROP TABLE x; --", 'why'.repeat(40), '???', 'go back', 'stop', 'undo', 'hint', 'next', 'Réti', 'show me everything now'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }; }

const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

let recentActions = [];
const breaks = [];
function recordBreak(kind, detail) {
  const b = { kind, surface: curSurface, lastActions: recentActions.slice(-6), detail: String(detail).slice(0, 240) };
  breaks.push(b);
  console.log(`  💥 BREAK [${kind}] @${curSurface} after [${b.lastActions.join(' → ')}]\n        ${b.detail.slice(0, 180)}`);
}
let curSurface = '';
page.on('console', async (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/same key|each child|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|Cannot update a component|is not a function|undefined is not/i.test(t)) {
    let key = '';
    if (/same key|each child/i.test(t)) { try { const a = await Promise.all(m.args().map((x) => x.jsonValue().catch(() => ''))); key = String(a[1] ?? ''); } catch { /* */ } }
    recordBreak('console-error', t + (key ? ` [key=${key}]` : ''));
  }
});
page.on('pageerror', (e) => recordBreak('pageerror', e.message));

async function main() {
  console.log(`[monkey] ${BASE}  ${ACTIONS} actions/surface\n`);
  await page.goto(`${BASE}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 120, { timeout: 60000 }).catch(() => undefined);

  const rand = rng(0xBADBEEF);
  for (const s of SURFACES) {
    curSurface = s.name;
    console.log(`\n[monkey] ===== ${s.name} (${s.url}) =====`);
    await page.goto(`${BASE}${s.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
    // if a broad opening shows a line-picker, pick a tile to get into a lesson
    await page.locator('[data-testid="line-picker-tile"]').first().click({ force: true, timeout: 1500 }).catch(() => undefined);

    for (let i = 0; i < ACTIONS; i++) {
      const roll = rand();
      try {
        if (s.chat && roll < 0.4) {
          // spam messy text into the chat box (mash send, don't wait)
          const txt = SPAM[Math.floor(rand() * SPAM.length)];
          recentActions.push(`chat:"${txt.slice(0, 14)}"`);
          const inp = page.locator('[data-testid="chat-text-input"]').first();
          if (await inp.isVisible().catch(() => false)) {
            await inp.fill(txt, { timeout: 2000 }).catch(() => undefined);
            await page.locator('[data-testid="chat-send-btn"]').first().click({ force: true, timeout: 2000 }).catch(() => undefined);
          }
        } else if (roll < 0.65) {
          // click a random board square (puzzle move attempts / mashing)
          const sqs = page.locator('[data-square]');
          const n = await sqs.count().catch(() => 0);
          if (n > 0) { const idx = Math.floor(rand() * n); recentActions.push(`sq#${idx}`); await sqs.nth(idx).click({ force: true, timeout: 1500 }).catch(() => undefined); }
        } else if (roll < 0.9) {
          // click a random visible button / role button (not nav-away-heavy)
          const btns = page.locator('button:visible, [role="button"]:visible');
          const n = await btns.count().catch(() => 0);
          if (n > 0) {
            const idx = Math.floor(rand() * n);
            const label = (await btns.nth(idx).innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 16);
            recentActions.push(`btn:${label || idx}`);
            await btns.nth(idx).click({ force: true, timeout: 1500 }).catch(() => undefined);
          }
        } else {
          // occasionally bounce back to the surface (navigate chaos)
          recentActions.push('renav');
          await page.goto(`${BASE}${s.url}`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);
        }
      } catch (e) { recordBreak('action-threw', e); }
      if (recentActions.length > 30) recentActions = recentActions.slice(-20);
      await page.waitForTimeout(120 + Math.floor(rand() * 280)); // fast, jittered
    }
  }

  console.log(`\n[monkey] ================= SUMMARY =================`);
  console.log(`  total breaks: ${breaks.length}`);
  const byKind = breaks.reduce((a, b) => { a[b.kind] = (a[b.kind] ?? 0) + 1; return a; }, {});
  for (const [k, n] of Object.entries(byKind)) console.log(`    ${n} × ${k}`);
  const bySurface = breaks.reduce((a, b) => { a[b.surface] = (a[b.surface] ?? 0) + 1; return a; }, {});
  for (const [k, n] of Object.entries(bySurface)) console.log(`    @${k}: ${n}`);
  if (breaks.length === 0) console.log(`  (no breaks — push harder / more actions)`);
  await writeFile(join(OUT, 'breaks.json'), JSON.stringify(breaks, null, 2), 'utf-8');
  console.log(`  report: ${join(OUT, 'breaks.json')}`);
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
