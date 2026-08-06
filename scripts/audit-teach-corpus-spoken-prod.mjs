// THE AUDIBLE PROOF (David 2026-07-30): "teach me <X>" on LIVE prod must SPEAK
// corpus teaching, deterministically spliced by openingGenerator at gen time.
//
// v1 of this probe hardcoded note fragments and failed for two reasons worth
// remembering: (a) at shared prefixes (e4 e5 Nf3 Nc6) MANY notes collide and
// noteAtPosition speaks bucket[0], not the note you guessed; (b) marks sitting
// past ply ~10 aren't reached inside a probe window — the walkthrough is
// voice-paced. So: marks are computed HERE from the shipped corpus (every
// positioned note of the opening, early plies preferred), and ANY hit proves
// the splice. Default opening: Latvian Gambit — its f5 prefix is unique from
// ply 4, so no bucket collisions.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_OPENING="latvian gambit"] [AUDIT_CORPUS=src/data/chessbrah-teachings.json] \
//   node scripts/audit-teach-corpus-spoken-prod.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// Default MUST be a genuine TIER-2 opening (notes, no bake). The Latvian —
// v2's default — is TIER-1 BAKED (walkthrough-narrations.json): its verified
// prose takes NO runtime splice by locked doctrine, so its marks can never be
// spoken and the audit red was a false alarm (2026-08-06). The Englund has 18
// shallow positioned notes, no bake, and a prefix unique from ply 2.
const ASK = process.env.AUDIT_OPENING || 'englund gambit';
const RUN_ID = `spoken-${Date.now().toString(36)}`;

// FAIL FAST on a Tier-1 baked opening — testing the splice against baked
// prose is the wrong-opening mistake the tiers doctrine (CLAUDE.md) names.
const bakedKeys = Object.keys(JSON.parse(await readFile('src/data/walkthrough-narrations.json', 'utf8')).narrations ?? {});
const askKey = ASK.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
if (bakedKeys.some((k) => k.includes(askKey) || askKey.includes(k))) {
  console.log(`✗ WRONG OPENING: "${ASK}" is TIER-1 BAKED — baked prose takes no runtime splice by design. Pick a Tier-2 opening (positioned notes, no bake).`);
  process.exit(1);
}

// Marks: distinctive mid-sentence fragments (≥6 words) from every positioned
// note of the target opening, shallow lines first. Lowercased for matching.
// Which shipped corpus the marks come from. The coach reads both — the second
// creator's corpus is the gap tier for openings the primary never covers — so
// proving THOSE openings speak means computing marks from that file.
const CORPUS_PATH = process.env.AUDIT_CORPUS || 'src/data/danya-teachings.json';
const corpus = JSON.parse(await readFile(CORPUS_PATH, 'utf8'));
const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
const askNorm = norm(ASK).replace(/[^a-z0-9 ]/g, '');
const notes = corpus.notes
  .filter((n) => n.lineSan.length > 0 && norm(n.opening ?? '').replace(/[^a-z0-9 ]/g, '').includes(askNorm))
  .sort((a, b) => a.lineSan.length - b.lineSan.length);
const marks = [];
for (const n of notes) {
  for (const field of [n.explains, n.teaches]) {
    const words = norm(field).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').split(' ');
    if (words.length >= 8) marks.push(words.slice(1, 8).join(' '));
  }
}
if (marks.length === 0) {
  console.log(`✗ FAIL: no positioned corpus notes for "${ASK}" — nothing to prove`);
  process.exit(1);
}
console.log(`[probe] "${ASK}" — ${notes.length} positioned notes, ${marks.length} marks (shallowest line: ${notes[0].lineSan.join(' ')})`);

const listener = await startAuditListener();
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
// MUTED + run-stamped (David 2026-08-06): the spoken marks are read back from
// PostHog (coach_narration_spoken.narration_text carries the FULL line, incl.
// on the muted tier), keyed by audit_run_id — the local listener cannot attach
// on https prod (mixed content) and /api/tts must never be synthesised just to
// observe text. The local ttsTexts + listener legs still work on localhost.
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(RUN_ID));
const p = await ctx.newPage();
const ttsTexts = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    // /api/tts is a GET with the spoken text in the query string.
    try { ttsTexts.push(new URL(r.url()).searchParams.get('text') ?? ''); } catch { /* malformed */ }
  }
});

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

