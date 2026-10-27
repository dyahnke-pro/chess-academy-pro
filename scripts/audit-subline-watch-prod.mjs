// Check 5 of docs/SUBLINE-NARRATION.md — a batch of reply narrations is
// played in the app before it counts as shipped (WO-COURSE-01 E, 2026-10-27).
// For each reply line: open its opening and tab, open the reply, play Watch to
// the end, and read every spoken line back off the narration listener (muted —
// the app emits the same text, nothing is synthesised). Each beat must be
// HEARD, in ORDER, and the walk must reach its end.
//
// The keys default to every narration in src/data/lessons/sublineNarrationPilot.ts;
// AUDIT_KEYS=a,b,c narrows it. Matching reads a run of plain words from each
// beat (moves are spoken as words, "Knight takes d5", so they are skipped).
//
// Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-subline-watch-prod.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { sleep } from './audit-lib/board-drive.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const runId = `subline-watch-${Date.now().toString(36)}`;
const outDir = `audit-reports/subline-watch-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(outDir, { recursive: true });

// The batch: every key in the pilot file with its spoken texts in order.
const src = readFileSync('src/data/lessons/sublineNarrationPilot.ts', 'utf8');
const batch = [];
for (const block of src.split(/\n {2}(?="[a-z0-9-]+::)/).slice(1)) {
  const key = /^"([^"]+)"/.exec(block)?.[1];
  if (!key) continue;
  const says = [...block.matchAll(/\bsay: ("(?:[^"\\]|\\.)*")/g)].map((m) => JSON.parse(m[1]));
  batch.push({ key, says });
}
const only = process.env.AUDIT_KEYS ? new Set(process.env.AUDIT_KEYS.split(',')) : null;
const todo = batch.filter((b) => !only || only.has(b.key));

const norm = (t) => t.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The longest run of plain words in a spoken line (no move tokens), up to 6. */
function probe(text) {
  const words = text.split(/\s+/);
  let best = []; let cur = [];
  for (const w of words) {
    const plain = /^[A-Za-z'’,.;:—-]+$/.test(w) && !/^[KQRBN]?[a-h]?x?[a-h][1-8]/.test(w) && !/^…/.test(w) && !/[A-Z][a-h]?x?[a-h]/.test(w);
    if (plain) { cur.push(w); if (cur.length > best.length) best = [...cur]; } else cur = [];
  }
  return norm(best.slice(-6).join(' '));
}

const rows = [];
const record = (id, ok, detail) => { rows.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); writeFileSync(`${outDir}/report.json`, JSON.stringify(rows, null, 1)); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(runId));
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(([url, secret]) => {
  try {
    window.localStorage.setItem('auditStreamUrl', url);
    window.localStorage.setItem('auditStreamSecret', secret);
  } catch { /* ignore */ }
}, [listener.url, listener.secret]);
const page = await ctx.newPage();
page.on('pageerror', (e) => record('pageerror', false, e.message));

async function openOpening(id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 40; i++) {
    if (await page.locator('[data-testid="lesson-back"]').count()) await page.locator('[data-testid="lesson-back"]').click().catch(() => undefined);
    if (await page.locator('[data-testid="variation-tabs"]').count()) return true;
    await sleep(3000);
  }
  return false;
}

console.log(`[subline-watch] ${todo.length} reply lines`);
for (const { key, says } of todo) {
  const [, id, tab, trigger, atPly] = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(key);
  let step = 'open the opening';
  try {
    if (!(await openOpening(id))) { record(key, false, 'opening page never loaded'); continue; }
    step = `tap tab ${tab}`;
    await page.locator(`[data-testid="variation-tab-${tab}"]`).click();
    await sleep(1500);
    const row = page.locator(`[data-testid="reply-${atPly}-${trigger}"]`).first();
    // Replies past the first groups sit behind "Show N more" — tap it, as a user would.
    if (!(await row.count()) && await page.locator('[data-testid="reply-tree-toggle"]').count()) {
      step = 'tap Show more';
      await page.locator('[data-testid="reply-tree-toggle"]').first().click();
      await sleep(600);
    }
    if (!(await row.count())) { record(key, false, `reply row reply-${atPly}-${trigger} not on the tab`); continue; }
    step = 'open the reply';
    await row.click();
    await sleep(1200);
    const from = listener.getCapturedEvents().length;
    // Watch has no finish screen — it stops on the last move. The walk reached
    // its end when the line's LAST spoken beat was heard.
    step = 'tap Watch';
    await page.locator('[data-testid="subline-watch-btn"]').click();
    const lastProbe = probe(says[says.length - 1]);
    const heardNow = () => listener.getCapturedEvents().slice(from)
      .filter((e) => e.kind === 'coach-narration-spoken')
      .map((e) => norm(String(e.narrationText ?? e.summary ?? ''))).join(' | ');
    let done = false;
    const until = Date.now() + 240_000;
    while (Date.now() < until && !done) {
      await sleep(1500);
      done = heardNow().includes(lastProbe);
    }
    const heard = listener.getCapturedEvents().slice(from)
      .filter((e) => e.kind === 'coach-narration-spoken')
      .map((e) => norm(String(e.narrationText ?? e.summary ?? '')));
    const all = heard.join(' | ');
    let at = 0; const missing = []; let outOfOrder = 0;
    for (const s of says) {
      const p = probe(s);
      if (!p) continue;
      const i = all.indexOf(p, 0);
      if (i < 0) { missing.push(s.slice(0, 60)); continue; }
      if (i < at) outOfOrder++;
      at = Math.max(at, i);
    }
    record(key, done && missing.length === 0 && outOfOrder === 0,
      `${says.length} lines, ${heard.length} heard${done ? '' : ', walk never finished'}${missing.length ? ` · missing: "${missing[0]}"${missing.length > 1 ? ` +${missing.length - 1}` : ''}` : ''}${outOfOrder ? ` · ${outOfOrder} out of order` : ''}`);
  } catch (e) {
    record(key, false, `crash at "${step}": ${e.message.split('\n')[0]}`);
  }
}
await browser.close();
await listener.stop();
const failed = rows.filter((r) => !r.ok);
console.log(`[subline-watch] ${rows.length - failed.length}/${rows.length} pass · report ${outDir}/report.json`);
process.exit(failed.length ? 1 : 0);
