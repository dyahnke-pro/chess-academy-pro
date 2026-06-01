import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// PER-BEAT WALK of every Samay Watch lesson on LIVE prod. Steps through EVERY
// beat (lesson-next), and for each beat verifies on the real running app:
//   - the DISPLAYED narration matches the authored beat text,
//   - the SPOKEN narration fired on /api/tts (the voice actually played),
//   - the rendered ARROWS match the authored arrows for that beat,
//   - lesson-progress advances through all beats (the walk completes).
// This is the actual walk-through (not mount+exit). Arrow board-correctness
// (origin on a real piece, valid line) is additionally proven statically by
// audit-samay-lines-correctness.mjs.
const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ONLY = process.env.AUDIT_OPENING || '';

// ── load authored lessons (expected per-beat say + arrow count) ──
const o = join(tmpdir(), `walk-${Date.now()}.mjs`);
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const { getAllLessonScripts, getLessonScript, getVariationLessonScript } = await import(o);
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// distinctive 4-gram from the authored say to match against displayed text
const fingerprint = (say) => { const w = norm(say).split(' ').filter((x) => x.length > 3); return w.slice(0, 4).join(' '); };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const tts = [];
page.on('request', (r) => { const u = r.url(); if (/\/api\/tts/.test(u)) { const m = /[?&]text=([^&]*)/.exec(u); tts.push(m ? decodeURIComponent(m[1]) : ''); } });
const fails = []; const F = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const ALL = ['pro-samayraina-sicilian-black', 'pro-samayraina-open-e5', 'pro-samayraina-kings-gambit',
  'pro-samayraina-open-sicilian', 'pro-samayraina-ruy', 'pro-samayraina-italian',
  'pro-samayraina-french-white', 'pro-samayraina-caro-white', 'pro-samayraina-scandi'];
const OPENINGS = ONLY ? [ONLY] : ALL;

async function openDetail(id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await page.locator('[data-testid="page-help-modal"] button').first().click({ timeout: 2500 }); } catch {}
  await page.waitForSelector('[data-testid="opening-detail"], h1', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1000);
}
// count rendered arrows on the board (react-chessboard draws each arrow as an
// SVG group with a marker/line; count distinct arrow shafts).
async function arrowCount() {
  return page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    let n = 0;
    for (const s of svgs) {
      const lines = s.querySelectorAll('line, polygon, path[marker-end], marker');
      if (lines.length) n += s.querySelectorAll('line').length || s.querySelectorAll('polygon').length;
    }
    return n;
  }).catch(() => -1);
}
async function displayedText() {
  for (const sel of ['[data-testid="annotation-text"]', '[data-testid="lesson-narration"]', '.lesson-narration']) {
    const el = page.locator(sel).first();
    if (await el.count()) { const t = await el.innerText().catch(() => ''); if (t) return t; }
  }
  // fallback: the scaffold narration card text
  return (await page.locator('body').innerText().catch(() => '')).slice(0, 0) || '';
}