const clean = (t) => norm(t).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
let seenOnScreen = null;
let seenSpoken = null;
let detail = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Listener attach ONLY on http (localhost): an https prod page posting to
  // http://127.0.0.1 is MIXED CONTENT — the browser silently drops every
  // event (that's the listener=0 all day, and it hid the llm-error naming a
  // failed generation). On https the events go to the prod stream; the
  // post-run pull below surfaces them.
  if (BASE.startsWith('http://')) {
    await p.evaluate((url) => localStorage.setItem('auditStreamUrl', url), listener.url).catch(() => undefined);
    await p.reload({ waitUntil: 'domcontentloaded' });
  }
  await dismiss(); await dismiss();

  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box.press('Enter');

  const started = Date.now();
  while (Date.now() - started < 420000 && !(seenOnScreen && seenSpoken)) {
    await p.waitForTimeout(4000);
    const body = clean(await p.locator('body').innerText().catch(() => ''));
    for (const mark of marks) if (!seenOnScreen && body.includes(mark)) seenOnScreen = mark;
    const spokenPool = clean([
      ...ttsTexts,
      ...listener.getCapturedEvents().map((e) => `${e.summary ?? ''} ${e.details ?? ''}`),
    ].join(' '));
    for (const mark of marks) if (!seenSpoken && spokenPool.includes(mark)) seenSpoken = mark;
    try {
      const skip = p.locator('[data-testid="walkthrough-skip"], button:has-text("Continue")').first();
      if (await skip.isVisible({ timeout: 500 })) await skip.click({ force: true });
    } catch { /* nothing to nudge */ }
  }
  detail = `onScreen=${seenOnScreen ? 'YES' : 'NO'} spoken=${seenSpoken ? 'YES' : 'NO'} tts=${ttsTexts.length} listener=${listener.getCapturedEvents().length} (${Math.round((Date.now() - started) / 1000)}s)`;
} catch (e) {
  detail = `ERROR ${String(e).slice(0, 140)}`;
}
const finalBody = await p.locator('body').innerText().catch(() => '(unreadable)');
await writeFile('/tmp/teach-probe-tts.json', JSON.stringify({ ask: ASK, runId: RUN_ID, marks, ttsTexts, listenerEvents: listener.getCapturedEvents().length, finalBody: finalBody.slice(0, 8000) }, null, 1)).catch(() => undefined);
await b.close();
await listener.stop().catch(() => undefined);

// The claim under test is SPOKEN corpus teaching. The tts request text IS the
// narration text routed to voice, so spoken evidence subsumes display; the
// onScreen flag stays informational (a 4s poll can miss a ply's window).
// Post-run prod-stream pull — generation-side events the sandboxed page
// can't relay locally (llm-error names a failed gen; reword/splice show the
// voice pipeline ran; cache-invalidated shows a fallback tree was refused).
try {
  const since = Date.now() - 15 * 60 * 1000;
  const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': process.env.AUDIT_STREAM_SECRET ?? '' } });
  if (res.ok) {
    const events = (await res.json()).entries ?? [];
    const rel = events.filter((e) => /llm-error|reword|danyaSplice|cache-invalidated/i.test(`${e.kind} ${e.source}`));
    for (const e of rel.slice(-6)) console.log(`  [prod-audit] ${e.kind} | ${e.source} | ${(e.summary ?? '').slice(0, 110)}`);
  }
} catch { /* stream optional */ }

// Verdict. On localhost the local instruments carry it. On https they are
// structurally blind (muted /api/tts + mixed-content listener), so the local
// leg can NEVER pass there — the script's job on https is the DRIVE; the
// spoken verdict comes from the PostHog read-back by audit_run_id, which the
// SESSION runs via the PostHog MCP (scripts never touch the deprecated phx_
// key — locked rule). Exit 2 = drive complete, verdict pending that query.
// A clean https drive is NOT reported as PASS — mushy green is the failure
// mode this exit code exists to prevent.
const isHttps = BASE.startsWith('https://');
if (seenSpoken) {
  console.log(`✓ PASS: teach-me-${ASK} speaks the corpus — ${detail}`);
  console.log(`  spoken mark: "${seenSpoken}"`);
  process.exit(0);
}
if (isHttps && !detail.startsWith('ERROR')) {
  console.log(`◌ PENDING: drive complete on https — verdict lives in PostHog — ${detail}`);
  console.log(`  marks (${marks.length}) saved to /tmp/teach-probe-tts.json; match them against:`);
  console.log(`  audit_run_id=${RUN_ID} (project 390808, ~90s ingest lag):`);
  console.log(`    SELECT timestamp, properties.narration_text FROM events WHERE event='coach_narration_spoken' AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);
  process.exit(2);
}
console.log(`✗ FAIL: teach-me-${ASK} speaks the corpus — ${detail}`);
console.log('  tts transcript → /tmp/teach-probe-tts.json');
process.exit(1);
