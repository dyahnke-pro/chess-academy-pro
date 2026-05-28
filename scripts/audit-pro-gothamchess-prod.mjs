// 3-instrument post-deploy walkthrough for the GothamChess pro-rep
// rebuild, targeting LIVE PROD. Instruments:
//   (1) Playwright drives the actual prod UI
//   (2) Local listener captures voice + audit POSTs (sidecar via
//       auditStreamUrl localStorage override)
//   (3) Live audit-stream pulled before + after the run, diff'd
//       to surface what THIS run emitted.

import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
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

  console.log('  waiting for strength-calibration onboarding + profile init...');
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(3000);
  const bubbleCount = await page.locator('[data-testid="strength-calibration-bubble"]').count();
  if (bubbleCount > 0) {
    console.log('  picking intermediate band');
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 })
      .catch(async () => {
        await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000, force: true });
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
      });
    console.log('  onboarding dismissed');
  } else {
    console.log('  no onboarding bubble (already calibrated)');
  }

  console.log('  waiting 35s for first-install deferred seed (pro-rep + ECO + plans + flashcards + narrations)');
  await page.waitForTimeout(35_000);

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
  rec('GothamChess header renders', /Levy Rozman|GothamChess|Gotham/i.test(body) ? 'PASS' : 'FAIL');
  rec('Caro-Kann opening name visible', /Caro-Kann/i.test(body) ? 'PASS' : 'FAIL');
  rec('London System opening name visible', /London/i.test(body) ? 'PASS' : 'FAIL');

  // Click into Caro-Kann (largest game count, most likely to render)
  const cardEl = page.locator('[data-testid="opening-card-pro-gothamchess-caro-kann"]');
  const cardCount = await cardEl.count();
  rec('Caro-Kann opening card rendered in DOM', cardCount === 1 ? 'PASS' : 'FAIL', `${cardCount} cards`);

  if (cardCount > 0) {
    console.log('\n  clicking into Caro-Kann detail');
    await cardEl.first().click();
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
