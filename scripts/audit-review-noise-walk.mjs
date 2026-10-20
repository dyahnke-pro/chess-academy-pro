// THE REVIEW NOISE WALK (lead 2026-10-20: "cut unnecessary narration in
// Review"). David's own games, on his own record (the data drop loaded into
// IndexedDB), the WHOLE review auto-played muted, every spoken line captured
// off the app's own `coach-narration-spoken` events. Prints the tape per game
// and the measures the standard holds Review to: average words per teaching
// turn (≤100), the why share (≥80%), and reason formulas said more than twice.
//
//   AUDIT_SMOKE_URL=http://localhost:5173 GIDS=id1,id2,id3 node scripts/audit-review-noise-walk.mjs
//
// Writes audit-reports/review-noise/<label>.json (TAPE_LABEL, default "run").
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { readWalkPly } from './audit-lib/review-explore.mjs';
import { until } from './audit-lib/wedge-watch.mjs';
import { whyTally, formulaRepeats, turnLength, REVIEW_TURN_WORDS_MAX, WHY_SHARE_BAR } from './audit-lib/why-count.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const GIDS = (process.env.GIDS || '').split(',').filter(Boolean);
const LABEL = process.env.TAPE_LABEL || 'run';
const log = (s) => console.log(s);
if (!GIDS.length) { log('GIDS=<game ids> required'); process.exit(2); }

const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const listener = await attachVoiceListener(ctx);
const page = await ctx.newPage();
await blockTtsNetwork(page);
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));

const spoken = () => listener.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText && String(e.source ?? '').startsWith('voiceService.'))
  .map((e) => String(e.narrationText));
const dismiss = async () => {
  for (let i = 0; i < 4; i++) {
    if (await has(page, '[data-testid="ai-consent-allow"]')) await page.locator('[data-testid="ai-consent-allow"]').first().click({ timeout: 2500 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
};

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
const fx = await loadFixtureIntoIDB(page);
log(`[fixture] ${fx.loaded ? `${fx.wrote} rows / ${fx.stores} stores` : `skipped (${fx.reason})`}`);
if (!fx.loaded) { await browser.close(); process.exit(1); }

mkdirSync('audit-reports/review-noise', { recursive: true });
const report = { label: LABEL, games: [] };
for (const gid of GIDS) {
  await page.goto(`${BASE}/coach/review/${gid}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismiss();
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 3000 }).catch(() => 'x')) === null; };
  if (!(await until(startable, 300000, 1500))) { log(`[${gid}] walk never startable`); continue; }
  const from = spoken().length;
  const evFrom = listener.getCapturedEvents().length;
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  let last = -1; let stuck = 0;
  for (let i = 0; i < 1500; i++) {
    const r = await readWalkPly(page).catch(() => null);
    if (r && r.n !== last) { last = r.n; stuck = 0; if (r.n % 10 === 0) log(`  [${gid}] ply ${r.n}/${r.total}`); } else stuck += 1;
    if (r && r.n >= r.total && stuck > 20) break;
    if (stuck > 90) { log(`  [${gid}] no progress for 90s at ply ${last}`); break; }
    // A question on the board is answered as a student who does not know: forward.
    if (await has(page, '[data-testid="review-turning-question"]')) await page.locator('[data-testid="review-forward-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
    const st = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state', { timeout: 2000 }).catch(() => null);
    if (st === 'paused') await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(8000);
  const lines = spoken().slice(from);
  const len = turnLength(lines);
  const why = whyTally(lines, Math.ceil((last > 0 ? last : 0) / 2));
  const reps = formulaRepeats(lines);
  // THE MID-WALK SWAPS (the lead, 2026-10-20): each merge's ledger read, and
  // the end-of-walk steps beside every spoken closing, so a recap heard twice
  // can be told from the app (two speak calls) or the driver (a tap at the end).
  const evs = listener.getCapturedEvents().slice(evFrom);
  const parse = (e) => { try { return JSON.parse(e.details ?? 'null'); } catch { return null; } };
  const merges = evs.filter((e) => e.kind === 'review-walk-merged').map((e) => parse(e));
  const closings = evs.filter((e) => e.kind === 'coach-narration-spoken' && /^The pattern: /.test(String(e.narrationText ?? ''))).map((e) => String(e.narrationText).slice(0, 60));
  const endSteps = evs.filter((e) => e.kind === 'review-playback-step').slice(-6).map((e) => e.summary);
  const g = { gid, plies: last, lines, avgWords: +len.avg.toFixed(1), longest: len.longest, turns: len.turns, whyShare: +why.share.toFixed(3), whyless: why.whyless, formulaRepeats: reps, merges, closings, endSteps };
  report.games.push(g);
  writeFileSync(`audit-reports/review-noise/${LABEL}.json`, JSON.stringify(report, null, 2));
  log(`[${gid}] ${lines.length} lines · avg ${g.avgWords} words/turn (≤${REVIEW_TURN_WORDS_MAX}) · why ${(g.whyShare * 100).toFixed(0)}% (≥${WHY_SHARE_BAR * 100}%) · ${reps.length} repeated formulas`);
  for (const m of merges) log(`  [${gid}] swap at ply ${m?.frozen}: ${m?.spoken} spoken, ${m?.missing} unknown to the new build, ${m?.reSaid} said again`);
  log(`  [${gid}] closing lines spoken: ${closings.length} · last steps: ${endSteps.join(' | ')}`);
}
const all = report.games.flatMap((g) => g.lines);
const len = turnLength(all); const why = whyTally(all, 1);
report.total = { lines: all.length, avgWords: +len.avg.toFixed(1), whyShare: +why.share.toFixed(3), pageErrors: errs };
writeFileSync(`audit-reports/review-noise/${LABEL}.json`, JSON.stringify(report, null, 2));
log(`[total] ${all.length} lines · avg ${report.total.avgWords} words/turn · why ${(report.total.whyShare * 100).toFixed(0)}% · page errors ${errs.length}`);
await listener.stop(); await browser.close();
