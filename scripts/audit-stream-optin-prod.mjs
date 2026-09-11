/**
 * Verifies the 2026-09-11 opt-in contract on PROD:
 *   1. a fresh device makes ZERO POSTs to /api/audit-stream
 *   2. a device that EXPLICITLY configures a stream still POSTs (so David's
 *      Settings toggle and the audit sidecars are not broken by the default)
 * Check 2 is what stops this being a "it got quieter, ship it" result.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 45000);

async function run(label, seed) {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  // This audit measures REQUEST COUNTS, not audio — synthesising would bill
  // real TTS money to learn nothing (CLAUDE.md G1: audits run muted).
  await ctx.addInitScript(muteTtsForAudit);
  if (seed) await ctx.addInitScript(seed);
  const page = await ctx.newPage();
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /\/api\/audit-stream/.test(r.url())) posts.push(r.url());
  });
  await page.goto(`${URL}/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(SETTLE_MS);
  await browser.close();
  console.log(`  ${label}: ${posts.length} audit-stream POST(s)`);
  return posts.length;
}

const fresh = await run('fresh device (default)', null);
const opted = await run('explicitly enabled', () => {
  localStorage.setItem('auditStreamUrl', 'https://chess-academy-pro.vercel.app/api/audit-stream');
  localStorage.setItem('auditStreamSecret', 'probe-secret-not-valid');
});

const ok1 = fresh === 0;
const ok2 = opted > 0;
console.log(`\n  [${ok1 ? 'PASS' : 'FAIL'}] default is OFF (expected 0, got ${fresh})`);
console.log(`  [${ok2 ? 'PASS' : 'FAIL'}] explicit opt-in still streams (expected >0, got ${opted})`);
process.exit(ok1 && ok2 ? 0 : 1);
