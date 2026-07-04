// ADVERSARIAL stress audit for the subline→masterclass routing + Glek (David
// 2026-07-04: "try to break the builds"). Pushes messy/hostile input at the
// riskiest new code — the OpeningDetailPage redirect — hunting for redirect
// loops, crashes on malformed ids, ?line= abuse, rapid-nav races, back-button
// loops, and React correctness warnings (duplicate keys / update-depth) under
// tab-mashing. Runs against LIVE PROD via the bridge.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startProdBridge } from './audit-lib/prod-bridge.mjs';

const bridge = process.env.AUDIT_PROD_BRIDGE === '1' ? await startProdBridge(Number(process.env.AUDIT_BRIDGE_PORT || 8098)) : null;
const URL = bridge ? bridge.url : (process.env.AUDIT_SMOKE_URL || 'http://localhost:5173');
if (bridge) console.log(`[bridge] STRESS vs LIVE PROD ${bridge.url} → ${bridge.prod}`);

const breaks = []; // {input, kind, detail}
const rec = (name, ok, detail) => console.log(`  [${ok ? 'PASS' : 'BREAK'}] ${name}${detail ? ': ' + detail : ''}`);

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

let current = 'boot';
const isReactKeyWarn = (t) => /same key|unique "?key|Each child in a list|Maximum update depth|Cannot update a component|Warning: Encountered two children/i.test(t);
page.on('pageerror', (e) => breaks.push({ input: current, kind: 'pageerror', detail: (e.message || '').split('\n')[0].slice(0, 140) }));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::|manifest|404|the server responded/i.test(t)) breaks.push({ input: current, kind: 'console-error', detail: t.slice(0, 140) });
  if (isReactKeyWarn(t)) breaks.push({ input: current, kind: 'react-warning', detail: t.slice(0, 140) });
});

