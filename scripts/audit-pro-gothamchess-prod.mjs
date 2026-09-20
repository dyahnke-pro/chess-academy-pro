// 3-instrument post-deploy walkthrough for the GothamChess pro-rep
// rebuild, targeting LIVE PROD. Instruments:
//   (1) Playwright drives the actual prod UI
//   (2) Local listener captures voice + audit POSTs (sidecar via
//       auditStreamUrl localStorage override)
//   (3) Live audit-stream pulled before + after the run, diff'd
//       to surface what THIS run emitted.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
if (!SECRET) { console.error('AUDIT_STREAM_SECRET missing — required for prod audit-stream pull'); process.exit(1); }

const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`);
}

async function pullProdStream(since) {
  const url = `${PROD}/api/audit-stream?since=${since}`;
  const res = await fetch(url, { headers: { 'x-audit-secret': SECRET } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return await res.json();
}

const tStart = Date.now();
console.log('=== Post-deploy walkthrough: GothamChess pro-rep (PROD) ===');
console.log(`run start: ${new Date(tStart).toISOString()}\n`);

console.log('--- (3a) Audit stream baseline pull ---');
const baseline = await pullProdStream(tStart - 60_000);
if (baseline.error) rec('prod audit-stream reachable', 'FAIL', baseline.error);
else rec('prod audit-stream reachable', 'PASS', `${(baseline.entries || []).length} events in last 60s`);
console.log();

console.log('--- (2) Starting local listener sidecar ---');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}\n`);

console.log('--- (1) Playwright driving live prod ---');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
  await blockTtsNetwork(page);   // instrument keeps the request; the provider never sees it

const interceptedPosts = [];
const pageErrors = [];
const voiceEvents = [];
let ttsRequests = 0;

