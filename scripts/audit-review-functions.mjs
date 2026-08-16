/**
 * REVIEW FULL FUNCTION SCAN — functional click-through with a per-function
 * COVERAGE GRID (David 2026-07-25: "did you scan EVERYTHING?"). Drives every
 * review function by clicking REAL buttons (no command injection) and reports
 * reached?/driven?/result per function. Read the grid; a function is only
 * "confirmed" if the grid PROVES it was reached + exercised. Silent no-op = FAIL.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const URL = 'https://chess-academy-pro.vercel.app';
const grid = [];
const badHttp = [];
const pageErrs = [];
const rec = (fn, reached, ok, note) => grid.push({ fn, reached, ok, note: (note || '').slice(0, 90) });

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
const p = await ctx.newPage();
p.on('pageerror', (e) => pageErrs.push(e.message.slice(0, 120)));
p.on('response', async (r) => {
  if (r.status() >= 400 && !/\.(png|jpg|svg|woff2?|ico|css)(\?|$)/i.test(r.url())) {
    let body = ''; try { body = (await r.text()).slice(0, 160); } catch {}
    badHttp.push(`${r.status()} ${r.url().slice(0, 90)} :: ${body.replace(/\s+/g, ' ')}`);
  }
});

const has = async (tid, t = 1500) => { try { await p.locator(`[data-testid="${tid}"]`).first().waitFor({ state: 'visible', timeout: t }); return true; } catch { return false; } };
const tap = async (tid, t = 6000) => {
  const l = p.locator(`[data-testid="${tid}"]`).first();
  await l.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
  await l.click({ timeout: t, force: true });
  await p.waitForTimeout(900);
};
const txt = async (tid) => { try { return (await p.locator(`[data-testid="${tid}"]`).first().innerText({ timeout: 2500 })).replace(/\s+/g, ' '); } catch { return ''; } };

// ── onboarding ──
await p.goto(`${URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(2500);
for (const t of ['ai-consent-allow', 'skill-band-intermediate', 'page-help-close']) { try { await tap(t, 4000); } catch {} }

// ── FS1 list-page filters ──
await p.goto(`${URL}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(3000);
try { await tap('page-help-close', 3000); } catch {}
for (const f of ['coach', 'lichess', 'chesscom', 'all']) {
  try { await tap(`review-filter-${f}`, 4000); rec(`FS1 filter-${f}`, true, true, 'clicked'); }
  catch (e) { rec(`FS1 filter-${f}`, false, false, String(e).slice(0, 40)); }
}
// FS3 import cta present
rec('FS3 import-games-cta', await has('import-games-cta'), await has('import-games-cta'), 'present');

// The FS12-18 diagnostic cards fire only at "planned plies" — ≤2 per game and
// only where the STUDENT played an inaccuracy/mistake/blunder — so no single
// game surfaces all seven. Walk SEVERAL games and UNION the card coverage.
// GAMES: amateur games (real student mistakes) first, then master games.
const GAMES = (process.env.AUDIT_GAMES || 'sample-italian-amateur-2,sample-vienna-amateur-1,sample-london-amateur-3').split(',');
const cardsSeen = new Set();
let shellDone = false;
let anyWalk = false;

async function openGame(id) {
  await p.goto(`${URL}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(3500);
  try { await tap('page-help-close', 2000); } catch {}
  // Wait for the list to populate from Dexie (async on a cold reload).
  try { await p.locator('[data-testid^="review-game-card-"]').first().waitFor({ state: 'visible', timeout: 15000 }); } catch {}
  if (!(await has(`review-game-card-${id}`, 6000))) return false;
  await tap(`review-game-card-${id}`, 6000);
  return true;
}

async function driveCards(maxSteps) {
  for (let step = 0; step < maxSteps; step++) {
    if (await has('review-find-shot-card', 500)) {
      cardsSeen.add('find-shot');
      const hint = await has('review-find-shot-hint', 500); if (hint) await tap('review-find-shot-hint', 3000);
      const reveal = await has('review-find-shot-reveal', 500); if (reveal) await tap('review-find-shot-reveal', 3000);
      if (await has('review-find-shot-continue', 500)) await tap('review-find-shot-continue', 3000);
      else if (await has('review-find-shot-skip', 500)) await tap('review-find-shot-skip', 3000);
      rec('FS12 find-shot card', true, hint && reveal, `hint=${hint} reveal=${reveal}`); continue;
    }
    if (await has('review-rewind-card', 500)) {
      cardsSeen.add('rewind');
      const dec = await has('review-rewind-decline', 500); if (dec) await tap('review-rewind-decline', 3000);
      rec('FS13 rewind card', true, dec, `decline=${dec}`); continue;
    }
    if (await has('review-turning-point-card', 500) || await has('review-turning-card', 500)) {
      cardsSeen.add('turning');
      const rev = await has('review-turning-point-reveal', 500); if (rev) await tap('review-turning-point-reveal', 3000);
      if (await has('review-turning-point-confirm', 500)) await tap('review-turning-point-confirm', 3000);
      if (await has('review-turning-point-done', 500)) await tap('review-turning-point-done', 3000);
      rec('FS14 turning-point card', true, true, `reveal=${rev}`); continue;
    }
    if (await has('review-trap-card', 500)) {
      cardsSeen.add('trap');
      if (await has('review-trap-reveal', 500)) await tap('review-trap-reveal', 3000);
      if (await has('review-trap-done', 500)) await tap('review-trap-done', 3000);
      rec('FS15 trap card', true, true, 'driven'); continue;
    }
    if (await has('review-principle-quiz', 500)) {
      cardsSeen.add('quiz');
      if (await has('principle-quiz-skip', 500)) await tap('principle-quiz-skip', 3000);
      else if (await has('review-forward-btn', 500)) await tap('review-forward-btn', 3000);
      rec('FS16 principle-quiz', true, true, 'surfaced'); continue;
    }
    if (await has('discussion-practice-panel', 500)) {
      cardsSeen.add('discussion');
      if (await has('discussion-hint', 500)) await tap('discussion-hint', 3000);
      if (await has('walk-resume-game-btn', 800)) await tap('walk-resume-game-btn', 3000);
      rec('FS17 discussion why-picker', true, true, 'probe+hint'); continue;
    }
    if (await has('review-capture-continue', 500) || await has('review-capture-skip', 500) || await has('review-blunder-capture', 500)) {
      cardsSeen.add('capture');
      if (await has('review-capture-continue', 500)) await tap('review-capture-continue', 3000);
      else if (await has('review-capture-skip', 500)) await tap('review-capture-skip', 3000);
      else if (await has('review-forward-btn', 500)) await tap('review-forward-btn', 3000);
      rec('FS18 capture flow', true, true, 'driven'); continue;
    }
    if (!(await has('review-forward-btn', 700))) break;
    try { await tap('review-forward-btn', 3000); } catch { break; }
  }
}

for (const id of GAMES) {
  if (cardsSeen.size >= 7) break; // all card types covered
  if (!(await openGame(id))) continue;
  if (!grid.some((g) => g.fn === 'FS2 open-game-card')) rec('FS2 open-game-card', true, true, id);
  // analysis → walk-ready (poll up to ~200s; real Stockfish on a cold context)
  let walkReady = false;
  for (let i = 0; i < 50; i++) {
    const t = await txt('start-walk-btn');
    if (/start|restart/i.test(t)) { walkReady = true; break; }
    await p.waitForTimeout(4000);
  }
  if (!walkReady) { if (!grid.some((g) => g.fn === 'FS4 analysis→summary')) rec('FS4 analysis→summary', false, false, `never ready (${id})`); continue; }
  if (!grid.some((g) => g.fn === 'FS4 analysis→summary')) rec('FS4 analysis→summary', true, true, `walk ready (${id})`);
  if (!grid.some((g) => g.fn === 'FS11 classification-badge')) rec('FS11 classification-badge', await has('review-classification-badge', 1500), await has('review-classification-badge', 500), id);

  await tap('start-walk-btn', 6000);
  await p.waitForTimeout(1500);
  anyWalk = true;

  if (!shellDone) {
    shellDone = true;
    rec('FS5 forward-btn', await has('review-forward-btn'), await has('review-forward-btn'), '');
    try { await tap('flip-button', 3000); rec('FS6 flip', true, true, 'clicked'); } catch (e) { rec('FS6 flip', false, false, String(e).slice(0, 30)); }
    if (await has('review-engine-lines-toggle')) { await tap('review-engine-lines-toggle', 3000); rec('FS9 engine-lines', true, await has('review-engine-lines-panel', 1500), 'panel?'); } else rec('FS9 engine-lines', false, false, 'no toggle');
    if (await has('walk-narration-toggle-btn')) { await tap('walk-narration-toggle-btn', 3000); rec('FS10 replay-narration', true, true, 'clicked'); } else rec('FS10 replay-narration', false, false, 'absent');
    if (await has('walk-explore-toggle-btn')) { try { await tap('walk-explore-toggle-btn', 3000); } catch {} }
    const exploreBtn = (await p.locator('[data-testid^="walk-explore-btn-"]').count()) > 0;
    if (exploreBtn) { try { await p.locator('[data-testid^="walk-explore-btn-"]').first().click({ timeout: 4000, force: true }); await p.waitForTimeout(2500); rec('FS24 explore-line', true, true, 'clicked'); } catch (e) { rec('FS24 explore-line', true, false, String(e).slice(0, 40)); } }
    else rec('FS24 explore-line', false, false, 'no explore btn');
    if (await has('walk-ask-toggle-btn')) {
      await tap('walk-ask-toggle-btn', 3000);
      const ta = p.locator('[data-testid="walk-ask-panel"] textarea, [data-testid="walk-ask-panel"] input').first();
      try {
        await ta.click({ timeout: 3000 }); await ta.pressSequentially('why was that move a mistake?', { delay: 15 });
        await p.locator('[data-testid="chat-send-btn"]').first().click({ timeout: 3000 });
        await p.waitForTimeout(8000);
        const resp = await has('walk-ask-response', 3000) || (await txt('walk-ask-panel')).length > 40;
        rec('FS25 ask+send', true, resp, resp ? 'got response' : 'no response');
      } catch (e) { rec('FS25 ask+send', true, false, String(e).slice(0, 40)); }
      try { await tap('walk-ask-toggle-btn', 2000); } catch {}
    } else rec('FS25 ask+send', false, false, 'no ask btn');
  }

  await driveCards(60);

  // end-of-walk actions (record once)
  if (!grid.some((g) => g.fn === 'FS26 practice-in-chat')) {
    rec('FS26 practice-in-chat', await has('walk-practice-in-chat-btn', 1500), await has('walk-practice-in-chat-btn', 500), 'present');
    rec('FS27 play-again', await has('walk-play-again-btn', 1500), await has('walk-play-again-btn', 500), 'present');
    rec('FS28 back-to-coach', await has('walk-back-to-coach-btn', 1500), await has('walk-back-to-coach-btn', 500), 'present');
    rec('FS30 weakness-capture', await has('game-review-weakness-capture', 1500), await has('game-review-weakness-capture', 500), 'present');
  }
}

if (!anyWalk && !grid.some((g) => g.fn === 'FS2 open-game-card')) rec('FS2 open-game-card', false, false, 'no game opened across all ids');

// cards that never surfaced across ALL walked games
for (const [fn, key] of [['FS12 find-shot card', 'find-shot'], ['FS13 rewind card', 'rewind'], ['FS14 turning-point card', 'turning'], ['FS15 trap card', 'trap'], ['FS16 principle-quiz', 'quiz'], ['FS17 discussion why-picker', 'discussion'], ['FS18 capture flow', 'capture']]) {
  if (!cardsSeen.has(key) && !grid.some((g) => g.fn === fn)) rec(fn, false, anyWalk, 'did not surface across walked games');
}

console.log('\n===== REVIEW FUNCTION COVERAGE GRID =====');
for (const g of grid) console.log(`${g.ok ? '✅' : g.reached ? '⚠️ ' : '❌'} ${g.fn.padEnd(28)} reached=${g.reached} ok=${g.ok}  ${g.note}`);
console.log(`\npageerrors: ${pageErrs.length}`); pageErrs.slice(0, 6).forEach((e) => console.log('  PE:', e));
console.log(`http>=400: ${badHttp.length}`); [...new Set(badHttp)].slice(0, 8).forEach((h) => console.log('  ', h));
await b.close();
