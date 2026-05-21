#!/usr/bin/env node
/**
 * audit-faucet-live — FULL-CHAIN live proof of the Discussion-Practice faucet
 * on /coach/play (David 2026-05-21: "FIND A WORK-AROUND"). api.deepseek.com is
 * network-blocked from the sandbox (host_not_allowed), so the brain can't be
 * reached for real. The work-around: intercept the LLM HTTP call with Playwright
 * `page.route` and fulfill it with a canned classification — the brain "answers"
 * locally without ever leaving the box. Everything else is the REAL app:
 * Stockfish detects the slip, the prompt fires, the answer routes through the
 * real captureMisconception → logMisconception → Dexie bucket → audit events.
 *
 * Chain proven end-to-end, locally:
 *   blunder → faucet-slip-detected → "why?" prompt → answer →
 *   (intercepted) classify → misconception-captured → bucket row → mirror shows it
 *
 * The dev server MUST be started with a (dummy) VITE_DEEPSEEK_API_KEY so the app
 * attempts the fetch we intercept:
 *   VITE_DEEPSEEK_API_KEY=sk-mock npm run dev
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/.../chrome \
 *   node scripts/audit-faucet-live.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
// White to move, Q on e2. Qe6?? hangs to ...dxe6 (the d7 pawn). Stockfish sees
// the queen loss immediately, so the post-move eval craters → a clean blunder.
const BLUNDER_FEN = '4k3/3p4/8/8/8/8/4Q3/4K3 w - - 0 1';
const MOCK_TAG = 'overvalued-attack';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`[faucet-live] ${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
}
function vis(locator, ms = 20_000) {
  return locator.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);
}

// Read the local Dexie audit log; return entries of a given kind.
function readAudit(page, kind) {
  return page.evaluate((k) => new Promise((res) => {
    const o = indexedDB.open('ChessAcademyDB');
    o.onsuccess = () => {
      try {
        const tx = o.result.transaction('meta', 'readonly');
        const r = tx.objectStore('meta').get('app-audit-log.v1');
        r.onsuccess = () => {
          try {
            const rows = JSON.parse(r.result?.value ?? '[]');
            res(Array.isArray(rows) ? rows.filter((e) => e.kind === k) : []);
          } catch { res([]); }
        };
        r.onerror = () => res([]);
      } catch { res([]); }
    };
    o.onerror = () => res([]);
  }), kind);
}

function readBucket(page) {
  return page.evaluate(() => new Promise((res) => {
    const o = indexedDB.open('ChessAcademyDB');
    o.onsuccess = () => {
      try {
        const tx = o.result.transaction('misconceptionTags', 'readonly');
        const r = tx.objectStore('misconceptionTags').getAll();
        r.onsuccess = () => res((r.result ?? []).map((x) => ({ tag: x.tag, source: x.source, openingName: x.openingName })));
        r.onerror = () => res([]);
      } catch { res([]); }
    };
    o.onerror = () => res([]);
  }));
}

async function clickSquare(page, sq) {
  await page.locator(`[data-square="${sq}"]`).first().click({ timeout: 5000 }).catch(() => {});
}

async function pollUntil(fn, ms = 18_000, step = 750) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, step));
  }
  return null;
}

async function main() {
  const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (await resolveChromiumExecutable());
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // ── THE WORK-AROUND: intercept ONLY the classifier LLM call ──────────────
  // The blocked host (host_not_allowed) is the same wall the live app already
  // tolerates: the coach's mount-time intro / move-selector LLM calls just
  // fail and the surface degrades gracefully (board still renders). We must
  // NOT feed those a fake classification — that crashes their tool-use parse.
  // So we match the CLASSIFIER request by its body signature ("misconception"
  // taxonomy / "Classify this move") and fulfill only that with the canned
  // tag; every other LLM call is aborted, exactly as the network block does.
  // NB: must be page-level string globs — a context.route() with a function
  // predicate intercepts EVERY request and breaks the dev server's module/HMR
  // loads (blank page). Narrow globs touch only the LLM hosts.
  let classifierHits = 0;
  const llmHandler = async (route) => {
    const body = route.request().postData() ?? '';
    const isClassifier = /misconception|Classify this move/i.test(body);
    if (!isClassifier) { await route.abort('failed').catch(() => {}); return; }
    classifierHits += 1;
    const content = JSON.stringify({
      tag: MOCK_TAG,
      coachNote: 'The queen raid gave away the center — finish developing before attacking.',
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'mock', object: 'chat.completion', created: 0, model: 'deepseek-chat',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });
  };
  await page.route('**://api.deepseek.com/**', llmHandler);
  await page.route('**://api.anthropic.com/**', llmHandler);

  try {
    const url = `${BASE_URL}/coach/play?side=white&opening=${encodeURIComponent('Ruy Lopez')}&fen=${encodeURIComponent(BLUNDER_FEN)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.locator('[data-testid="chess-board-container"]').waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
    const boardUp = await pollUntil(() => page.locator('[data-square="e2"]').count().then((n) => n > 0), 20_000);
    record('board mounts on /coach/play with custom blunder FEN', !!boardUp);
    if (!boardUp) throw new Error('board never mounted');

    // Blunder: Qe2→e6, hanging the queen. Click-to-move (source then dest).
    await clickSquare(page, 'e2');
    await clickSquare(page, 'e6');

    // 1) DETECTION — Stockfish eval-drop fires the faucet + the prompt.
    const promptUp = await vis(page.locator('[data-testid="discussion-prompt"]'), 25_000);
    record('faucet raises the "why did you play that?" prompt (Stockfish detection)', promptUp);
    const slip = await pollUntil(async () => {
      const evs = await readAudit(page, 'faucet-slip-detected');
      return evs.length ? evs[evs.length - 1] : null;
    });
    record('faucet-slip-detected audit event fired', !!slip, slip ? slip.summary : 'none');

    // 2) ANSWER — type a reason + send → real captureMisconception runs.
    if (promptUp) {
      await page.locator('[data-testid="discussion-input"]').fill('I wanted to attack the king fast');
      await page.locator('[data-testid="discussion-send"]').click().catch(() => {});
    }

    // 3) CLASSIFY (intercepted) → BUCKET WRITE → misconception-captured.
    const captured = await pollUntil(async () => {
      const evs = await readAudit(page, 'misconception-captured');
      return evs.length ? evs[evs.length - 1] : null;
    }, 25_000);
    record('classifier LLM call intercepted locally (work-around for blocked host)', classifierHits > 0, `${classifierHits} call(s)`);
    record('misconception-captured audit event fired (classify → bucket write)', !!captured, captured ? captured.summary : 'none');

    const bucket = await readBucket(page);
    const hasTag = bucket.some((b) => b.tag === MOCK_TAG);
    record('bucket row written with the classified tag', hasTag, JSON.stringify(bucket.slice(0, 3)));

    // 4) MIRROR — the tag surfaces in /weaknesses "Thinking Errors".
    await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="tab-misconceptions"]').click({ timeout: 15_000 }).catch(() => {});
    const rowUp = await vis(page.locator(`[data-testid="misconception-row-${MOCK_TAG}"]`), 20_000);
    record('MIRROR: the live-captured tag shows in Thinking Errors', rowUp);
  } catch (e) {
    record('audit-run', false, String(e));
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`[faucet-live] DONE — ${passed}/${results.length} checks passed`);
  console.log(`[faucet-live] pageerrors=${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0] : ''}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main();
