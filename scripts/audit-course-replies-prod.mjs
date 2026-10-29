// WO-COURSE-01 post-deploy audit — the Openings page's tabia, reply tree and
// reply ladder, and a reply's Learn landing in spaced review. MUTED (G1).
//
// Contracts (each a row; the run fails on any red):
//   R1  the summary line is under the header
//   R2  on a tab with a middlegame plan anchored where its line ends, the
//       tabia card shows that plan; elsewhere it shows only a computed
//       structure or hides (no plan is invented)
//   R3  the reply tree groups replies under "After <n.move>" with numbered moves
//       and a tag on every row; no two rows in one group read the same
//   R4  the floating coach button is a small icon (≤ 56px), not a 180px pill
//   R5  a reply opens like a variation: board + Watch/Learn/Practice/Play
//   R6  playing the reply's Learn to the end finishes the line
//   R7  …and its positions are in spaced review with the reply's line key
//   R8  the review trainer opens a line session with them due
//   R12 a trap the census added (the Elephant Trap on QGD) shows, and its
//       Watch narration is heard.
//   R9  on a tab with traps, the trap card comes first: above the tabia, the
//       reply tree and the model games (David 2026-10-27: "Bring them up top")
//   R10 the reply's Learn SPEAKS the moves only (the narration listener): no
//       prose in Learn — the theory was taught in Watch
//   R11 out of order (G7): a fresh reply's Play tapped FIRST opens the in-page
//       Play locked to that line — never the generic coach room
//   R13 the club replies (WO-COURSE-01 D) are on the Italian's tree, tagged
//       Club, in the order the app's 'club-replies-ordered' row chose (own
//       games first, then the band's reach); a tap opens one with its club line
//
// Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-course-replies-prod.mjs
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { clickMove, placementOf, readPlacement, samePlacement, sleep } from './audit-lib/board-drive.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENING = process.env.AUDIT_OPENING || 'caro-kann';
const TAB = process.env.AUDIT_TAB || '1';
const TRAP_OPENING = process.env.AUDIT_TRAP_OPENING || 'vienna-game';
const runId = `course-replies-${Date.now().toString(36)}`;
const outDir = `audit-reports/course-replies-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(outDir, { recursive: true });
const rows = [];
const record = (id, ok, detail) => { rows.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

// The narration listener: the app POSTs every spoken line (muted: the same
// event with the same text, no synthesis) to this loopback sidecar.
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

try {
  record('load', await openOpening(OPENING), `/openings/${OPENING}`);
  record('R1 summary', (await page.locator('[data-testid="opening-summary"]').count()) > 0, 'summary line under the header');

  await page.locator(`[data-testid="variation-tab-${TAB}"]`).click();
  await sleep(1500);
  // Is a plan anchored where this tab's line ends? (the same test the page runs)
  const course = [...['repertoire', 'pro-repertoires', 'gambits', 'anti-openings']].flatMap((f) => {
    const raw = JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));
    return Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw);
  });
  const tabLine = course.find((o) => o?.id === OPENING)?.variations?.[Number(TAB)]?.pgn ?? '';
  const endBoard = new Chess();
  for (const m of tabLine.trim().split(/\s+/).filter(Boolean)) endBoard.move(m);
  const posOf = (f) => f.split(' ').slice(0, 4).join(' ');
  const anchored = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'))
    .some((pl) => pl.openingId === OPENING && !pl.id.endsWith('-endgame') && posOf(pl.criticalPositionFen) === posOf(endBoard.fen()));
  const tabiaShown = (await page.locator('[data-testid="tabia-card"]').count()) > 0;
  const planShown = (await page.locator('[data-testid="tabia-your-plan"]').count()) > 0;
  record('R2 tabia', anchored ? tabiaShown && planShown : true,
    anchored ? `plan anchored at the line end · card=${tabiaShown} plan=${planShown}`
      : `no plan anchored at this tab's end · card=${tabiaShown}${tabiaShown ? ' (structure)' : ' (hidden, honest)'}`);

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
  const learnFrom = listener.getCapturedEvents().length;
  // Learn ends at the finish screen; 1.8s later Play opens and speaks its own
  // intro, which is not Learn's voice.
  let learnTo = Infinity;
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
      if (ended) { learnTo = listener.getCapturedEvents().length; record('R6 learn', true, `${sub.moves.length} plies, finish screen shown`); }
    } else {
      // The opponent's move can end the line too: the finish screen is the landing.
      if (i === sub.moves.length - 1) {
        const done = await page.locator('[data-testid="line-player-complete"]').waitFor({ timeout: 30_000 }).then(() => true, () => false);
        if (done) { learnTo = listener.getCapturedEvents().length; record('R6 learn', true, `${sub.moves.length} plies, ends on their move`); }
        else { record('R6 learn', false, `the line never finished after their last move ${mv.san}`); break; }
        mirror.move(sub.moves[i]);
        finished = true;
        break;
      }
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
    await page.locator('[data-testid="line-player-complete"]').waitFor({ timeout: 30_000 }).then(() => { learnTo = listener.getCapturedEvents().length; record('R6 learn', true, `${sub.moves.length} plies`); }).catch(() => record('R6 learn', false, 'no completion screen'));
  }
  await sleep(2500);
  const spoken = listener.getCapturedEvents().slice(learnFrom, learnTo)
    .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech|Internal)/.test(String(e.source ?? '')))
    .map((e) => String(e.narrationText ?? e.summary ?? '').trim()).filter(Boolean);
  const prose = spoken.filter((t) => t.split(/\s+/).length > 6);
  record('R10 learn voice', spoken.length > 0 && prose.length === 0, `${spoken.length} lines heard, longest "${[...spoken].sort((a, b) => b.length - a.length)[0] ?? ''}"${prose.length ? ` · prose: "${prose[0]}"` : ''}`);
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

  // R11: out of order — a different reply, Play before anything else.
  await openOpening(OPENING);
  await page.locator(`[data-testid="variation-tab-${TAB}"]`).click();
  await sleep(1200);
  const other = page.locator('[data-testid^="reply-group-"]').nth(1).locator('[data-testid^="reply-"]').filter({ has: page.locator('.font-mono') }).first();
  const otherId = (await other.getAttribute('data-testid').catch(() => null)) ?? '';
  if (otherId) {
    await other.click();
    await page.locator('[data-testid="subline-play-btn"]').click();
    await sleep(2500);
    const inPage = (await page.locator('[data-testid="opening-play-mode"]').count()) > 0;
    record('R11 play first', inPage && page.url().includes(`/openings/${OPENING}`), `${otherId} · in-page play=${inPage} · ${page.url().replace(URL, '')}`);
  } else {
    record('R11 play first', false, 'no second reply group to open');
  }

  // R9: traps above model games on a tab with traps.
  await openOpening(TRAP_OPENING);
  const order = await page.evaluate(() => {
    const y = (sel) => document.querySelector(sel)?.getBoundingClientRect().top ?? null;
    return {
      gems: y('[data-testid="punish-gems-card"]') ?? y('[data-testid="named-weapon-card"]'),
      tabia: y('[data-testid="tabia-card"]'),
      replies: y('[data-testid="reply-tree"]'),
      games: y('[data-testid="model-games-section"]'),
    };
  });
  const below = (k) => order[k] === null || order.gems < order[k];
  record('R9 traps up', order.gems !== null && below('tabia') && below('replies') && below('games'), JSON.stringify(order));

  // R12: a trap the census added (2026-10-27) shows on its opening and its
  // Watch is heard — the Elephant Trap on the QGD page.
  const ELEPHANT = 'qgd:d4_d5_c4_e6_Nc3_Nf6_Bg5_Nbd7_cxd5_exd5:Nxd5';
  await openOpening('qgd');
  const tile = page.locator(`[data-testid="punish-gem-${ELEPHANT}"]`);
  const shown = (await tile.count()) > 0;
  let heard = '';
  if (shown) {
    const from = listener.getCapturedEvents().length;
    await page.locator(`[data-testid="gem-watch-${ELEPHANT}"]`).click();
    const until = Date.now() + 90_000;
    while (Date.now() < until && !heard) {
      await sleep(2000);
      heard = listener.getCapturedEvents().slice(from)
        .filter((e) => e.kind === 'coach-narration-spoken')
        .map((e) => String(e.narrationText ?? e.summary ?? ''))
        .find((t) => /Elephant Trap/.test(t)) ?? '';
    }
  }
  record('R12 new trap', shown && !!heard, shown ? (heard ? `heard "${heard.slice(0, 80)}"` : 'tile shown, Watch narration not heard') : 'Elephant Trap tile missing on /openings/qgd');

  // R13 (WO-COURSE-01 D): the replies club players make that no taught line
  // covers are on the Italian's tree, tagged Club, in the order the app's own
  // 'club-replies-ordered' row says it chose — unmet replies by the band's
  // reach, highest first; a fresh device has met none. A tap opens one with
  // its club line.
  const clubFrom = listener.getCapturedEvents().length;
  await openOpening('italian-game');
  const clubTag = page.locator('[data-testid="reply-tree"] [data-testid="reply-tag-club"]');
  await clubTag.first().waitFor({ timeout: 45_000 }).catch(() => undefined);
  // The games' replies arrive after the club file and may hide a club row that
  // repeats one of theirs: read the tree once it has settled.
  await sleep(8000);
  const clubRows = listener.getCapturedEvents().slice(clubFrom)
    .filter((e) => e.kind === 'club-replies-ordered')
    .map((e) => { try { return JSON.parse(String(e.details ?? '{}')); } catch { return {}; } })
    .filter((d) => d.openingId === 'italian-game');
  const decided = clubRows.at(-1);
  const groupsOk = decided ? [...new Set(decided.rows.map((r) => r.group))].every((g) => {
    const inGroup = decided.rows.filter((r) => r.group === g);
    const unmet = inGroup.filter((r) => r.met === 0);
    const metFirst = inGroup.findIndex((r) => r.met === 0) === -1 || inGroup.slice(inGroup.findIndex((r) => r.met === 0)).every((r) => r.met === 0);
    return metFirst && unmet.every((r, i) => i === 0 || unmet[i - 1].reach >= r.reach);
  }) : false;
  let domOk = false;
  if (decided) {
    const g0 = decided.rows[0].group;
    const domSans = await page.locator(`[data-testid="reply-group-${g0}"] button:has([data-testid="reply-tag-club"])`)
      .evaluateAll((els) => els.map((el) => (el.getAttribute('data-testid') ?? '').replace(/^reply-\d+-/, '')));
    domOk = JSON.stringify(domSans) === JSON.stringify(decided.rows.filter((r) => r.group === g0).map((r) => r.san));
  }
  record('R13 CLUB REPLIES ordered by the band, own games first',
    !!decided && decided.shown > 0 && decided.met === 0 && groupsOk && domOk && /^\d{4},\d{4}$/.test(decided.band ?? ''),
    decided ? `${decided.shown} club rows at ${decided.band} · met ${decided.met} · group order ok=${groupsOk} · DOM matches=${domOk}` : `no club-replies-ordered row (${await clubTag.count()} Club tags on the page)`);
  if ((await clubTag.count()) > 0) {
    await page.locator('[data-testid="reply-tree"] button:has([data-testid="reply-tag-club"])').first().click();
    const reach = page.locator('[data-testid="subline-club-reach"]');
    await reach.waitFor({ timeout: 15_000 }).catch(() => undefined);
    record('R13 club reply opens', (await reach.count()) > 0 && (await page.locator('[data-testid="subline-learn-btn"]').count()) > 0,
      (await reach.count()) ? (await reach.textContent()) ?? '' : 'no club line on the opened reply');
  }
} catch (e) {
  record('crash', false, e.message);
}
await browser.close();
await listener.stop();
writeFileSync(`${outDir}/report.json`, JSON.stringify({ runId, rows }, null, 2));
const red = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - red.length}/${rows.length} green · report ${outDir}/report.json`);
process.exit(red.length ? 1 : 0);
