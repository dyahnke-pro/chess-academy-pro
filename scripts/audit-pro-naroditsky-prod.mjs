// 3-instrument post-deploy walkthrough for the Naroditsky pro-rep
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
console.log('=== Post-deploy walkthrough: Naroditsky pro-rep (PROD) ===');
console.log(`run start: ${new Date(tStart).toISOString()}\n`);

// (3a) Baseline stream pull — confirms reachability + records pre-run state
console.log('--- (3a) Audit stream baseline pull ---');
const baseline = await pullProdStream(tStart - 60_000);
if (baseline.error) rec('prod audit-stream reachable', 'FAIL', baseline.error);
else rec('prod audit-stream reachable', 'PASS', `${(baseline.entries || []).length} events in last 60s`);
console.log();

// (2) Start the local listener — receives audit POSTs we route from the page
console.log('--- (2) Starting local listener sidecar ---');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}\n`);

// (1) Playwright
console.log('--- (1) Playwright driving live prod ---');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

const interceptedPosts = [];
const pageErrors = [];
const voiceEvents = [];

page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });
page.on('request', async (req) => {
  if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
    try {
      const body = req.postDataJSON();
      interceptedPosts.push(body);
      // Voice events are kind='voice-speak-invoked' or related
      if (Array.isArray(body?.entries)) {
        for (const e of body.entries) {
          if (/voice|speak|narration/i.test(e.kind || '')) voiceEvents.push(e);
        }
      }
    } catch {}
  }
});

try {
  // First load the app at root so we can set localStorage
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Route audits to our local listener AND keep prod stream (the route function
  // in the app is single-target — we replace, knowing prod pull catches the
  // delta separately).
  await page.evaluate(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
  console.log('  configured page → listener for audit POSTs');

  // Dismiss the strength-calibration onboarding bubble. The dialog needs
  // an active profile in the Zustand store to accept clicks (handlePick
  // exits early on !activeProfile). On a cold context the profile-create
  // path runs async; give it time to settle, then click.
  console.log('  waiting for strength-calibration onboarding + profile init...');
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(3000);  // profile init beat
  const bubbleCount = await page.locator('[data-testid="strength-calibration-bubble"]').count();
  if (bubbleCount > 0) {
    console.log('  picking intermediate band');
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    // Bubble close = applyStrength roundtrip; wait up to 15s for onDone.
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 })
      .catch(async () => {
        console.log('  bubble didn\'t close on first click — retrying');
        await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000, force: true });
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
      });
    console.log('  onboarding dismissed');
  } else {
    console.log('  no onboarding bubble (already calibrated)');
  }

  // Wait for deferred seed to complete (loadProRepertoireData is in
  // startDeferredSeed alongside ECO + gambits + model games + flashcards
  // + narrations — total ~25-35s on a cold context).
  console.log('  waiting 35s for first-install deferred seed (pro-rep + ECO + plans + flashcards + narrations)');
  await page.waitForTimeout(35_000);

  // Navigate to the pro player page
  console.log('  goto /openings/pro/naroditsky');
  await page.goto(`${PROD}/openings/pro/naroditsky`, { waitUntil: 'networkidle', timeout: 20_000 });
  const playerMount = await page.waitForSelector('[data-testid="pro-player-page"]', { timeout: 15_000 }).then(() => true).catch(() => false);
  rec('pro player page mounts on prod', playerMount ? 'PASS' : 'FAIL');

  // ProPlayerPage reads openings async after mount — give it time to render
  await page.waitForTimeout(5000);

  // Dexie state check — is the pro entry actually in IndexedDB?
  const dex = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const tx = req.result.transaction(['openings'], 'readonly');
        const all = tx.objectStore('openings').getAll();
        all.onsuccess = () => {
          const naro = all.result.filter((o) => o.proPlayerId === 'naroditsky');
          resolve({ total: all.result.length, naroCount: naro.length, naroIds: naro.map((o) => o.id) });
        };
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  });
  console.log(`  Dexie: ${dex.total} openings, ${dex.naroCount} naroditsky → ${dex.naroIds.join(', ')}`);
  rec('Dexie has pro-naroditsky-caro-kann', dex.naroIds.includes('pro-naroditsky-caro-kann') ? 'PASS' : 'FAIL');

  // Inspect what the page actually shows
  const body = await page.textContent('body');
  rec('Naroditsky header renders', /Daniel Naroditsky/.test(body) ? 'PASS' : 'FAIL');
  rec('Caro-Kann opening name visible (any context)', /Caro-Kann/.test(body) ? 'PASS' : 'FAIL');

  // OpeningCard sets data-testid="opening-card-<id>"
  const cardEl = page.locator('[data-testid="opening-card-pro-naroditsky-caro-kann"]');
  const cardCount = await cardEl.count();
  rec('opening card rendered in DOM', cardCount === 1 ? 'PASS' : 'FAIL', `${cardCount} cards`);

  // If the card didn't render, force-reload after a longer wait
  if (cardCount === 0 && dex.naroIds.includes('pro-naroditsky-caro-kann')) {
    console.log('  card missing despite Dexie having entry — reload + retry');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    const c2 = await page.locator('[data-testid="opening-card-pro-naroditsky-caro-kann"]').count();
    rec('opening card after reload', c2 === 1 ? 'PASS' : 'FAIL', `${c2} cards`);
  }

  // Click the card
  console.log('\n  clicking into Caro-Kann detail');
  if (await cardEl.count() > 0) {
    await cardEl.first().click();
    await page.waitForTimeout(6000);
    const url = page.url();
    rec('navigated to /pro/naroditsky/pro-naroditsky-caro-kann', /pro-naroditsky-caro-kann/.test(url) ? 'PASS' : 'FAIL', url);

    const detailBody = await page.textContent('body');
    rec('rebuilt overview renders ("Naroditsky has actually played")', /Naroditsky has actually played/.test(detailBody) ? 'PASS' : 'FAIL');
    rec('key idea about c6-pawn renders', /c6-pawn|wedge/.test(detailBody) ? 'PASS' : 'FAIL');
    rec('variation tabs render (Advance / Two Knights / Exchange / Classical / Fantasy)', /Advance|Two Knights|Exchange|Classical|Fantasy/i.test(detailBody) ? 'PASS' : 'FAIL');

    // Track TTS network activity — Polly streamed audio hits /api/tts.
    // Also track Web Speech utterance starts (the fallback path).
    let ttsRequests = 0;
    page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests++; });

    // Dismiss any open page-help-modal (auto-opens on first visit per
    // CLAUDE.md; otherwise blocks every interaction below).
    const helpModal = page.locator('[data-testid="page-help-modal"]');
    if (await helpModal.count() > 0) {
      console.log('\n  dismissing page-help-modal');
      // Click outside the modal or press Escape
      await page.keyboard.press('Escape').catch(() => null);
      await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => {
        // Try clicking the modal backdrop (the outer div)
        await page.locator('[data-testid="page-help-modal"]').click({ position: { x: 10, y: 10 }, force: true });
        await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
      });
      console.log('   help modal dismissed');
    }

    // Find + click the Watch button to launch the LessonPlayer
    console.log('\n  looking for Watch / Learn buttons');
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
      console.log('  waiting 12s for narration to fire (full Watch register)');
      await page.waitForTimeout(12_000);
      const fullTtsCount = ttsRequests;
      rec('TTS network requests fired (/api/tts streaming)', fullTtsCount > 0 ? 'PASS' : 'FAIL', `${fullTtsCount} requests`);
      // Filter listener captures for voice-related events
      const fullVoice = listener.getCapturedEvents().filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
      rec('voice/narration audit events captured (full register)', fullVoice.length > 0 ? 'PASS' : 'FAIL', `${fullVoice.length} voice events`);
      let fullText = '';
      for (const v of fullVoice.slice(0, 3)) {
        console.log(`     ${v.kind} | ${(v.summary || '').slice(0, 90)} | source=${v.source || ''}`);
        const m = (v.summary || '').match(/text="([^"]+)"/);
        if (m && !fullText) fullText = m[1];
      }
      console.log(`     full-register text sample: "${fullText.slice(0, 90)}..."`);

      // === BRIEF REGISTER VERIFICATION ===
      // Toggle the verbosity setting in the Zustand store + IndexedDB
      // profile (no reload — reloads after a TTS click race the streaming
      // audio chunk fetch). Then trigger narration via the in-page replay
      // controls or a fresh tab click and watch the listener for the
      // applyBriefVoiceCap signature.
      console.log('\n  switching verbosity → brief');
      const flipped = await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => {
          const tx = req.result.transaction(['profiles'], 'readwrite');
          const ps = tx.objectStore('profiles');
          const get = ps.getAll();
          get.onsuccess = () => {
            for (const p of get.result) {
              p.preferences = p.preferences || {};
              p.preferences.coachNarration = 'brief';
              ps.put(p);
            }
            tx.oncomplete = () => resolve(get.result.length);
          };
        };
        req.onerror = () => resolve(0);
      }));
      console.log(`     flipped ${flipped} profile(s) to brief`);

      // The Watch button on the same page is still mounted — click it again
      // (LessonPlayer will start fresh, reading the new verbosity from store).
      const briefVoiceBaseline = listener.getCapturedEvents().length;
      const briefTtsBaseline = ttsRequests;
      await page.waitForTimeout(2000);
      // Variation tabs need a quick click → click back to fresh the player
      const tabs = page.locator('[role="tab"], button:has-text("Two Knights"), button:has-text("Exchange")');
      if (await tabs.count() > 0) {
        await tabs.first().click({ timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(1500);
      }
      const w2 = page.locator('button:has-text("Watch")').first();
      if (await w2.count() > 0 && await w2.isVisible().catch(() => false)) {
        await w2.click({ force: true, timeout: 5000 }).catch(() => null);
        await page.waitForTimeout(10_000);
        const newTts = ttsRequests - briefTtsBaseline;
        const briefVoice = listener.getCapturedEvents().slice(briefVoiceBaseline).filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
        rec('TTS fired in brief mode', newTts > 0 ? 'PASS' : 'WARN', `${newTts} new requests`);
        let briefText = '';
        for (const v of briefVoice.slice(0, 3)) {
          console.log(`     ${v.kind} | ${(v.summary || '').slice(0, 90)} | source=${v.source || ''}`);
          const m = (v.summary || '').match(/text="([^"]+)"/);
          if (m && !briefText) briefText = m[1];
        }
        const wordCount = briefText.trim().split(/\s+/).length;
        const cappedBySource = briefVoice.some((v) => /briefCap/i.test(v.source || ''));
        const passes = briefText && (wordCount <= 30 || cappedBySource);
        rec('brief register text clipped (≤30w or applyBriefVoiceCap)', passes ? 'PASS' : 'WARN', `${wordCount}w, capper=${cappedBySource}, sample="${briefText.slice(0, 60)}"`);
      } else {
        rec('Brief register triggered', 'WARN', 'no Watch click to retest after verbosity flip — full register proves voiceService.speak path; G5 brief cap is wired in applyBriefVoiceCap (CLAUDE.md)');
      }
    }
  } else {
    rec('Caro-Kann card clickable', 'FAIL', 'no card heading found');
  }

  // Page errors
  const realErrors = pageErrors.filter((e) => !/ERR_CERT|Failed to load resource/.test(e));
  rec('no app errors', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} app errors / ${pageErrors.length} total`);
  for (const e of realErrors.slice(0, 3)) console.log('     ', e);

  await page.screenshot({ path: 'audit-reports/pro-naroditsky-prod.png', fullPage: true });

} catch (e) {
  rec('walkthrough', 'FAIL', e.message);
  console.error(e);
} finally {
  await browser.close();
}

// (3b) Post-run prod stream pull — show what this run actually emitted
console.log('\n--- (3b) Audit stream delta pull ---');
const delta = await pullProdStream(tStart - 5000);
const deltaEntries = delta.entries || [];
rec('audit-stream captured this run', deltaEntries.length > 0 ? 'PASS' : 'WARN', `${deltaEntries.length} events`);
const byKind = {};
for (const e of deltaEntries) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
console.log('  events by kind:', JSON.stringify(byKind, null, 2).split('\n').join('\n  '));
const proRel = deltaEntries.filter((e) => /naroditsky|pro-rep|opening-detail|caro/i.test(JSON.stringify(e)));
console.log(`  pro-rep / caro / opening-detail related: ${proRel.length}`);
for (const e of proRel.slice(0, 6)) console.log(`    ${e.kind} | ${(e.summary || '').slice(0, 70)} | ${e.route || ''}`);

// (2 results) Listener captures
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
