// 3-instrument post-deploy audit for the opening-page book readers
// (From the Books / Overview / Key Ideas / Classic Wisdom).
//
// Verifies the 2026-06-11 fix: the shared useProseReader engine routes
// read-aloud through voiceService.speakReadAloud (bypassVerbosity) instead
// of speakForced (which honored the brief/silent cap and clipped passages).
//
// Three instruments together (G1):
//   1. Playwright drives the live page — dismiss onboarding, tap a
//      "From the Books" paragraph, Overview paragraph, Classic Wisdom header.
//   2. Live prod audit-stream pulled before + after (endpoint-health check;
//      this run's events route to the local listener by the localStorage
//      override, by design).
//   3. Narration-listener sidecar — the page POSTs its voice-speak-invoked
//      events to a local server; we assert the SOURCE is speakReadAloud
//      (the bypassVerbosity path) and the spoken text is the FULL passage,
//      and that NO briefCap event fired for these reads.
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-book-reader-prod.mjs
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ID = process.env.AUDIT_OPENING || 'ruy-lopez';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';

const results = [];
const ttsReads = [];
function rec(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`[audit] ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
}
function decodeTtsText(url) {
  const m = url.match(/[?&]text=([^&]*)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

async function pullProdStream(since) {
  if (!SECRET) return { ok: false, note: 'no AUDIT_STREAM_SECRET' };
  try {
    const r = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    const j = await r.json().catch(() => ({}));
    return { ok: r.status === 200, status: r.status, storage: j.storage, count: j.count ?? (j.entries?.length ?? 0) };
  } catch (e) { return { ok: false, note: String(e).slice(0, 80) }; }
}

async function clickAndCapture(page, locator, label) {
  const before = ttsReads.length;
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click({ timeout: 6000 }).catch((e) => rec(`${label} click`, false, e.message.slice(0, 60)));
  await page.waitForTimeout(3500);
  const newReads = ttsReads.slice(before);
  return newReads;
}

async function main() {
  await mkdir('audit-reports', { recursive: true });
  const listener = await startAuditListener();
  const streamBefore = await pullProdStream(Date.now() - 600000);
  rec('prod audit-stream reachable (before)', streamBefore.ok,
    streamBefore.ok ? `status=${streamBefore.status} storage=${streamBefore.storage}` : (streamBefore.note || `status=${streamBefore.status}`));

  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions() });

  // Point the app's audit stream at our listener BEFORE any app code runs,
  // so every voice-speak-invoked event is POSTed to the sidecar.
  await ctx.addInitScript(([url, secret]) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* ignore */ }
  }, [listener.url, listener.secret]);

  const page = await ctx.newPage();
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/api/tts')) {
      const text = decodeTtsText(u);
      if (text && text !== '.') ttsReads.push({ text, len: text.length });
    }
  });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[audit] console.error:', m.text().slice(0, 140)); });

  console.log('[audit] goto', `${BASE}/openings/${ID}`);
  await page.goto(`${BASE}/openings/${ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Dismiss the strength-calibration bubble (first-run).
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* already calibrated */ }

  // Poll-dismiss the "How to use a Masterclass" page-help modal — it can
  // auto-open ~10s after mount and overlays the page (z-100).
  const help = page.locator('[data-testid="page-help-modal"]');
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    if (await help.count()) {
      await page.locator('[data-testid="page-help-close"]').click({ timeout: 4000 }).catch(() => {});
      await help.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
    }
  }
  rec('page-help modal dismissed', (await help.count()) === 0);

  // ── Instrument 1: drive the reads ───────────────────────────────────
  const book = page.locator('[data-testid="book-reader"]');
  if (await book.count()) {
    const paras = book.locator('[data-testid^="book-paragraph-"]');
    const n = await paras.count();
    // Each book page must offer MULTIPLE tappable paragraphs (the fix —
    // single-block pages were one un-clickable wall).
    rec('From-the-Books page has multiple clickable paragraphs', n >= 2, `count=${n}`);
    let firstHead = '';
    if (n >= 1) {
      const reads = await clickAndCapture(page, paras.first(), 'From-the-Books paragraph 1');
      firstHead = (reads[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase();
      // The first paragraph reads only ITS OWN chunk, not the whole block
      // (the split). A 781-char read here would mean the old single-block path.
      rec('From-the-Books paragraph 1 reads its own chunk', reads.length > 0 && reads[0].len < 400,
        reads[0] ? `len=${reads[0].len}` : 'no read');
    }
    if (n >= 2) {
      // Tap a LATER paragraph — the read must START FROM THAT paragraph
      // (different text than paragraph 1), not replay the top of the page.
      const reads = await clickAndCapture(page, paras.nth(n - 1), `From-the-Books paragraph ${n}`);
      const laterHead = (reads[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase();
      rec('tapping a later paragraph starts the read FROM that paragraph',
        laterHead.length > 0 && laterHead !== firstHead,
        `later="${laterHead}" first="${firstHead}"`);
    }
  } else rec('book-reader present', false, 'not mounted');

  const ovItem = page.locator('[data-testid^="listenable-overview-item-"]').first();
  if (await ovItem.count()) {
    const reads = await clickAndCapture(page, ovItem, 'Overview paragraph');
    rec('Overview paragraph reads', reads.length > 0, reads[0] ? `len=${reads[0].len}` : 'no read');
  }

  // Classic Wisdom now supports per-paragraph tap-to-start too.
  const cwSection = page.locator('[data-testid="classic-wisdom-section"]');
  if (await cwSection.count()) {
    const cwParas = cwSection.locator('[data-testid^="wisdom-paragraph-"]');
    const cwN = await cwParas.count();
    rec('Classic Wisdom has multiple tappable paragraphs', cwN >= 2, `count=${cwN}`);
    let cwFirstHead = '';
    if (cwN >= 1) {
      const r1 = await clickAndCapture(page, cwParas.first(), 'Classic Wisdom paragraph 1');
      cwFirstHead = (r1[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase();
      rec('Classic Wisdom paragraph 1 reads its own chunk', r1.length > 0 && r1[0].len < 400,
        r1[0] ? `len=${r1[0].len}` : 'no read');
    }
    if (cwN >= 2) {
      const r2 = await clickAndCapture(page, cwParas.nth(cwN - 1), `Classic Wisdom paragraph ${cwN}`);
      const cwLater = (r2[0]?.text || '').replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase();
      rec('Classic Wisdom later-paragraph tap starts the read FROM that paragraph',
        cwLater.length > 0 && cwLater !== cwFirstHead, `later="${cwLater}" first="${cwFirstHead}"`);
    }
  } else rec('classic-wisdom-section present', false);

  await page.waitForTimeout(1500); // let trailing audit POSTs land

  // ── Instrument 3: the narration listener ────────────────────────────
  const events = listener.getCapturedEvents();
  const speakEvents = events.filter((e) => e.kind === 'voice-speak-invoked');
  const readAloud = speakEvents.filter((e) => (e.source || '').includes('speakReadAloud'));
  const forced = speakEvents.filter((e) => (e.source || '').includes('speakForced'));
  const briefCap = speakEvents.filter((e) => (e.source || '').includes('briefCap'));

  rec('voice events captured by listener', speakEvents.length > 0, `count=${speakEvents.length}`);
  rec('reads routed through speakReadAloud (bypassVerbosity)', readAloud.length > 0,
    `speakReadAloud=${readAloud.length} speakForced=${forced.length}`);
  rec('NO briefCap clipping fired on the book reads', briefCap.length === 0, `briefCap=${briefCap.length}`);
  if (readAloud[0]?.details) console.log('[audit] sample speakReadAloud event:', readAloud[0].source, readAloud[0].details);

  const streamAfter = await pullProdStream(Date.now() - 120000);
  rec('prod audit-stream reachable (after)', streamAfter.ok,
    streamAfter.ok ? `status=${streamAfter.status} storage=${streamAfter.storage}` : (streamAfter.note || ''));

  await browser.close();
  await listener.stop();

  const passed = results.filter((r) => r.ok).length;
  const report = { ts: new Date().toISOString(), base: BASE, opening: ID, passed, total: results.length, results, ttsReads, listenerSpeakEvents: speakEvents };
  const dir = `audit-reports/book-reader-${Date.now()}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\n[audit] ${passed}/${results.length} green — report at ${dir}/report.json`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => { console.error('audit failed:', e); process.exit(1); });
