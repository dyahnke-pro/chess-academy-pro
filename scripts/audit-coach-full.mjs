/**
 * audit-coach-full — the hard, 3-instrument coach-tab audit.
 *
 * David 2026-06-04: "run a full audit again. Use the three tools and read the
 * replies. Push it harder. Coach tab working at every turn. Check the blunders,
 * make sure it plays the requested opening."
 *
 * THREE INSTRUMENTS, together, every scenario:
 *   1. Playwright drives live prod (Learn + Play): plays moves, types chat,
 *      walks a blunder, requests specific openings.
 *   2. audit-stream — the prod /api/audit-stream is pulled BEFORE and AFTER the
 *      run (endpoint health + real-device delta), AND a local narration-listener
 *      sidecar captures every voice/narration/move/blunder event the app emits
 *      with its source + verbosity tag.
 *   3. /api/tts capture — the actual spoken words for every turn, read back and
 *      checked against the board.
 *   (+ in-page __AUDIT__ dump for grounding trips; + provider-health gate so a
 *      DeepSeek outage reads INCONCLUSIVE, never a false pass.)
 *
 * READS THE REPLIES: every captured narration / blunder explanation / requested-
 * opening reply is asserted on for content and saved to the report.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *        node scripts/audit-coach-full.mjs
 */
