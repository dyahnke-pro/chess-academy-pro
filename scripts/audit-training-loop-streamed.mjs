#!/usr/bin/env node
/**
 * Three-instrument training-loop audit (David's playbook §9 doctrine):
 *   1. Playwright — drives the live UI (dashboard reps, weakness drill, plan,
 *      opening WLPP) and asserts the DOM.
 *   2. Live audit stream (G2) — points the app's audit-stream at a local
 *      LISTENER sidecar (scripts/audit-lib/audit-listener.mjs) by seeding
 *      profile.preferences.auditStreamUrl/secret, so every logAppAudit() the
 *      app emits during the run is captured server-side (full round-trip).
 *   3. Narration — decodes /api/tts text AND inspects the listener's
 *      voice-speak-invoked events (text + source + verbosity).
 *
 * Verifies the training loop EMITS the events the spec promises while it runs:
 * todays-reps-built, navigation into the drill, voice-speak on a lesson, etc.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-training-loop-streamed.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const U = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ttsTextOf = (u) => { const m = u.match(/[?&]text=([^&]+)/); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch { return m[1]; } };
const isWarmup = (t) => !t || t.trim() === '.' || t.trim() === '';

const listener = await startAuditListener();
console.log(`[stream] listener up at ${listener.url}`);

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const tts = [];
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 140)));
page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) tts.push(ttsTextOf(r.url())); });

async function closeHelp() { const m = page.locator('[data-testid="page-help-modal"]'); for (let i = 0; i < 4; i++) { if (!(await m.count().catch(() => 0))) return; await page.keyboard.press('Escape').catch(() => {}); await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 1500 }).catch(() => {}); if (await m.first().waitFor({ state: 'detached', timeout: 1500 }).then(() => 1).catch(() => 0)) return; await sleep(300); } }

// boot
await page.goto(`${U}/`, { waitUntil: 'networkidle' });
await sleep(3000);

// Point the app's audit-stream at the listener + seed training-loop content.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
const seeded = await page.evaluate(({ url, secret, FEN, now }) => new Promise((res) => {
  const o = indexedDB.open('ChessAcademyDB');
  o.onsuccess = () => {
    const db = o.result;
    const tx = db.transaction(['profiles', 'openings', 'misconceptionTags'], 'readwrite');
    const pg = tx.objectStore('profiles').get('main');
    pg.onsuccess = () => { const p = pg.result; if (p) { p.preferences = { ...p.preferences, auditStreamUrl: url, auditStreamSecret: secret }; tx.objectStore('profiles').put(p); } };
    const og = tx.objectStore('openings').get('ruy-lopez');
    og.onsuccess = () => { const r = og.result; if (r) { r.isFavorite = true; tx.objectStore('openings').put(r); } };
    const mt = tx.objectStore('misconceptionTags');
    mt.put({ id: 's1', tag: 'overvalued-attack', source: 'game-review', createdAt: now - 2 * 864e5, fen: FEN, playedSan: 'Bxf7+', bestSan: 'O-O', cpLoss: 320, gamePhase: 'opening', openingId: 'ruy-lopez', openingName: 'Ruy Lopez', status: 'open', masteryHits: 0, dueAt: now - 864e5, puzzleThemes: ['fork', 'hangingPiece'] });
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  };
  o.onerror = () => res(false);
}), { url: listener.url, secret: listener.secret, FEN, now: Date.now() });
console.log(`[stream] seeded profile audit-stream + training data: ${seeded}`);

// Reload so App.init() hydrates the audit-stream config cache from the profile.
await page.goto(`${U}/`, { waitUntil: 'domcontentloaded' });
await sleep(4000);
await closeHelp();

// ── Instrument 1: DOM — dashboard reps render ──────────────────────────────
const repCards = await page.locator('[data-testid^="dashboard-rep-"]').count();
console.log(`\n[DOM] dashboard rep cards: ${repCards}`);

// Drive: tap a weakness rep → adaptive drill (emits navigation + tag events).
if (await page.locator('[data-testid="dashboard-rep-weakness"]').count()) {
  await page.locator('[data-testid="dashboard-rep-weakness"]').first().click({ timeout: 6000 }).catch(() => {});
  await sleep(2500);
  console.log(`[DOM] after weakness-rep tap → ${page.url()}`);
}

// Drive an opening WLPP Watch to fire narration (voice-speak-invoked).
for (let i = 0; i < 3; i++) { await page.goto(`${U}/openings/ruy-lopez`, { waitUntil: 'domcontentloaded' }); if (await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 12000 }).then(() => 1).catch(() => 0)) break; await sleep(800); }
await closeHelp();
await page.locator('[data-testid="walkthrough-btn"]').click({ timeout: 8000 }).catch(async () => {
  await closeHelp();
  await page.locator('[data-testid="walkthrough-btn"]').click({ force: true, timeout: 4000 }).catch(() => {});
});
const watchMounted = await page.locator('[data-testid="lesson-player"]').waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
console.log(`[DOM] Watch lesson mounted: ${watchMounted}`);
// Poll up to 16s for the first narration line (heavier first beats need time).
for (let w = 0; w < 16000 && tts.filter((t) => !isWarmup(t)).length === 0; w += 800) await sleep(800);

// Visit the plan hub (emits todays-reps-built).
await page.goto(`${U}/coach/plan`, { waitUntil: 'domcontentloaded' });
await closeHelp();
await sleep(4000);

// Give async audit POSTs a beat to flush to the listener.
await sleep(2000);

// ── Instrument 2: live audit-stream events captured by the listener ────────
const counts = listener.countByKind();
console.log('\n[STREAM] audit events captured by listener (countByKind):');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   ${k}: ${n}`));
const loopKinds = ['todays-reps-built', 'voice-speak-invoked', 'voice-speak-silenced', 'misconception-captured', 'tag-drill-result', 'route-changed', 'auto-import-completed'];
console.log('\n[STREAM] loop-relevant events present?');
for (const k of loopKinds) console.log(`   ${k}: ${(counts[k] ?? 0) > 0 ? 'YES (' + counts[k] + ')' : 'no'}`);

// ── Instrument 3: narration (listener voice events + /api/tts text) ────────
const voiceEvents = listener.getCapturedEvents().filter((e) => e.kind === 'voice-speak-invoked');
console.log(`\n[NARRATION] voice-speak-invoked events: ${voiceEvents.length}`);
voiceEvents.slice(0, 4).forEach((e, i) => console.log(`   speak[${i}] source=${e.source ?? '?'} text="${String(e.summary ?? e.text ?? '').slice(0, 80)}"`));
const prose = [...new Set(tts.filter((t) => !isWarmup(t)))];
console.log(`[NARRATION] /api/tts non-warmup lines: ${prose.length}`);
prose.slice(0, 3).forEach((t, i) => console.log(`   tts[${i}]: ${t.slice(0, 80)}`));

console.log(`\n[RESULT] pageErrors=${pageErrors.length} totalStreamEvents=${listener.getCapturedEvents().length}`);
pageErrors.slice(0, 3).forEach((e) => console.log('   ' + e));

await browser.close();
await listener.stop?.();