page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });
page.on('request', async (req) => {
  if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
    try {
      const body = req.postDataJSON();
      interceptedPosts.push(body);
      if (Array.isArray(body?.entries)) {
        for (const e of body.entries) {
          if (/voice|speak|narration/i.test(e.kind || '')) voiceEvents.push(e);
        }
      }
    } catch {}
  }
  if (/\/api\/tts/.test(req.url())) ttsRequests++;
});

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
  console.log('  configured page → listener for audit POSTs');

  // The strength-calibration bubble was REMOVED from the app on 2026-09-02
  // (David: "remove strength calibration → go fully adaptive"). The onboarding
  // block that used to live here waited up to 23s for an element that no longer
  // renders, then skipped its own body because the count was zero. Deleted
  // rather than left to burn the clock; `autoDismissCalibration` still
  // neutralises the page-help modal, which DOES still exist.

  console.log('  waiting 35s for first-install deferred seed (pro-rep + ECO + plans + flashcards + narrations)');
  await page.waitForTimeout(35_000);

  // ── Front-and-center placement check (2026-05-29) ───────────────────────
  // His repertoire is pinned to the TOP of the Pro tab (featured section,
  // White/Black), not buried behind a player-card click. Verify it renders.
  console.log('  goto /openings (Pro tab) — featured placement check');
  // `networkidle` never settles on prod (analytics/audit beacons keep the
  // network busy), so this goto timed out and the tab bar was read before it
  // rendered — "tab-pro not found" on every run. Wait for the tab bar itself.
  await page.goto(`${PROD}/openings`, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null);
  await page.locator('[data-testid="tab-toggle"]').first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => null);
  await page.waitForTimeout(2000);
  // The Openings page auto-opens a page-help-modal that intercepts the Pro-tab
  // click — dismiss it first (CLAUDE.md onboarding-modal contract) or the tab
  // never activates and the featured section never mounts.
  const openingsHelp = page.locator('[data-testid="page-help-modal"]');
  if (await openingsHelp.count() > 0) {
    await page.keyboard.press('Escape').catch(() => null);
    await openingsHelp.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => {
      await openingsHelp.click({ position: { x: 10, y: 10 }, force: true }).catch(() => null);
      await openingsHelp.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
    });
    console.log('   dismissed /openings page-help-modal');
  }
  const proTab = page.locator('[data-testid="tab-pro"]');
  if (await proTab.count() > 0) {
    await proTab.first().click().catch(() => null);
    // The featured section's getPlayerOpenings() is an async Dexie read; wait
    // for the testid to attach (up to 12s) rather than racing a fixed delay.
    // The pinned "featured" section was REVERTED to the standard player-card
    // grid on 2026-05-31 (21241797d); these rows waited on its testid for four
    // months and failed every prod run (PLAN §B #58 — the "header selector"
    // half). Today's contract: the Pro tab mounts its grid and lists a
    // GothamChess player card.
    await page.locator('[data-testid="pro-repertoires-tab"]').waitFor({ state: 'attached', timeout: 15_000 }).catch(() => null);
    const tabUp = await page.locator('[data-testid="pro-repertoires-tab"]').count();
    const gothamCards = await page.locator('[data-testid="pro-repertoires-tab"] [data-testid^="pro-player-card-"]').filter({ hasText: /gotham|levy/i }).count();
    rec('Pro tab mounts the standard player-card grid', tabUp > 0 ? 'PASS' : 'FAIL', `${tabUp} tab`);
    rec('the grid lists a GothamChess player card', gothamCards > 0 ? 'PASS' : 'FAIL', `${gothamCards} card(s)`);
  } else {
    rec('Pro tab toggle present on /openings', 'WARN', 'tab-pro not found');
  }

  console.log('  goto /openings/pro/gothamchess');
  await page.goto(`${PROD}/openings/pro/gothamchess`, { waitUntil: 'networkidle', timeout: 20_000 });
  const playerMount = await page.waitForSelector('[data-testid="pro-player-page"]', { timeout: 15_000 }).then(() => true).catch(() => false);
  rec('pro player page mounts on prod', playerMount ? 'PASS' : 'FAIL');

  await page.waitForTimeout(5000);

  // Dexie state check
  const dex = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const tx = req.result.transaction(['openings'], 'readonly');
        const all = tx.objectStore('openings').getAll();
        all.onsuccess = () => {
          const gotham = all.result.filter((o) => o.proPlayerId === 'gothamchess');
          resolve({ total: all.result.length, gothamCount: gotham.length, gothamIds: gotham.map((o) => o.id).sort() });
        };
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  });
  console.log(`  Dexie: ${dex.total} openings, ${dex.gothamCount} gothamchess → ${dex.gothamIds.join(', ')}`);

  // Expected Gotham IDs (10 original + 8 new = 18)
  const expectedIds = [
    'pro-gothamchess-italian',
    'pro-gothamchess-london',
    'pro-gothamchess-stafford-refute',
    'pro-gothamchess-caro-kann',
    'pro-gothamchess-scandinavian',
    'pro-gothamchess-qgd',
    'pro-gothamchess-ponziani',
    'pro-gothamchess-fantasy-caro',
    'pro-gothamchess-milner-barry',
    'pro-gothamchess-anti-sicilian',
    // 2026-05-28 new entries:
    'pro-gothamchess-trompowsky',
    'pro-gothamchess-english',
    'pro-gothamchess-vienna',
    'pro-gothamchess-kia',
    'pro-gothamchess-caro-advance-white',
    'pro-gothamchess-closed-sicilian',
    'pro-gothamchess-french-defense',
    'pro-gothamchess-pirc-defense',
  ];
  for (const id of expectedIds) {
    rec(`Dexie has ${id}`, dex.gothamIds.includes(id) ? 'PASS' : 'FAIL');
  }

  const body = await page.textContent('body');
  // The app is DEPERSONALISED (the house-voice doctrine: no names, ever): the
  // player page's <h1> prints the catalogue's display name for the player —
  // "The Accessible Tactical Repertoire" for gothamchess — not "GothamChess".
  // This row asserted a name the app deliberately stopped showing (#58's
  // "header selector" half). Assert the catalogue's own name instead.
  const catalogue = JSON.parse(readFileSync(new URL('../src/data/pro-repertoires.json', import.meta.url), 'utf8'));
  const expectedName = catalogue.players?.find?.((pl) => pl.id === 'gothamchess')?.name ?? '';
  const h1 = await page.locator('h1').first().innerText().catch(() => '');
  rec('player page header prints the catalogue display name', expectedName && h1.trim() === expectedName ? 'PASS' : 'FAIL', `h1="${h1.trim().slice(0, 60)}" expected="${expectedName}"`);
  rec('Caro-Kann opening name visible', /Caro-Kann/i.test(body) ? 'PASS' : 'FAIL');
  rec('London System opening name visible', /London/i.test(body) ? 'PASS' : 'FAIL');

  // Click into Caro-Kann (largest game count, most likely to render)
  const cardEl = page.locator('[data-testid="opening-card-pro-gothamchess-caro-kann"]');
  const cardCount = await cardEl.count();
  rec('Caro-Kann opening card rendered in DOM', cardCount === 1 ? 'PASS' : 'FAIL', `${cardCount} cards`);

  if (cardCount > 0) {
    console.log('\n  clicking into Caro-Kann detail');
    // The page-help modal auto-opens on the player page and covered the card:
    // the click below timed out at 30 s for as long as this audit has run on
    // prod (#58's "walkthrough click" half). Dismiss first, then click with a
    // bounded timeout and a forced fallback.
    await page.keyboard.press('Escape').catch(() => null);
    await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 1500 }).catch(() => null);
    await cardEl.first().click({ timeout: 8000 }).catch(async () => { await cardEl.first().click({ timeout: 8000, force: true }); });
    await page.waitForTimeout(6000);
    const url = page.url();
    rec('navigated to pro-gothamchess-caro-kann detail', /pro-gothamchess-caro-kann/.test(url) ? 'PASS' : 'FAIL', url);

    // Dismiss any open page-help-modal
    const helpModal = page.locator('[data-testid="page-help-modal"]');
    if (await helpModal.count() > 0) {
      console.log('\n  dismissing page-help-modal');
      await page.keyboard.press('Escape').catch(() => null);
      await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => {
        await page.locator('[data-testid="page-help-modal"]').click({ position: { x: 10, y: 10 }, force: true });
        await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
      });
      console.log('   help modal dismissed');
    }

    // Find Watch button + click
    console.log('\n  looking for Watch button');
    const watchBtnSelectors = [
      'button:has-text("Watch")',
      '[data-testid*="watch"]',
      'button:has-text("Listen")',
    ];
    let watchClicked = false;
    for (const sel of watchBtnSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        await el.click().catch((e) => { console.log('   click error:', e.message); });
        watchClicked = true;
        console.log(`   clicked via "${sel}"`);
        break;
      }
    }
    rec('Watch button found + clicked', watchClicked ? 'PASS' : 'FAIL');

    if (watchClicked) {
      console.log('  waiting 12s for narration to fire');
      await page.waitForTimeout(12_000);
      rec('TTS network requests fired (/api/tts streaming)', ttsRequests > 0 ? 'PASS' : 'FAIL', `${ttsRequests} requests`);
      const fullVoice = listener.getCapturedEvents().filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
      rec('voice/narration audit events captured', fullVoice.length > 0 ? 'PASS' : 'FAIL', `${fullVoice.length} voice events`);
      for (const v of fullVoice.slice(0, 3)) {
        console.log(`     ${v.kind} | ${(v.summary || '').slice(0, 90)}`);
      }
    }

    // ── New Caro content (2026-05-29): plans + model games + pitfalls ───────
    // Scroll the detail page and assert the new sections render. These are the
    // layers this session added; the audit is updated to the new contract
    // (living-audit rule, G1) before running.
    console.log('\n  verifying new Caro content sections');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => null);
    await page.waitForTimeout(2500);
    const detailBody = await page.evaluate(() => document.body.innerText).catch(() => '');
    rec('Middlegame plans section present', /middlegame|plan/i.test(detailBody) ? 'PASS' : 'WARN');
    rec('Model games section present (his wins)', /model game|Svidler|Hikaru|Bortnyk|Nakamura/i.test(detailBody) ? 'PASS' : 'WARN');
    rec('Pitfalls / common-mistakes present', /pitfall|mistake|avoid/i.test(detailBody) ? 'PASS' : 'WARN');
  }

  const realErrors = pageErrors.filter((e) => !/ERR_CERT|Failed to load resource/.test(e));
  rec('no app errors', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} app errors / ${pageErrors.length} total`);
  for (const e of realErrors.slice(0, 3)) console.log('     ', e);

  await page.screenshot({ path: 'audit-reports/pro-gothamchess-prod.png', fullPage: true });

} catch (e) {
  rec('walkthrough', 'FAIL', e.message);
  console.error(e);
} finally {
  await browser.close();
}

console.log('\n--- (3b) Audit stream delta pull ---');
const delta = await pullProdStream(tStart - 5000);
const deltaEntries = delta.entries || [];
rec('audit-stream captured this run', deltaEntries.length > 0 ? 'PASS' : 'WARN', `${deltaEntries.length} events`);

console.log('\n--- (2) Listener capture summary ---');
const captured = listener.getCapturedEvents();
rec('listener intercepted POSTs', interceptedPosts.length > 0 ? 'PASS' : 'WARN', `${interceptedPosts.length} POST bodies / ${captured.length} entries on listener`);
console.log(`  voice/narration events: ${voiceEvents.length}`);
for (const v of voiceEvents.slice(0, 5)) console.log(`    ${v.kind} | ${(v.summary || '').slice(0, 80)}`);

await listener.stop();

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${passed} passed, ${failed} failed, ${warn} warnings ===`);
process.exit(failed > 0 ? 1 : 0);