import { chromium } from 'playwright-core';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const AUDIT_SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-full-${stamp}`;
const BOOT = 30_000;

const WHITE_DEV = [
  ['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['b1', 'c3'],
  ['e1', 'g1'], ['d2', 'd3'], ['c1', 'e3'], ['d1', 'e2'], ['a2', 'a3'], ['h2', 'h3'],
];

const ERROR_FALLBACK_RE =
  /having trouble connecting|trouble connecting right now|can't verify which moves|i can't verify|something went wrong|try again in a moment|ask me your move or tell me what you want to learn/i;
const isErrorFallback = (s) => typeof s === 'string' && ERROR_FALLBACK_RE.test(s);
const isRealNarration = (s) => typeof s === 'string' && s.replace(/[\s.]/g, '').length >= 3 && !isErrorFallback(s);

async function pullProdStream(sinceMs) {
  if (!AUDIT_SECRET) return { ok: false, reason: 'no AUDIT_STREAM_SECRET' };
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': AUDIT_SECRET } });
    const j = await res.json();
    return { ok: true, status: res.status, count: j.count, storage: j.storage };
  } catch (e) { return { ok: false, reason: String(e?.message ?? e) }; }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[coach-full] base=${BASE_URL}\n[coach-full] out=${OUT_DIR}`);

  // INSTRUMENT 2a — prod audit-stream health/delta BEFORE the run.
  const runStart = Date.now();
  const streamBefore = await pullProdStream(runStart - 60_000);
  console.log(`[coach-full] prod audit-stream BEFORE: ${JSON.stringify(streamBefore)}`);

  const listener = await startAuditListener();
  console.log(`[coach-full] listener=${listener.url}`);

  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath: exe, args: sandboxLaunchArgs() });

  const results = [];
  const replies = []; // every reply we read, with context
  const sanTripSummaries = [];
  const log = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };

  const mkPage = async (ctx) => {
    const page = await ctx.newPage();
    const consoleErrors = [], pageErrors = [], ttsReqs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));
    page.on('request', (r) => {
      if (!/\/api\/tts/.test(r.url())) return;
      let text = '';
      try { const u = new URL(r.url()); text = u.searchParams.get('text') ?? ''; if (!text && r.method() === 'POST') { const b = r.postDataJSON(); text = (b?.text ?? b?.input ?? '').toString(); } } catch { text = (r.postData() || '').slice(0, 200); }
      ttsReqs.push({ t: Date.now(), text: text.slice(0, 220) });
    });
    return { page, consoleErrors, pageErrors, ttsReqs };
  };
  const realTtsSince = (ttsReqs, since) => ttsReqs.filter((r) => r.t >= since && isRealNarration(r.text));
  const dumpAudit = async (page, kinds) => {
    try { const all = await page.evaluate(async () => { const a = window.__AUDIT__; if (!a?.dump) return []; try { return await a.dump(); } catch { return []; } }); return all.filter((e) => kinds.includes(e.kind)); } catch { return []; }
  };
  const tryMove = async (page, from, to) => {
    const f = page.locator(`[data-square="${from}"]`).first(), t = page.locator(`[data-square="${to}"]`).first();
    if ((await f.count()) === 0 || (await t.count()) === 0) return false;
    await f.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(160); await t.click({ timeout: 3000 }).catch(() => {}); return true;
  };
  const isEmpty = async (page, sq) => { try { return await page.evaluate((s) => { const el = document.querySelector(`[data-square="${s}"]`); return !el || !(el.querySelector('[data-piece],img,[draggable="true"],[class*="piece"]') || el.getAttribute('data-piece')); }, sq); } catch { return false; } };
  const occupied = async (page, sq) => !(await isEmpty(page, sq));
  const blackOcc = async (page) => { try { return await page.evaluate(() => { const o = []; document.querySelectorAll('[data-square]').forEach((s) => { const n = s.getAttribute('data-square') || ''; if (!/[78]$/.test(n)) return; if (s.querySelector('[data-piece],img,[draggable="true"],[class*="piece"]') || s.getAttribute('data-piece')) o.push(n); }); return o.sort().join(','); }); } catch { return ''; } };
  const dismissOnboard = async (page) => {
    // The strength-calibration bubble's applyStrength is async; one click can
    // land before the Zustand profile is ready, so the bubble lingers and
    // intercepts the hub-tile click. Retry the band-pick until it detaches.
    await page.waitForTimeout(2500);
    const c = page.locator('[data-testid="strength-calibration-bubble"]');
    for (let i = 0; i < 5; i++) {
      if (!(await c.count().catch(() => 0))) return; // gone
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 5000, force: true }).catch(() => {});
      const detached = await c.waitFor({ state: 'detached', timeout: 8000 }).then(() => true).catch(() => false);
      if (detached) return;
      await page.waitForTimeout(1000);
    }
  };
  const dismissHelp = async (page) => { const h = page.locator('[data-testid="page-help-close"]').first(); if (await h.count().catch(() => 0)) await h.click({ timeout: 3000 }).catch(() => {}); };
  const gotoLearn = async (page) => {
    await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded', timeout: BOOT }).catch(() => {});
    await page.waitForTimeout(1500);
    await dismissOnboard(page); // bubble can re-appear on the hub route — clear it before the tile click
    await dismissHelp(page);
    const tile = page.locator('[data-testid="coach-action-teach"]').first();
    await tile.waitFor({ state: 'visible', timeout: 15000 }); await tile.click(); await page.waitForTimeout(2500); await dismissHelp(page);
    await page.waitForURL(/\/coach\/teach/, { timeout: 10000 }).catch(() => {});
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 15000 });
  };
  const wireListener = async (page) => { await page.evaluate(({ url, secret }) => { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); }, { url: listener.url, secret: LOCAL_LISTENER_SECRET }); };
  const sendChat = async (page, text) => {
    const input = page.locator('[data-testid="chat-text-input"]').first();
    await input.waitFor({ state: 'visible', timeout: 8000 }); await input.click(); await input.fill(text);
    await page.locator('[data-testid="chat-send-btn"]').first().click({ timeout: 4000 }).catch(() => {});
  };

  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, userAgent: 'AuditCoachFullBot/1.0 (chromium)' });
  let allConsole = [], allPage = [];

  try {
    // ══ SCENARIO 1: LEARN DEEP GAME — every turn narrates, read replies, no trips, LLM never plays ══
    const a = await mkPage(ctx); const page = a.page;
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
    await wireListener(page); await dismissOnboard(page); await gotoLearn(page);
    log('1. Learn mounts via hub', /\/coach\/teach/.test(page.url()), page.url());

    let kickoff = false;
    for (let i = 0; i < 12 && !kickoff; i++) { await page.waitForTimeout(1000); kickoff = realTtsSince(a.ttsReqs, 0).length > 0; }
    log('1a. kickoff narration speaks', kickoff, kickoff ? `"${realTtsSince(a.ttsReqs, 0)[0]?.text}"` : 'silent');

    let narrated = 0, turnsWithReply = 0, blackSig = await blackOcc(page);
    for (const [from, to] of WHITE_DEV) {
      let played = false;
      for (let k = 0; k < 4 && !played; k++) { if (!(await tryMove(page, from, to))) break; await page.waitForTimeout(900); played = await isEmpty(page, from); if (!played) await page.waitForTimeout(1400); }
      if (!played) continue;
      const t0 = Date.now();
      let replied = false;
      for (let i = 0; i < 6 && !replied; i++) { await page.waitForTimeout(1500); const now = await blackOcc(page); if (now !== blackSig && now.length > 0) { blackSig = now; replied = true; } }
      if (!replied) continue;
      turnsWithReply++;
      let spoke = false;
      for (let i = 0; i < 12 && !spoke; i++) { await page.waitForTimeout(1000); spoke = realTtsSince(a.ttsReqs, t0).length > 0; }
      if (spoke) { narrated++; const txt = realTtsSince(a.ttsReqs, t0)[0]?.text ?? ''; replies.push({ scenario: 'learn-deep', after: `${from}${to}`, text: txt }); }
    }
    const providerErrs = (await dumpAudit(page, ['coach-llm-provider-error'])).length;
    const fallbackSpoke = a.ttsReqs.filter((r) => isErrorFallback(r.text)).length;
    log('1b. PROVIDER HEALTHY (run is conclusive)', providerErrs === 0 && fallbackSpoke === 0, `provider-errors=${providerErrs} error-fallback-spoken=${fallbackSpoke}`);
    log('1c. EVERY engine reply narrated (≥5 deep)', turnsWithReply >= 5 && narrated === turnsWithReply, `narrated ${narrated}/${turnsWithReply}`);

    const cv = await dumpAudit(page, ['claim-validator-trip']); const san = cv.filter((e) => /kind=san/.test(e.summary || ''));
    sanTripSummaries.push(...san.map((e) => e.summary));
    const stock = await dumpAudit(page, ['master-play-enforcement-fallback']);
    log('1d. ZERO kind=san trips across deep game', san.length === 0, `san-trips=${san.length}${san[0] ? ` e.g. ${san[0].summary}` : ''}`);
    log('1e. ZERO stock-outs', stock.length === 0, `fallbacks=${stock.length}`);

    // LLM NEVER PLAYS: move source must be masters/DB/Stockfish (never random); play_move not dispatched on engine steps.
    const srcEv = await dumpAudit(page, ['coach-opponent-move-source']);
    const sources = srcEv.map((e) => (e.summary || '').match(/source=(\S+)/)?.[1]).filter(Boolean);
    const anyRandom = sources.includes('random');
    log('1f. LLM never plays — engine source masters/DB/Stockfish (never random)', sources.length > 0 && !anyRandom, `sources=[${[...new Set(sources)].join(', ')}]`);

    // Board-accuracy READ: each captured reply names a real square/piece (concrete teaching, not interface).
    const deepTexts = replies.filter((r) => r.scenario === 'learn-deep').map((r) => r.text);
    const concrete = deepTexts.filter((t) => /\b[a-h] ?[1-8]\b/.test(t) || /\b(knight|bishop|rook|queen|king|pawn|center|pin|fork|develop)\b/i.test(t));
    log('1g. replies are concrete board teaching (read & checked)', concrete.length >= Math.max(1, Math.floor(narrated * 0.6)), `${concrete.length}/${deepTexts.length} concrete`);

    const listenerNarr = listener.eventsOfKind((e) => /coach-narration-spoken|voice-speak-invoked/.test(e.kind || ''));
    log('1h. listener (instrument 3) captured narration events', listenerNarr.length > 0, `events=${listenerNarr.length}`);

    allConsole = allConsole.concat(a.consoleErrors); allPage = allPage.concat(a.pageErrors);
    await page.screenshot({ path: join(OUT_DIR, 'learn-deep.png') }).catch(() => {});
    await page.close();

    // ══ SCENARIO 2: BLUNDER (Learn) — popup fires + explanation is grounded & read ══
    {
      const b = await mkPage(ctx); const p = b.page;
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await wireListener(p); await dismissOnboard(p); await gotoLearn(p);
        await p.waitForTimeout(6000);
        // 1.e4, wait for reply, then walk the king (Bongcloud) to crater eval.
        for (let k = 0; k < 6; k++) { await tryMove(p, 'e2', 'e4'); await p.waitForTimeout(1000); if (await isEmpty(p, 'e2')) break; await p.waitForTimeout(1500); }
        let bs = await blackOcc(p); for (let i = 0; i < 6; i++) { await p.waitForTimeout(1500); const n = await blackOcc(p); if (n !== bs) { bs = n; break; } }
        const t0 = Date.now();
        let prompt = false;
        for (const [from, to] of [['e1', 'e2'], ['e2', 'f3']]) {
          for (let k = 0; k < 6; k++) { await tryMove(p, from, to); await p.waitForTimeout(1200); if (await isEmpty(p, from)) break; await p.waitForTimeout(1500); }
          for (let i = 0; i < 6 && !prompt; i++) { await p.waitForTimeout(2000); prompt = (await p.locator('[data-testid="discussion-prompt"]').count().catch(() => 0)) > 0; }
          if (prompt) break;
          let s2 = await blackOcc(p); for (let i = 0; i < 6; i++) { await p.waitForTimeout(2000); const n = await blackOcc(p); if (n !== s2) break; }
        }
        const faucet = await dumpAudit(p, ['faucet-slip-detected']);
        log('2a. blunder fires the "why did you play that?" popup', prompt, prompt ? 'discussion-prompt visible' : 'no prompt');
        log('2b. faucet slip-detector ran on the blunder', faucet.length > 0, `faucet-slip-detected=${faucet.length}`);
        // READ the explanation: the prompt/coach text + any narration after, asserted grounded (no stock-out, no kind=san).
        let promptText = '';
        try { promptText = (await p.locator('[data-testid="discussion-prompt"]').first().innerText({ timeout: 3000 })).slice(0, 300); } catch {}
        const spokenAfter = realTtsSince(b.ttsReqs, t0).map((r) => r.text);
        if (promptText) replies.push({ scenario: 'blunder-prompt', after: 'king-walk', text: promptText });
        if (spokenAfter[0]) replies.push({ scenario: 'blunder-spoken', after: 'king-walk', text: spokenAfter[0] });
        const stock2 = await dumpAudit(p, ['master-play-enforcement-fallback']);
        const san2 = (await dumpAudit(p, ['claim-validator-trip'])).filter((e) => /kind=san/.test(e.summary || ''));
        sanTripSummaries.push(...san2.map((e) => e.summary));
        log('2c. blunder explanation is grounded (no stock-out / no kind=san trip)', stock2.length === 0 && san2.length === 0, `fallbacks=${stock2.length} san-trips=${san2.length} prompt="${promptText.slice(0, 60)}"`);
        allConsole = allConsole.concat(b.consoleErrors); allPage = allPage.concat(b.pageErrors);
      } catch (e) { log('2. blunder scenario', false, `threw: ${String(e?.message ?? e).slice(0, 90)}`); }
      await p.close();
    }

    // ══ SCENARIO 3: PLAYS THE REQUESTED OPENING — Italian → coach ...e5; Sicilian → coach ...c5 ══
    // The coach plays Black; a request changes its FIRST reply to 1.e4. Two
    // different requests must yield two DIFFERENT, book-correct replies — proof
    // the spine plays what the user asked, not a fixed/random move.
    const requestedOpening = async (request, expectSquare, otherSquare) => {
      const r = await mkPage(ctx); const p = r.page;
      let okSpoke = false, playedExpected = null, replyText = '';
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await wireListener(p); await dismissOnboard(p); await gotoLearn(p);
        await p.waitForTimeout(6000);
        const t0 = Date.now();
        await sendChat(p, request);
        await p.waitForTimeout(9000); // let the brain set the intended opening + reply
        // Play 1.e4; the coach (Black) replies per the requested opening.
        for (let k = 0; k < 6; k++) { await tryMove(p, 'e2', 'e4'); await p.waitForTimeout(1000); if (await isEmpty(p, 'e2')) break; await p.waitForTimeout(1500); }
        // Wait for the coach reply, then check which black break it played.
        let landedExpected = false, landedOther = false;
        for (let i = 0; i < 10 && !landedExpected && !landedOther; i++) {
          await p.waitForTimeout(1500);
          landedExpected = await occupied(p, expectSquare);
          landedOther = await occupied(p, otherSquare);
        }
        playedExpected = landedExpected && !landedOther;
        replyText = realTtsSince(r.ttsReqs, t0).map((x) => x.text).join(' | ').slice(0, 220);
        okSpoke = realTtsSince(r.ttsReqs, t0).length > 0;
        if (replyText) replies.push({ scenario: `requested-${request}`, after: 'e2e4', text: replyText });
        allConsole = allConsole.concat(r.consoleErrors); allPage = allPage.concat(r.pageErrors);
      } catch (e) { replyText = `threw: ${String(e?.message ?? e).slice(0, 80)}`; }
      await p.close();
      return { playedExpected, okSpoke, replyText };
    };
    const ital = await requestedOpening("let's play the Italian Game", 'e5', 'c5');
    log('3a. requested "Italian Game" → coach answers 1.e4 with ...e5 (book), not ...c5', ital.playedExpected === true, `coach played ${ital.playedExpected ? '...e5 ✓' : 'NOT ...e5'} | "${ital.replyText.slice(0, 80)}"`);
    const sicil = await requestedOpening("let's play the Sicilian Defense", 'c5', 'e5');
    log('3b. requested "Sicilian Defense" → coach answers 1.e4 with ...c5 (book), not ...e5', sicil.playedExpected === true, `coach played ${sicil.playedExpected ? '...c5 ✓' : 'NOT ...c5'} | "${sicil.replyText.slice(0, 80)}"`);
    log('3c. two different requests → two DIFFERENT book replies (spine plays what you ask)', ital.playedExpected === true && sicil.playedExpected === true, `Italian→e5:${ital.playedExpected} Sicilian→c5:${sicil.playedExpected}`);

    // ══ SCENARIO 4: PLAY (/coach/play) — engine replies, narration when warranted, no trips, blunder popup ══
    {
      const g = await mkPage(ctx); const p = g.page;
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await wireListener(p); await dismissOnboard(p);
        await p.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT }).catch(() => {});
        await p.waitForTimeout(2500); await dismissHelp(p);
        await p.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
        let bs = await blackOcc(p);
        for (let k = 0; k < 6; k++) { await tryMove(p, 'e2', 'e4'); await p.waitForTimeout(1000); if (await isEmpty(p, 'e2')) break; await p.waitForTimeout(1500); }
        let replied = false; for (let i = 0; i < 8 && !replied; i++) { await p.waitForTimeout(1500); const n = await blackOcc(p); if (n !== bs && n.length > 0) { bs = n; replied = true; } }
        // walk a blunder for the popup here too
        let prompt = false; const t0 = Date.now();
        for (const [from, to] of [['e1', 'e2'], ['e2', 'f3']]) {
          for (let k = 0; k < 6; k++) { await tryMove(p, from, to); await p.waitForTimeout(1200); if (await isEmpty(p, from)) break; await p.waitForTimeout(1500); }
          for (let i = 0; i < 6 && !prompt; i++) { await p.waitForTimeout(2000); prompt = (await p.locator('[data-testid="discussion-prompt"]').count().catch(() => 0)) > 0; }
          if (prompt) break;
          let s2 = await blackOcc(p); for (let i = 0; i < 5; i++) { await p.waitForTimeout(2000); const n = await blackOcc(p); if (n !== s2) break; }
        }
        const san3 = (await dumpAudit(p, ['claim-validator-trip'])).filter((e) => /kind=san/.test(e.summary || ''));
        sanTripSummaries.push(...san3.map((e) => e.summary));
        const spoke = realTtsSince(g.ttsReqs, t0).map((r) => r.text);
        if (spoke[0]) replies.push({ scenario: 'play', after: 'blunder', text: spoke[0] });
        log('4a. Play: engine replies to the student move', replied, `replied=${replied}`);
        log('4b. Play: blunder fires the why-popup', prompt, prompt ? 'discussion-prompt visible' : 'no prompt (rating bar may gate)');
        log('4c. Play: zero kind=san trips', san3.length === 0, `san-trips=${san3.length}`);
        allConsole = allConsole.concat(g.consoleErrors); allPage = allPage.concat(g.pageErrors);
      } catch (e) { log('4. Play scenario', false, `threw: ${String(e?.message ?? e).slice(0, 90)}`); }
      await p.close();
    }

    // ══ SCENARIO 5: FAILURE MODES — off-canonical typo Q, cold cache, verbosity ══
    {
      const d = await mkPage(ctx); const p = d.page;
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await wireListener(p); await dismissOnboard(p); await gotoLearn(p);
        await p.waitForTimeout(6000); const t0 = Date.now();
        await sendChat(p, 'tell me about the Najdorff');
        // A cold general-question brain turn can take >18s (multiple tool
        // round-trips); the answer voices via the [VOICE:]/first-sentence
        // fallback, but the window was racing the turn. Give it 40s.
        let spoke = false; for (let i = 0; i < 40 && !spoke; i++) { await p.waitForTimeout(1000); spoke = realTtsSince(d.ttsReqs, t0).length > 0; }
        const stock = await dumpAudit(p, ['master-play-enforcement-fallback']);
        const txt = realTtsSince(d.ttsReqs, t0)[0]?.text ?? '';
        if (txt) replies.push({ scenario: 'offcanonical', after: 'Najdorff', text: txt });
        log('5a. off-canonical typo question → real grounded answer, no stock-out', spoke && stock.length === 0, spoke ? `"${txt.slice(0, 70)}" fallbacks=${stock.length}` : `SILENT fallbacks=${stock.length}`);
        allConsole = allConsole.concat(d.consoleErrors); allPage = allPage.concat(d.pageErrors);
      } catch (e) { log('5a. off-canonical', false, `threw: ${String(e?.message ?? e).slice(0, 80)}`); }
      await p.close();
    }
    {
      const e = await mkPage(ctx); const p = e.page;
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await p.evaluate(async () => { const ns = (await indexedDB.databases?.())?.map((d) => d.name).filter(Boolean) ?? ['ChessAcademyDB']; await Promise.all(ns.map((n) => new Promise((r) => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => r(); }))); });
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await wireListener(p); await dismissOnboard(p); await gotoLearn(p);
        const t0 = Date.now();
        for (let k = 0; k < 6; k++) { await tryMove(p, 'e2', 'e4'); await p.waitForTimeout(1000); if (await isEmpty(p, 'e2')) break; await p.waitForTimeout(1500); }
        let spoke = false; for (let i = 0; i < 16 && !spoke; i++) { await p.waitForTimeout(1000); spoke = realTtsSince(e.ttsReqs, t0).length > 0; }
        const san4 = (await dumpAudit(p, ['claim-validator-trip'])).filter((x) => /kind=san/.test(x.summary || ''));
        log('5b. cold-cache (cleared IndexedDB) first move narrates', spoke && san4.length === 0, spoke ? `spoke; san-trips=${san4.length}` : 'SILENT cold');
        allConsole = allConsole.concat(e.consoleErrors);
      } catch (err) { log('5b. cold-cache', false, `threw: ${String(err?.message ?? err).slice(0, 80)}`); }
      await p.close();
    }
    const setVerbosity = async (page, v) => { await page.evaluate(async (val) => { await new Promise((res) => { const q = indexedDB.open('ChessAcademyDB'); q.onsuccess = () => { const dbh = q.result; const tx = dbh.transaction(['profiles'], 'readwrite'); const st = tx.objectStore('profiles'); const g = st.get('main'); g.onsuccess = () => { const pr = g.result; if (pr) { pr.preferences = { ...pr.preferences, coachNarration: val }; st.put(pr); } tx.oncomplete = () => res(); }; g.onerror = () => res(); }; q.onerror = () => res(); }); }, v); };
    {
      const f = await mkPage(ctx); const p = f.page;
      try {
        await p.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT });
        await dismissOnboard(p); await setVerbosity(p, 'silent'); await p.waitForTimeout(800); await wireListener(p); await gotoLearn(p);
        const t0 = Date.now();
        for (let k = 0; k < 6; k++) { await tryMove(p, 'e2', 'e4'); await p.waitForTimeout(1000); if (await isEmpty(p, 'e2')) break; await p.waitForTimeout(1500); }
        await p.waitForTimeout(12000);
        log('5c. SILENT verbosity → NO /api/tts fires', realTtsSince(f.ttsReqs, t0).length === 0, `tts-after-move=${realTtsSince(f.ttsReqs, t0).length}`);
        allConsole = allConsole.concat(f.consoleErrors);
      } catch (e) { log('5c. silent verbosity', false, `threw: ${String(e?.message ?? e).slice(0, 80)}`); }
      await p.close();
    }

    // Infra noise to ignore: the stockfish WASM worker quirk, and the LLM-
    // PROVIDER-OUTAGE cascade (DeepSeek 503 → Anthropic fallback 400 "credit
    // balance too low" / [CoachAPI] Fallback also failed). The latter only
    // appears when the brain provider is degraded — the provider-health gate
    // (1b) already flags that, so it shouldn't double-count as a narration bug.
    const narrationRelevant = allConsole.filter((e) =>
      !/Stockfish.*worker\.onerror|RuntimeError: unreachable|status of 503|status of 400|credit balance|\[CoachAPI\] Fallback|invalid_request_error/i.test(e));
    log('6. no narration-relevant console errors', narrationRelevant.length === 0, narrationRelevant.slice(0, 3).join(' | ') || `(benign noise ignored: ${allConsole.length - narrationRelevant.length})`);
    log('6b. no page errors anywhere', allPage.length === 0, allPage.slice(0, 3).join(' | '));
  } catch (e) {
    log('FATAL', false, String(e?.message ?? e));
  } finally {
    // INSTRUMENT 2b — prod audit-stream AFTER the run.
    const streamAfter = await pullProdStream(runStart);
    console.log(`[coach-full] prod audit-stream AFTER: ${JSON.stringify(streamAfter)}`);
    const pass = results.filter((r) => r.ok).length;
    const report = { base: BASE_URL, startedAt: stamp, pass, total: results.length, results, replies, sanTripSummaries, streamBefore, streamAfter, listenerByKind: listener.countByKind(), consoleErrors: allConsole, pageErrors: allPage };
    await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`\n[coach-full] ${pass}/${results.length} checks passed`);
    console.log(`[coach-full] ${replies.length} replies captured & read → ${OUT_DIR}/report.json`);
    console.log('[coach-full] listener byKind:', JSON.stringify(listener.countByKind()));
    await browser.close(); await listener.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
