// Post-deploy render audit (G1) for the two masterclass-tab changes shipped
// 2026-05-30: (1) the Caro Classical endgame card, (2) per-variation model-game
// scoping. Runs against LIVE prod. AUDIT_SANDBOX=1 for the resigned cert.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const rec = (n, s, d) => { results.push({ n, s, d }); console.log(`  [${s}] ${n}${d ? ': ' + d : ''}`); };

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(), headless: true,
  args: [...sandboxLaunchArgs(), '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const tts = [];
page.on('request', (r) => {
  const u = r.url(); if (!/\/api\/tts/.test(u)) return;
  const t = decodeURIComponent((u.match(/[?&]text=([^&]*)/) || [])[1] || '');
  tts.push({ warmup: t.trim() === '.' || t.trim() === '' });
});
const beatTts = () => tts.filter((x) => !x.warmup).length;

async function dismissOverlays() {
  for (let i = 0; i < 4; i++) {
    let acted = false;
    const b = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await b.count() > 0) { acted = true; await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => null); await b.waitFor({ state: 'detached', timeout: 15000 }).catch(() => null); }
    const h = page.locator('[data-testid="page-help-modal"]');
    if (await h.count() > 0) { acted = true; await page.keyboard.press('Escape').catch(() => null); await h.waitFor({ state: 'detached', timeout: 2500 }).catch(async () => { await h.locator('button').last().click({ force: true }).catch(() => null); await h.waitFor({ state: 'detached', timeout: 2500 }).catch(() => null); }); }
    if (!acted) return;
  }
}

console.log(`=== Masterclass endgame + model-game scoping audit vs PROD (${PROD}) ===\n`);
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOverlays();
console.log('  seeding 35s...');
await page.waitForTimeout(35000);
// Enable Polly on the seeded profile so the endgame Watch hits /api/tts.
await page.evaluate(() => new Promise((res) => {
  const to = setTimeout(() => res('t'), 8000);
  const o = indexedDB.open('ChessAcademyDB');
  o.onsuccess = () => { const tx = o.result.transaction('profiles', 'readwrite'); const s = tx.objectStore('profiles'); const g = s.get('main'); g.onsuccess = () => { const p = g.result; if (!p) { clearTimeout(to); res('no'); return; } p.preferences = p.preferences || {}; p.preferences.pollyEnabled = true; p.preferences.voiceEnabled = true; p.preferences.coachNarration = 'full'; s.put(p).onsuccess = () => { clearTimeout(to); res('ok'); }; }; };
  o.onerror = () => { clearTimeout(to); res('e'); };
}));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
await page.waitForTimeout(2000);

// ─── Endgame cards: render + speak, across every opening in the rollout ───
// Each: open the opening, select the tab carrying the endgame plan, assert the
// plan-line renders, and (for the first) that its Watch fires a beat /api/tts.
const ENDGAME_TARGETS = [
  { id: 'caro-kann', tabLabel: null, planId: 'mp-carokann-main-endgame', name: 'Caro Classical', voice: true },
  { id: 'caro-kann', tabLabel: 'Advance', planId: 'mp-carokann-advance-endgame', name: 'Caro Advance', voice: false },
  { id: 'slav-defence', tabLabel: null, planId: 'mp-slavdefence-main-endgame', name: 'Slav', voice: true },
  { id: 'qgd', tabLabel: null, planId: 'mp-qgd-main-endgame', name: 'QGD', voice: false },
  { id: 'french-defence', tabLabel: null, planId: 'mp-frenchdefence-main-endgame', name: 'French', voice: false },
];
let mainGames = 0;
for (const t of ENDGAME_TARGETS) {
  await page.goto(`${PROD}/openings/${t.id}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(2200);
  await dismissOverlays();
  if (t.tabLabel) {
    await page.locator('[data-testid="variation-tabs"] [role="tab"]', { hasText: t.tabLabel }).first().click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(1000);
    await dismissOverlays();
  }
  const card = page.locator(`[data-testid="plan-line-${t.planId}"]`);
  await card.scrollIntoViewIfNeeded().catch(() => null);
  if (await card.count() > 0) rec(`${t.name} endgame card renders`, 'PASS');
  else rec(`${t.name} endgame card renders`, 'FAIL', `${t.planId} not found`);
  if (t.id === 'caro-kann' && t.tabLabel === null) {
    mainGames = await page.locator('[data-testid^="model-game-card-"]').count();
    rec('caro-kann main tab shows the full model-game library', mainGames >= 4 ? 'PASS' : 'WARN', `${mainGames} games`);
  }
  if (t.voice) {
    const before = beatTts();
    await page.locator(`[data-testid="plan-watch-${t.planId}"]`).click({ timeout: 5000 }).catch(() => null);
    await dismissOverlays();
    let fired = beatTts() > before;
    for (let i = 0; i < 14 && !fired; i++) { await page.waitForTimeout(750); fired = beatTts() > before; }
    rec(`${t.name} endgame plan speaks (beat /api/tts)`, fired ? 'PASS' : 'FAIL', fired ? `${beatTts() - before} beat req(s)` : 'no beat tts');
  }
}

// ─── Advance tab: model games scoped to the variation ───
await page.goto(`${PROD}/openings/caro-kann`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
await page.waitForTimeout(2000);
await dismissOverlays();
const advTab = page.locator('[data-testid="variation-tabs"] [role="tab"]', { hasText: 'Advance' }).first();
if (await advTab.count() === 0) rec('caro Advance tab present', 'FAIL', 'tab not found');
else {
  await advTab.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(1200);
  await dismissOverlays();
  const advGames = await page.locator('[data-testid^="model-game-card-"]').count();
  // Scoped: the Advance tab shows only Advance-tagged games (fewer than the full library).
  if (advGames > 0 && advGames < mainGames) rec('model games scope to the variation tab', 'PASS', `Advance: ${advGames} vs main ${mainGames}`);
  else if (advGames === 0) rec('model games scope to the variation tab', 'WARN', 'Advance tab shows 0 (self-hide) — scoped but empty');
  else rec('model games scope to the variation tab', 'FAIL', `Advance ${advGames} not < main ${mainGames}`);
}

await browser.close();
const pass = results.filter((r) => r.s === 'PASS').length;
const fail = results.filter((r) => r.s === 'FAIL').length;
const warn = results.filter((r) => r.s === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warn ===`);
process.exit(fail > 0 ? 1 : 0);
