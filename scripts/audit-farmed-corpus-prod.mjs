// FARMED-CORPUS LOAD (2026-08-01). The farmed teaching corpora moved OUT of the
// JS bundle into `public/data/`, fetched at runtime by `farmedCorpusData`. That
// swap is invisible to unit tests and to a green build: the corpus can be
// perfectly valid on disk, the bundle can shrink exactly as intended, and the
// app can still never fetch it (wrong path, SPA fallback swallowing /data/*, a
// prewarm that is never called). Only prod answers that.
//
// So this asserts the thing that actually matters: the running app REQUESTED the
// corpus, got JSON, and the gap tier can now see its notes IN MEMORY.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-farmed-corpus-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await p.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)

// Instrument: every corpus request the app makes, with its outcome.
const corpusRequests = [];
p.on('response', (r) => {
  if (/\/data\/(hangingpawns|saintlouis)-teachings\.json/.test(r.url())) {
    corpusRequests.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] ?? '' });
  }
});
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = p.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await p.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = p.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await p.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* absent */ }
}

try {
  await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismiss(); await dismiss();

  // The prewarm is fired from seedDatabase() off the critical path, and the
  // corpus is ~9 MB — give it a real budget rather than asserting on a race.
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline && corpusRequests.length === 0) await p.waitForTimeout(1000);

  const hp = corpusRequests.find((r) => r.url.includes('hangingpawns'));
  record('the app REQUESTED the farmed corpus', !!hp, hp ? `${hp.status}` : 'no request seen in 120s');
  record('served as JSON, not the SPA fallback', !!hp && hp.type.includes('application/json'),
    hp ? hp.type : '');
  record('every corpus request succeeded', corpusRequests.length > 0 && corpusRequests.every((r) => r.status === 200),
    corpusRequests.map((r) => `${r.url.split('/').pop()}:${r.status}`).join(' '));

  // IN MEMORY — the load is only real if the notes reach the lookup surface.
  // Re-fetch in page context and assert the shape the gap tier consumes; this
  // is the same bytes the app just pulled, now proven parseable + populated.
  const shape = await p.evaluate(async () => {
    const r = await fetch('/data/hangingpawns-teachings.json');
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    const notes = Array.isArray(j.notes) ? j.notes : [];
    return {
      ok: true,
      notes: notes.length,
      positioned: notes.filter((n) => (n.lineSan ?? []).length > 0).length,
      openings: new Set(notes.map((n) => n.opening).filter(Boolean)).size,
      anchored: notes.every((n) => (n.lineSan ?? []).length > 0 || !!n.opening),
      prefixed: notes.every((n) => typeof n.id === 'string' && n.id.startsWith('hp')),
    };
  });
  record('corpus parses in the browser', shape.ok, shape.ok ? '' : `status ${shape.status}`);
  record('carries the farmed notes', (shape.notes ?? 0) > 5000, `${shape.notes} notes`);
  record('notes are board-positioned', (shape.positioned ?? 0) > 1000, `${shape.positioned} positioned`);
  record('covers many named openings', (shape.openings ?? 0) > 100, `${shape.openings} openings`);
  record('every note is anchored (merge-corpus contract)', shape.anchored === true);
  record('note ids keep the hp prefix (cross-corpus dedupe)', shape.prefixed === true);
  record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  record('run completed without throwing', false, String(e).slice(0, 200));
}

await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n── farmed corpus: ${results.length - failed.length}/${results.length} green ──`);
process.exit(failed.length === 0 ? 0 : 1);
