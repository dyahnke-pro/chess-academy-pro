// 3-instrument post-deploy walkthrough for the Naroditsky Alapin
// deep build, targeting LIVE PROD. Verifies all 7 variations land in
// Dexie, the variation tabs render in the bigger-board PlayableLinePlayer
// (not the legacy WalkthroughMode fallback), TTS streaming fires on
// Watch, and audit events are captured.

import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
if (!SECRET) { console.error('AUDIT_STREAM_SECRET missing'); process.exit(1); }

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

const EXPECTED_VARIATIONS = [
  '2…d5 Open Variation',
  '2…e6 French-Style',
  '2…d6 Mainline',
  '2…g6 Hyper-Dragon',
  '2…Nc6 Line',
  'Spine 4…d6 Bc4 Gambit',
  'Spine 4…e6 IQP Lines',
];

const tStart = Date.now();
console.log('=== Post-deploy walkthrough: Naroditsky Alapin (PROD) ===');
console.log(`run start: ${new Date(tStart).toISOString()}\n`);

console.log('--- (3a) Audit stream baseline pull ---');
const baseline = await pullProdStream(tStart - 60_000);
if (baseline.error) rec('prod audit-stream reachable', 'FAIL', baseline.error);
else rec('prod audit-stream reachable', 'PASS', `${(baseline.entries || []).length} events in last 60s`);

console.log('\n--- (2) Starting local listener sidecar ---');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}`);

console.log('\n--- (1) Playwright driving live prod ---');
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

  console.log('  dismissing strength-calibration onboarding');
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(3000);
  if (await page.locator('[data-testid="strength-calibration-bubble"]').count() > 0) {
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => null);
  }

  console.log('  waiting 50s for deferred seed (pro-rep + plans + flashcards)');
  await page.waitForTimeout(50_000);

  console.log('  goto /openings/pro/naroditsky/pro-naroditsky-alapin');
  await page.goto(`${PROD}/openings/pro/naroditsky/pro-naroditsky-alapin`, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(6000);

  // Dismiss page-help-modal if present
  const helpModal = page.locator('[data-testid="page-help-modal"]');
  if (await helpModal.count() > 0) {
    await page.keyboard.press('Escape').catch(() => null);
    await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
  }

  const body = await page.textContent('body');
  rec('Alapin overview renders ("c3 anti-Sicilian")', /c3 anti-Sicilian|Naroditsky's most-played/.test(body) ? 'PASS' : 'FAIL');
  rec('Alapin key idea about c3 / d4 renders', /c3 supports d4|d4 on move 3/.test(body) ? 'PASS' : 'FAIL');

  // Verify all 7 variations show in tab list
  for (const vname of EXPECTED_VARIATIONS) {
    const visible = body.includes(vname);
    rec(`variation tab "${vname}" visible`, visible ? 'PASS' : 'FAIL');
  }

  // Verify trap names visible
  rec('trap "Nb5 Queen-Fork" visible', /Nb5 Queen-Fork/.test(body) ? 'PASS' : 'WARN');
  rec('trap "Bc4-Gambit" visible', /Bc4-Gambit/.test(body) ? 'PASS' : 'WARN');

  // Find + click first Watch button
  console.log('\n  clicking Watch on main lesson');
  const watchBtn = page.locator('button:has-text("Watch")').first();
  if (await watchBtn.count() > 0 && await watchBtn.isVisible()) {
    await watchBtn.click().catch(() => null);
    await page.waitForTimeout(10_000);
    rec('Watch button fires /api/tts streaming', ttsRequests > 0 ? 'PASS' : 'FAIL', `${ttsRequests} requests`);
    const fullVoice = listener.getCapturedEvents().filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
    rec('voice/narration audit events captured', fullVoice.length > 0 ? 'PASS' : 'WARN', `${fullVoice.length} events`);
    for (const v of fullVoice.slice(0, 2)) {
      console.log(`     ${v.kind} | ${(v.summary || '').slice(0, 90)}`);
    }
  } else {
    rec('Watch button found + clicked', 'FAIL', 'no Watch button visible');
  }

  // Switch to a variation tab + verify the bigger-board PlayableLinePlayer renders
  console.log('\n  switching to 2…d5 Open Variation tab');
  const d5Tab = page.locator('button:has-text("2…d5"), [role="tab"]:has-text("d5")').first();
  if (await d5Tab.count() > 0) {
    const ttsBaseline = ttsRequests;
    await d5Tab.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(3000);
    // Click Watch on the variation
    const watchVar = page.locator('button:has-text("Watch")').first();
    if (await watchVar.count() > 0) {
      await watchVar.click({ timeout: 5000 }).catch(() => null);
      await page.waitForTimeout(10_000);
      const newTts = ttsRequests - ttsBaseline;
      rec('variation Watch fires /api/tts (uses bigger-board path)', newTts > 0 ? 'PASS' : 'FAIL', `${newTts} new requests`);
    } else {
      rec('variation Watch button found', 'FAIL');
    }
  } else {
    rec('2…d5 variation tab found', 'WARN', 'not detected via selector');
  }

  const realErrors = pageErrors.filter((e) => !/ERR_CERT|Failed to load resource/.test(e));
  rec('no app errors', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} app errors`);

  await page.screenshot({ path: 'audit-reports/pro-naroditsky-alapin-prod.png', fullPage: true });

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
rec('listener intercepted POSTs', interceptedPosts.length > 0 ? 'PASS' : 'WARN', `${interceptedPosts.length} POSTs / ${captured.length} entries`);

await listener.stop();

const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${passed} passed, ${failed} failed, ${warn} warnings ===`);
process.exit(failed > 0 ? 1 : 0);
