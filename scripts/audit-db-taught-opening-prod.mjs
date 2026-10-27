#!/usr/bin/env node
/**
 * audit-db-taught-opening-prod — THE GAMES DATABASE TEACHES WHERE THE OPENING
 * DB STOPS (David 2026-10-27: "Coach was unable to generate a lesson on the a3
 * Sicilian. We need to tie in the ability to look up the database and teach
 * from it" → "offer a lesson", "master is best, I want the same structure
 * 'branches' offered during the lesson").
 *
 * Drives the real app through the MUTED hand driver (its narration listener is
 * the voice instrument; the app's own audit rows are the event instrument):
 *   C1  chat, his exact words — "Tell me more about the a3 sicillian" — is
 *       answered from the databases (the Mengarini, its moves, the masters'
 *       games), not "There's no answer for that one yet", and offers the lesson.
 *   C2  "Can you Google it?" — the honest answer, not "not sure what you mean".
 *   L1  the lesson button opens Learn and the lesson starts.
 *   L2  the lesson reaches the fork and its tiles are the masters' replies,
 *       each with its game count; the app's own row says explorer-branched.
 *   L3  a tile walks in place, and the voice spoke the masters' line.
 *   T1  off-canonical asks on Learn: "teach me the c3 sicilian" → the Alapin,
 *       "teach me the e5 caro" → the Advance (never the bare opening).
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-db-taught-opening-prod.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.HAND_PORT ?? 7793);
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
const pageText = async () => String(await js('return document.body.innerText') ?? '');
const events = async (grep) => (await get(`/events?n=400&grep=${encodeURIComponent(grep)}`)) ?? [];
const spoken = async () => (await events('coach-narration-spoken')).join('\n');
const hasInput = async () => !!(await js('return [...document.querySelectorAll("[data-testid=chat-text-input]")].some((e) => e.getClientRects().length > 0 && !e.disabled)'));

/** Type a question and wait for the answer to settle; returns the page text
 *  that appeared after it. */
async function ask(text, waitMs = 60_000) {
  const before = await pageText();
  await get('/type', text);
  let last = '';
  let stable = 0;
  for (const t0 = Date.now(); Date.now() - t0 < waitMs; await sleep(1500)) {
    const now = await pageText();
    const fresh = now.length > before.length ? now.slice(before.length - 200) : now;
    if (fresh === last && (await hasInput())) stable += 1; else stable = 0;
    last = fresh;
    if (stable >= 2) break;
  }
  return last;
}

try {
  // ── C1 / C2: the chat, his exact words ──────────────────────────────────
  await get('/goto?path=%2Fcoach%2Fchat&ms=6000');
  for (let i = 0; i < 20 && !(await hasInput()); i += 1) await sleep(1000);
  const c1 = await ask('Tell me more about the a3 sicillian');
  check('C1 answered from the databases', /Mengarini/.test(c1) && /e4 c5 a3/.test(c1) && /master games/.test(c1) && !/no answer for that one/i.test(c1),
    c1.replace(/\s+/g, ' ').slice(-420));
  const offer = await js('return document.querySelectorAll("[data-testid=action-teach_opening]").length');
  check('C1 offers the lesson', Number(offer) > 0, `teach buttons: ${offer}`);
  const c2 = await ask('Can you Google it?');
  check('C2 web search answered honestly', /no web search/i.test(c2) && !/not sure what you mean/i.test(c2), c2.replace(/\s+/g, ' ').slice(-200));

  // ── L1–L3: the lesson the chat offered ──────────────────────────────────
  await get('/click?id=action-teach_opening&ms=4000');
  const url = String(await js('return location.href'));
  check('L1 the button opens Learn', /\/coach\/teach\?teach=.*from=chat/.test(url), url);
  let fork = 0;
  for (let i = 0; i < 90 && !fork; i += 1) {
    await sleep(2000);
    // Skip narration toward the fork, the way a person taps "next".
    await js('const b = document.querySelector("[data-testid=walkthrough-skip]"); if (b) b.click(); return true');
    fork = Number(await js('return document.querySelectorAll("[data-testid^=walkthrough-fork-option-]").length'));
  }
  const tiles = String(await js('return [...document.querySelectorAll("[data-testid^=walkthrough-fork-option-]")].map((b) => b.innerText.trim()).join(" | ")'));
  check('L2 the fork tiles are the masters\' replies', fork >= 2 && /…g6/.test(tiles), `tiles: ${tiles || '(none)'}`);
  const built = (await events('explorer-branched')).join('\n');
  check('L2 the app built them from the database', /explorer-branched "Sicilian Defense: Mengarini Variation"/.test(built), built.slice(0, 300) || '(no row)');
  const deepDives = Number(await js('return document.querySelectorAll("[data-testid^=walkthrough-fork-deepdive-]").length'));
  check('L2 no dive restarts the same lesson', deepDives === 0, `deep-dive tiles: ${deepDives}`);
  await get('/click?id=walkthrough-fork-option-0&ms=3000');
  for (let i = 0; i < 40; i += 1) {
    await sleep(2000);
    await js('const b = document.querySelector("[data-testid=walkthrough-skip]"); if (b) b.click(); return true');
    if (await js('return !!document.querySelector("[data-testid=walkthrough-backtrack]")')) break;
  }
  const said = await spoken();
  check('L3 the voice taught the masters\' line', /most common answer, in [\d,]+ of the [\d,]+ master games/.test(said), said.split('\n').filter((l) => /master games/.test(l)).slice(0, 3).join(' / ') || '(not heard)');

  // ── T1: off-canonical asks on Learn ──────────────────────────────────────
  for (const [q, want] of [['teach me the c3 sicilian', /Alapin/], ['teach me the e5 caro', /Advance/]]) {
    await get('/open');
    const out = await ask(q, 120_000);
    const name = String(await js('return document.body.innerText.match(/(Sicilian Defense|Caro-Kann Defense)[^\\n.]*/)?.[0] ?? ""'));
    check(`T1 "${q}"`, want.test(out) || want.test(name), (name || out.replace(/\s+/g, ' ').slice(-160)));
  }
} catch (e) {
  check('harness', false, String(e));
} finally {
  const failed = rows.filter((r) => !r.pass).length;
  const dir = path.join('audit-reports', `db-taught-opening-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ rows, spoken: await spoken().catch(() => '') }, null, 2));
  console.log(`\n${rows.length - failed}/${rows.length} green — report ${dir}/report.json`);
  await get('/quit').catch(() => {});
  driver.kill();
  process.exit(failed ? 1 : 0);
}