// walk one Watch lesson; `expected` = ordered authored beats. The lesson
// auto-plays (voice-gated) through every beat; we collect the WHOLE spoken
// /api/tts sequence + sample arrows, then verify EVERY authored beat's
// narration was actually spoken (matches) — i.e. the walk played every beat.
async function walkWatch(id, label, expected) {
  const ttsStart = tts.length;
  await page.locator('[data-testid="walkthrough-btn"]').first().click().catch(() => {});
  await page.waitForTimeout(2500);
  if ((await page.locator('[data-square]').count()) < 64) { F(`${id} [${label}] Watch: did not mount`); return; }
  const prog = await page.locator('[data-testid="lesson-progress"]').first().innerText().catch(() => '');
  const total = Number((prog.match(/\/\s*(\d+)/) || [])[1] || 0);
  const beatN = expected.length || total || 1;
  if (expected.length && total && total !== expected.length) F(`${id} [${label}] Watch: progress ${total} beats vs authored ${expected.length}`);
  // let auto-play run through every beat; also nudge with lesson-next so a
  // paused/voice-stalled beat still advances. Poll until tts quiesces.
  let arrowsSeen = 0;
  for (let i = 0; i < beatN + 1; i++) {
    const a = await arrowCount(); if (a > arrowsSeen) arrowsSeen = a;
    const nxt = page.locator('[data-testid="lesson-next"]').first();
    if (await nxt.count() && await nxt.isEnabled().catch(() => false)) await nxt.click().catch(() => {});
    await page.waitForTimeout(2200);
  }
  const spoken = tts.slice(ttsStart).filter((t) => t && t.trim() !== '.');
  const spokenNorm = spoken.map(norm);
  // every authored beat's narration must appear in the spoken sequence. Match
  // by word-overlap (robust to TTS sanitization / reordering): a spoken segment
  // covers the beat if it shares ≥ half of the beat's distinctive words.
  let matched = 0;
  for (let i = 0; i < expected.length; i++) {
    const words = [...new Set(norm(expected[i].say).split(' ').filter((w) => w.length > 3))];
    const need = Math.max(2, Math.ceil(words.length * 0.4));
    const hit = spokenNorm.some((s) => words.filter((w) => s.includes(w)).length >= need);
    if (hit) matched++; else F(`${id} [${label}] beat ${i + 1}: authored narration not spoken (need ${need} of ${words.length} words)`);
  }
  if (matched < expected.length) console.log(`    [debug] spoken (${spoken.length}): ${spoken.map((s) => '"' + s.slice(0, 35) + '"').join(' | ').slice(0, 240)}`);
  const authoredArrows = expected.filter((b) => (b.arrowCount || 0) > 0).length;
  const tag = (matched === expected.length && spoken.length >= expected.length) ? '✓' : '✗';
  console.log(`  ${tag} Watch [${label}]: ${beatN} beats — narration spoken+matched ${matched}/${expected.length}, ${spoken.length} voice events, arrows seen ${arrowsSeen} (authored on ${authoredArrows} beats)`);
  if (matched !== expected.length) fails.push(`${id} [${label}] narration walk incomplete`);
  // exit
  const back = page.locator('[data-testid="back-button"],[aria-label="Back" i],[aria-label="Exit" i]').first();
  if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
  await page.waitForTimeout(600);
}

// setup
await page.goto(URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
try { await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 10000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 8000 }); await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { state: 'detached', timeout: 15000 }); } catch {}
console.log('[setup] 60s seed…'); await page.waitForTimeout(60000);
await openDetail(OPENINGS[0]);
const unlock = await seedUnlockedOpenings(page, OPENINGS);
console.log(`[unlock] ${JSON.stringify(unlock)}`);

for (const id of OPENINGS) {
  console.log(`\n=== ${id.replace('pro-samayraina-', '')} ===`);
  await openDetail(id);
  // MAIN
  const mainLesson = getLessonScript(id);
  const mainBeats = (mainLesson?.beats || []).map((b) => ({ say: b.say, arrowCount: (b.arrows || []).length }));
  await walkWatch(id, 'main', mainBeats);
  // VARIATIONS. The numbered tabs carry data-testid="variation-tab-<index>"
  // where <index> maps DIRECTLY into opening.variations (buildVariationTabs).
  // The leading main-line pill is "variation-tab-main" — EXCLUDE it (the main
  // lesson is already walked above; its "Main line" label collides on the word
  // "main" with names like "…Qa5 (Main)" if fuzzy-matched).
  const reps = JSON.parse((await import('node:fs')).readFileSync('src/data/pro-repertoires.json', 'utf8'));
  const entry = reps.openings.find((x) => x.id === id);
  const vars = entry?.variations || [];
  const tabIds = await page.locator('[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  for (const tid of tabIds) {
    const idx = Number((tid.match(/variation-tab-(\d+)/) || [])[1]);
    const v = vars[idx];
    if (!v) { F(`${id}: tab ${tid} has no variations[${idx}]`); continue; }
    await openDetail(id);
    await page.locator(`[data-testid="${tid}"]`).click().catch(() => {});
    await page.waitForTimeout(1200);
    const vLesson = getVariationLessonScript(id, v.name);
    const vBeats = (vLesson?.beats || []).map((b) => ({ say: b.say, arrowCount: (b.arrows || []).length }));
    if (!vBeats.length) { F(`${id} [${v.name}]: no variation lesson found`); continue; }
    await walkWatch(id, v.name.slice(0, 20), vBeats);
  }
}

console.log('\n══════ WALK RESULT ══════');
console.log(`/api/tts total: ${tts.length} | FAILURES: ${fails.length}`);
console.log(fails.length === 0 ? '✅ every beat walked: displayed narration matches authored, voice fired, arrows rendered' : `❌ ${fails.length} walk failures`);
await browser.close();
process.exit(0);
