// Post-deploy audit for the 2026-07-18 hidden-tabs + gems ship.
// Verifies on LIVE prod that (a) the formerly-hidden variation tabs now render
// (KIA 9, Reti/Slav/English full), and (b) a gem opening surfaces its weapons.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const EXPECT = { 'kings-indian-attack': 9, 'reti-opening': 8, 'slav-defence': 8, 'english-opening': 8, 'catalan-opening': 7 };
const results = [];

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
const page = await ctx.newPage();

async function dismiss() {
  try { const b = page.locator('[data-testid="strength-calibration-bubble"]'); await b.waitFor({ timeout: 8000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click(); await b.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

for (const [id, expected] of Object.entries(EXPECT)) {
  try {
    await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismiss();
    await page.locator('[data-testid="variation-tabs"]').waitFor({ timeout: 20000 });
    const n = await page.locator('[data-testid^="variation-tab-"]').count(); // includes main pill
    const variationTabs = n - 1; // minus the "Main line" pill
    const ok = variationTabs >= expected;
    results.push({ id, expected, got: variationTabs, ok });
    console.log(`${ok ? '✓' : '✗'} ${id}: ${variationTabs} variation tabs (expected ≥${expected})`);
  } catch (e) {
    results.push({ id, expected, got: 'ERROR', ok: false, err: String(e).slice(0, 120) });
    console.log(`✗ ${id}: ERROR ${String(e).slice(0,120)}`);
  }
}

// Gem surfacing: seed-unlock english, check the punish-gems weapons card renders
try {
  await page.goto(`${BASE}/openings/english-opening`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  await seedUnlockedOpenings(page, ['english-opening']);
  await page.goto(`${BASE}/openings/english-opening`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  const gemCard = page.locator('[data-testid="punish-gems-card"], [data-testid="named-weapon-card"]');
  await gemCard.first().waitFor({ timeout: 20000 });
  const gems = await gemCard.count();
  results.push({ id: 'english-gems', got: gems, ok: gems > 0 });
  console.log(`${gems > 0 ? '✓' : '✗'} english-opening weapons: ${gems} gem/weapon card(s) surfaced`);
} catch (e) {
  results.push({ id: 'english-gems', got: 'ERROR', ok: false, err: String(e).slice(0,150) });
  console.log(`✗ english-gems: ${String(e).slice(0,150)}`);
}

await browser.close();
const pass = results.filter(r => r.ok).length;
console.log(`\n=== ${pass}/${results.length} checks passed ===`);
process.exit(pass === results.length ? 0 : 1);
