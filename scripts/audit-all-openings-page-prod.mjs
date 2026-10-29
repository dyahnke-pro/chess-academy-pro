#!/usr/bin/env node
/**
 * audit-all-openings-page-prod — an All-section opening (no hand-built lesson)
 * is BUILT FROM THE GAMES on its own page (WO-ALL-OPENINGS-01 P3, David
 * 2026-10-28: "Make sure the 'all' section of the openings teaches and builds
 * this way"). Driven by hand through the muted hand driver (G1 + the hand-walk
 * standard): the listener hears the voice, the app's own rows are read back.
 *
 *   A1  /openings/<Mengarini> stays on the page — never handed off to
 *       /coach/teach — and its line runs past the 3-ply name.
 *   A2  the masters' splits are variation tabs.
 *   A3  Watch plays IN THE PAGE (the lesson player's "Play lesson" control),
 *       never the coach hand-off and never the legacy walkthrough.
 *   A4  the voice spoke the lesson (a narration row while Watch played).
 *   A5  a line under a masterclass (the Vienna's Mengarini) stays on a page;
 *       a line the tree cannot build (the Paris Gambit, no master games)
 *       still hands off.
 *   B1  every tab lists the opponent's replies built from the games (O3), and
 *       a reply with no hand-written narration plays a GENERATED lesson that
 *       speaks past its intro (O4).
 *   B2  a tab with no hand-written plan shows the plan masters played from its
 *       last board, on the tabia card and in the plans section (O5); its Watch
 *       speaks.
 *   B3  a tab with no hand-picked game shows the strongest master win for the
 *       student's side through its line (O6); endings and computed gems are
 *       read back when the line has them (informational).
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-all-openings-page-prod.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.HAND_PORT ?? 7794);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const driver = spawn(process.execPath, ['scripts/audit-lib/hand-driver.mjs'], {
  env: { ...process.env, HAND_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('hand driver did not start in 90s')), 90_000);
  driver.stdout.on('data', (b) => { if (String(b).includes('hand-driver on')) { clearTimeout(t); resolve(); } });
  driver.on('exit', (code) => reject(new Error(`hand driver exited ${code}`)));
});

const get = async (p, body) => {
  const r = await fetch(`${base}${p}`, body === undefined ? {} : { method: 'POST', body });
  return r.json();
};
const js = (code) => get('/js', code);
const rows = [];
const check = (id, pass, detail) => {
  rows.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id} — ${detail}`);
};
const events = async (grep) => (await get(`/events?n=400&grep=${encodeURIComponent(grep)}`)) ?? [];
const spoken = async () => (await events('coach-narration-spoken')).join('\n');
const href = async () => String(await js('return location.pathname + location.search'));
const slug = (eco, name) => `${eco}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Open an opening page and wait until it either renders or hands off. The
 *  first visit on a cold device waits for the opening data to seed. */
async function openOpening(id) {
  await get(`/goto?path=${encodeURIComponent(`/openings/${id}`)}&ms=4000`);
  for (let i = 0; i < 60; i += 1) {
    const where = await href();
    if (where.startsWith('/coach/teach')) return 'handed-off';
    if (await js('return !!document.querySelector("[data-testid=walkthrough-btn]")')) return 'page';
    await sleep(2000);
  }
  return 'stuck';
}

