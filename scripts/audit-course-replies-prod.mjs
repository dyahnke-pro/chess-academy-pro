// WO-COURSE-01 post-deploy audit — the Openings page's tabia, reply tree and
// reply ladder, and a reply's Learn landing in spaced review. MUTED (G1).
//
// Contracts (each a row; the run fails on any red):
//   R1  the summary line is under the header
//   R2  the tabia card shows on a variation tab (board + your plan / structure)
//   R3  the reply tree groups replies under "After <n.move>" with numbered moves
//       and a tag on every row; no two rows in one group read the same
//   R4  the floating coach button is a small icon (≤ 56px), not a 180px pill
//   R5  a reply opens like a variation: board + Watch/Learn/Practice/Play
//   R6  playing the reply's Learn to the end finishes the line
//   R7  …and its positions are in spaced review with the reply's line key
//   R8  the review trainer opens a line session with them due
//   R9  on a tab with traps, the trap card sits above the model games
//
// Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-course-replies-prod.mjs
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { clickMove, placementOf, readPlacement, samePlacement, sleep } from './audit-lib/board-drive.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENING = process.env.AUDIT_OPENING || 'caro-kann';
const TAB = process.env.AUDIT_TAB || '1';
const TRAP_OPENING = process.env.AUDIT_TRAP_OPENING || 'vienna-game';
const runId = `course-replies-${Date.now().toString(36)}`;
const outDir = `audit-reports/course-replies-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(outDir, { recursive: true });
const rows = [];
const record = (id, ok, detail) => { rows.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(runId));
await ctx.addInitScript(autoDismissCalibration);
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

try {
  record('load', await openOpening(OPENING), `/openings/${OPENING}`);
  record('R1 summary', (await page.locator('[data-testid="opening-summary"]').count()) > 0, 'summary line under the header');

  await page.locator(`[data-testid="variation-tab-${TAB}"]`).click();
  await sleep(1500);
  const tabia = page.locator('[data-testid="tabia-card"]');
  record('R2 tabia', (await tabia.count()) > 0 && ((await page.locator('[data-testid="tabia-your-plan"], [data-testid="tabia-structure"]').count()) > 0), 'tabia card with a plan or structure');

  const groups = page.locator('[data-testid^="reply-group-"]');
  const nGroups = await groups.count();
  let numbered = true; let tagged = true; let dupes = 0; let firstAfter = '';
  for (let g = 0; g < nGroups; g++) {
    const grp = groups.nth(g);
    if (g === 0) firstAfter = (await grp.locator('p').first().textContent()) ?? '';
    const rws = grp.locator('[data-testid^="reply-"]:not([data-testid^="reply-tag"]):not([data-testid^="reply-learned"]):not([data-testid^="reply-group"])');
    const seen = new Set();
    for (let r = 0; r < await rws.count(); r++) {
      const row = rws.nth(r);
      const mv = (await row.locator('.font-mono').textContent())?.trim() ?? '';
      if (!/^\d+(\.|…)\S+/.test(mv)) numbered = false;
      if ((await row.locator('[data-testid^="reply-tag-"]').count()) === 0) tagged = false;
      const label = (await row.textContent()) ?? '';
      if (seen.has(label)) dupes++;
      seen.add(label);
    }
  }
  record('R3 reply tree', nGroups > 0 && numbered && tagged && dupes === 0 && /^After \d/.test(firstAfter), `${nGroups} groups · numbered=${numbered} tagged=${tagged} dupes=${dupes} · "${firstAfter}"`);

  const coach = page.locator('[data-testid="masterclass-coach-open"]');
  const cbox = await coach.boundingBox().catch(() => null);
  record('R4 coach button', !!cbox && cbox.width <= 56, `width ${cbox?.width ?? 'none'}`);

  // Open the first reply.
  const firstRow = groups.first().locator('[data-testid^="reply-"]').filter({ has: page.locator('.font-mono') }).first();
  const testid = (await firstRow.getAttribute('data-testid')) ?? '';
  const [, atPlyS, trigger] = /^reply-(\d+)-(.+)$/.exec(testid) ?? [];
  await firstRow.click();
  await sleep(1200);
  const ladder = ['watch', 'learn', 'practice', 'play'];
  const ladderOk = (await page.locator('[data-testid="subline-detail"]').count()) > 0
    && (await Promise.all(ladder.map((r) => page.locator(`[data-testid="subline-${r}-btn"]`).count()))).every((n) => n > 0);
  record('R5 reply opens', ladderOk, `${trigger}@${atPlyS}`);

  // Play its Learn: the subline's moves come from the shipped data.
  const subs = JSON.parse(readFileSync('src/data/course-sublines.json', 'utf8'));
  const sub = subs[OPENING][TAB].find((s) => s.triggerMove === trigger && s.atPly === Number(atPlyS));
  const color = (JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')).find((o) => o.id === OPENING) ?? {}).color ?? 'white';
  const me = color === 'white' ? 'w' : 'b';
  await page.locator('[data-testid="subline-learn-btn"]').click();
  await sleep(2500);
  const mirror = new Chess();
  let finished = false;
  for (let i = 0; i < sub.moves.length; i++) {
    const before = new Chess(mirror.fen());
    const mv = before.move(sub.moves[i]);
    if (mirror.turn() === me) {
      // The last move ends the line: "Line Mastered!" replaces the board and,
      // 1.8s later, Learn hands on to Play (as a variation's Learn does) — so
      // the landing is that screen, read right after the click, not a board.
      const last = i === sub.moves.length - 1;
      const ok = last
        ? await clickMove(page, mv).then(() => page.locator('[data-testid="line-player-complete"]').waitFor({ timeout: 15_000 })).then(() => true, () => false)
        : await clickMove(page, mv, before.fen(), { timeout: 20_000 });
      const ended = ok && last;
      if (!ok) { record('R6 learn', false, `move ${i} ${mv.san} not taken`); break; }
      if (ended) record('R6 learn', true, `${sub.moves.length} plies, finish screen shown`);
    } else {
      const want = placementOf(before.fen());
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline && !samePlacement(await readPlacement(page), want)) await sleep(400);
      if (!samePlacement(await readPlacement(page), want)) { record('R6 learn', false, `opponent move ${i} ${mv.san} never came`); break; }
    }
    mirror.move(sub.moves[i]);
    if (i === sub.moves.length - 1) finished = true;
  }
  // A line that ends on the opponent's move finishes without a student click.
  if (finished && !rows.some((r) => r.id === 'R6 learn')) {
    await page.locator('[data-testid="line-player-complete"]').waitFor({ timeout: 30_000 }).then(() => record('R6 learn', true, `${sub.moves.length} plies`)).catch(() => record('R6 learn', false, 'no completion screen'));
  }
  await sleep(2500);
  const cards = await page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onsuccess = () => {
      const tx = open.result.transaction('srsOpeningCards', 'readonly');
      const all = tx.objectStore('srsOpeningCards').getAll();
      all.onsuccess = () => resolve(all.result.map((c) => c.lineKey ?? null));
      all.onerror = () => resolve([]);
    };
    open.onerror = () => resolve([]);
  }));
  const key = `sub-${TAB}::${trigger}@${atPlyS}`;
  record('R7 in review', cards.some((k) => k === key), `${cards.filter((k) => k === key).length} cards with ${key} (of ${cards.length})`);

  await page.goto(`${URL}/openings/srs`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="srs-trainer-hub"]').waitFor({ timeout: 30_000 });
  await page.locator('[data-testid="srs-mode-line"]').click();
  const due = (await page.locator('[data-testid="srs-due-count"]').textContent().catch(() => null))?.trim() ?? '?';
  const start = page.locator('[data-testid="srs-start-session"]');
  const canStart = (await start.count()) > 0;
  if (canStart) await start.click();
  await sleep(1500);
  const lineName = (await page.locator('[data-testid="srs-variation-name"]').textContent().catch(() => null))?.trim() ?? '';
  record('R8 review session', canStart && (await page.locator('[data-testid="srs-session"]').count()) > 0, `due ${due} · first line "${lineName}"`);

  // R9: traps above model games on a tab with traps.
  await openOpening(TRAP_OPENING);
  const order = await page.evaluate(() => {
    const y = (sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? null;
    return { gems: y('[data-testid="punish-gems-card"]') ?? y('[data-testid="named-weapon-card"]'), games: y('[data-testid="model-games-section"]') };
  });
  record('R9 traps up', order.gems !== null && (order.games === null || order.gems < order.games), JSON.stringify(order));
} catch (e) {
  record('crash', false, e.message);
}
await browser.close();
writeFileSync(`${outDir}/report.json`, JSON.stringify({ runId, rows }, null, 2));
const red = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - red.length}/${rows.length} green · report ${outDir}/report.json`);
process.exit(red.length ? 1 : 0);