async function go(path, waitMs = 1500) {
  current = path;
  try { await page.goto(`${URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 25000 }); }
  catch (e) { if (!/Timeout/.test(e.message)) breaks.push({ input: path, kind: 'nav-error', detail: e.message.split('\n')[0].slice(0, 80) }); }
  await page.waitForTimeout(waitMs);
}
async function dismiss() {
  try { const b = page.locator('[data-testid="strength-calibration-bubble"]'); if (await b.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 3000 }).catch(() => null); await b.waitFor({ state: 'detached', timeout: 8000 }).catch(() => null); } } catch { /* */ }
  const h = page.locator('[data-testid="page-help-modal"]'); if (await h.count()) { await page.keyboard.press('Escape').catch(() => null); await h.waitFor({ state: 'detached', timeout: 3000 }).catch(() => null); }
}
const alive = async () => { try { return (await page.evaluate(() => document.querySelector('#root')?.children.length > 0)) === true; } catch { return false; } };

console.log('\n=== boot + seed ===');
await go('/', 1500); await dismiss();
console.log('  waiting 55s for seed...'); await page.waitForTimeout(55000);

// 1) REDIRECT LOOP: no masterclass may redirect to itself/another (would loop).
console.log('\n--- 1. redirect-loop guard (masterclasses must NOT redirect) ---');
for (const id of ['glek-system', 'caro-kann', 'french-defence', 'sicilian-najdorf', 'ruy-lopez', 'vienna-game', 'italian-game', 'four-knights-game']) {
  await go(`/openings/${id}`, 1200); await dismiss();
  const url = page.url();
  const stayed = url.includes(`/openings/${id}`) && !url.includes('/openings/' + id + '/');
  rec(`masterclass ${id} stays put`, stayed && await alive(), stayed ? '' : `moved to ${url.split('/openings/')[1]}`);
}

// 2) MALFORMED / HOSTILE opening ids — must degrade, never crash.
console.log('\n--- 2. malformed / hostile ids ---');
const HOSTILE = ['/openings/', '/openings/x', '/openings/%2e%2e%2f', '/openings/' + 'z'.repeat(600), "/openings/%27%3Bdrop", '/openings/🙂♞', '/openings/glek-system-nope', '/openings/undefined', '/openings/null', '/openings/..%2f..%2fapi'];
for (const p of HOSTILE) { await go(p, 900); const ok = await alive(); rec(`hostile ${p.slice(0, 34)}`, ok, ok ? '' : 'app not mounted (blank)'); }

// 3) ?line= abuse on the Glek — must show a tab or main, never crash.
console.log('\n--- 3. ?line= abuse ---');
for (const q of ['garbage', '%3Cscript%3E', '999', '-1', '', 'central%204...d5', 'PIN%204...BB4', '  ', 'a'.repeat(300)]) {
  await go(`/openings/glek-system?line=${q}`, 900); await dismiss();
  const ok = await alive() && /glek|central|pin|fianchetto/i.test(await page.evaluate(() => document.body.innerText).catch(() => ''));
  rec(`?line=${q.slice(0, 20)}`, ok, ok ? '' : 'Glek did not render');
}

// 4) RAPID NAV race — fire many navs fast (redirect + non-redirect + hostile mixed).
console.log('\n--- 4. rapid-nav race (no awaited settle) ---');
const RAPID = ['/openings/b12-caro-kann-defense-advance-variation', '/openings/glek-system', '/openings/c57-italian-game-two-knights-defense-fried-liver-attack', '/openings/zzz', '/openings/french-defence', '/openings/a45-trompowsky-attack-classical-defense', '/openings/glek-system?line=pin', '/openings/ruy-lopez'];
for (let r = 0; r < 3; r++) for (const p of RAPID) { current = `rapid ${p}`; page.goto(`${URL}${p}`, { waitUntil: 'commit', timeout: 15000 }).catch(() => null); await page.waitForTimeout(160); }
await page.waitForTimeout(4000); await dismiss();
rec('survives rapid-nav flood', await alive(), await alive() ? '' : 'app dead after flood');

// 5) BACK-BUTTON after a redirect — must not loop back onto the bare subline.
console.log('\n--- 5. back-button after redirect ---');
await go('/openings/', 800); await go('/openings/b12-caro-kann-defense-advance-variation', 1800); await dismiss();
const afterRedirect = page.url();
await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null); await page.waitForTimeout(1500);
const backUrl = page.url();
const looped = backUrl.includes('caro-kann-defense-advance') || backUrl === afterRedirect;
rec('back does not loop onto bare subline', !looped && await alive(), `landed ${backUrl.split(URL)[1] ?? backUrl}`);

// 6) GLEK TAB-MASHING — the duplicate-React-key class (2026-06-12).
console.log('\n--- 6. Glek tab-mashing + rung-mashing ---');
await go('/openings/glek-system', 2000); await dismiss();
const before6 = breaks.length;
for (let i = 0; i < 12; i++) {
  for (const label of ['Central', 'Pin', 'Fianchetto']) { const t = page.getByText(label, { exact: false }).first(); if (await t.count()) await t.click({ timeout: 1500, force: true }).catch(() => null); await page.waitForTimeout(120); }
  for (const rung of ['Watch', 'Learn', 'Practice', 'Play']) { const b = page.locator(`button:has-text("${rung}")`).first(); if (await b.count()) await b.click({ timeout: 1500, force: true }).catch(() => null); await page.waitForTimeout(120); }
}
await page.waitForTimeout(2000);
rec('Glek tab/rung mash: no new errors', breaks.length === before6 && await alive(), breaks.slice(before6).map((b) => b.kind).join(',') || '');

await browser.close(); if (bridge) await bridge.close();
console.log(`\n=== ${breaks.length} BREAKS ===`);
const byKind = {}; for (const b of breaks) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
console.log('by kind:', JSON.stringify(byKind));
for (const b of breaks.slice(0, 25)) console.log(`  ! [${b.kind}] input=${b.input} — ${b.detail}`);
process.exit(breaks.length ? 1 : 0);