try {
  const meng = slug('B20', 'Sicilian Defense: Mengarini Variation');
  const where = await openOpening(meng);
  check('A1 the page stays (built from the games)', where === 'page', `${where} at ${await href()}`);
  const tabs = Number(await js('return document.querySelectorAll("[data-testid^=variation-tab-]").length'));
  const tabText = String(await js('return [...document.querySelectorAll("[data-testid^=variation-tab-]")].map((b) => b.innerText.trim()).join(" | ")'));
  check('A2 the masters\' splits are tabs', tabs >= 2, `${tabs} tabs: ${tabText.slice(0, 200)}`);

  await get('/click?id=walkthrough-btn&ms=3000');
  let player = false;
  for (let i = 0; i < 60 && !player; i += 1) {
    if ((await href()).startsWith('/coach/teach')) break;
    // The lesson player's own controls (its play button reads "Pause" while
    // it plays, so the step buttons are the stable mark).
    player = !!(await js('return !!document.querySelector("[aria-label=\'Next move\']") && !!document.querySelector("[aria-label=\'Previous move\']")'));
    if (!player) await sleep(2000);
  }
  const legacy = !!(await js('return !!document.querySelector("[data-testid=walkthrough-progress]")'));
  check('A3 Watch plays in the page', player && !legacy && !(await href()).startsWith('/coach/teach'), `player=${player} legacy=${legacy} at ${await href()}`);
  // Let it narrate a few beats.
  for (let i = 0; i < 4; i += 1) { await sleep(5000); await js('const b = document.querySelector("[aria-label=\'Next move\']"); if (b) b.click(); return true'); }
  const said = await spoken();
  check('A4 the voice spoke the lesson', said.trim().length > 0, said.split('\n').slice(0, 3).join(' / ').slice(0, 300) || '(not heard)');

  // B — the rest of the tab, built from the games.
  await openOpening(meng);
  const replyIds = async () => (await js('return [...document.querySelectorAll("[data-testid^=reply-]")].map((e) => e.dataset.testid).filter((t) => /^reply-\\d+-/.test(t))')) ?? [];
  let replies = [];
  for (let i = 0; i < 30 && replies.length === 0; i += 1) { replies = await replyIds(); if (!replies.length) await sleep(2000); }
  check('B1 the tab lists the replies built from the games', replies.length > 0, `${replies.length} replies: ${replies.slice(0, 6).join(', ')}`);
  if (replies.length) {
    const before = (await spoken()).split('\n').length;
    await get(`/click?id=${encodeURIComponent(replies[0])}&ms=2500`);
    await get('/click?id=subline-watch-btn&ms=2000');
    for (let i = 0; i < 40; i += 1) {
      if (!(await js('return !!document.querySelector("[data-testid=generated-reply-loading]")'))) break;
      await sleep(2000);
    }
    await sleep(15000);
    const heard = (await spoken()).split('\n').slice(before).filter(Boolean);
    check('B1 a built reply plays a generated lesson that speaks past its intro', heard.length >= 2, heard.slice(0, 3).join(' / ').slice(0, 300) || '(not heard)');
    await openOpening(meng);
  }
  let plan = false;
  for (let i = 0; i < 30 && !plan; i += 1) {
    plan = !!(await js('return !!document.querySelector("[data-testid=tabia-your-plan]") && !!document.querySelector("[data-testid^=plan-line-computed-]")'));
    if (!plan) await sleep(2000);
  }
  const planText = String(await js('return document.querySelector("[data-testid=tabia-your-plan]")?.innerText ?? ""'));
  check('B2 the tab shows the plan masters played from its last board', plan, planText.slice(0, 200) || '(none)');
  let game = false;
  for (let i = 0; i < 20 && !game; i += 1) {
    game = !!(await js('return !!document.querySelector("[data-testid^=model-game-card-computed-mg-]")'));
    if (!game) await sleep(2000);
  }
  check('B3 the tab shows a master win for the student\'s side', game, String(await js('return document.querySelector("[data-testid^=model-game-card-computed-mg-]")?.innerText ?? "(none)"')).slice(0, 200));
  const endings = Number(await js('return document.querySelectorAll("[data-testid=endgame-plans-section] [data-testid^=plan-line-computed-eg-]").length'));
  const gemsShown = Number(await js('return document.querySelectorAll("[data-testid^=punish-gem-]").length'));
  console.log(`ℹ️  B3 endings shown: ${endings}; weapon gems shown: ${gemsShown} (only where the line has them)`);

  // Off-canonical: another untaught line, and one the tree cannot build.
  const vienna = await openOpening(slug('C26', 'Vienna Game: Mengarini Variation'));
  // The Vienna is a masterclass: its Mengarini line opens that page or builds
  // its own — never a hand-off.
  check('A5 a line under a masterclass stays on a page', vienna === 'page', `${vienna} at ${await href()}`);
  // Negative control: no master game reaches the Paris Gambit, so the tree
  // builds nothing and the coach still teaches it live.
  const odd = await openOpening(slug('A00', 'Amar Opening: Paris Gambit'));
  check('A5 a line the tree cannot build still hands off to the coach', odd === 'handed-off', `${odd} at ${await href()}`);
} catch (e) {
  check('harness', false, String(e));
} finally {
  const failed = rows.filter((r) => !r.pass).length;
  const dir = path.join('audit-reports', `all-openings-page-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ rows, spoken: await spoken().catch(() => '') }, null, 2));
  console.log(`\n${rows.length - failed}/${rows.length} green — report ${dir}/report.json`);
  await get('/quit').catch(() => {});
  driver.kill();
  process.exit(failed ? 1 : 0);
}
