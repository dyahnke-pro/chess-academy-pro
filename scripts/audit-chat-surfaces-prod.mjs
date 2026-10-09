#!/usr/bin/env node
/**
 * audit-chat-surfaces-prod — ONE COACH ON EVERY SCREEN (WO-CHAT-01, David
 * 2026-10-09: "Make sure this works on all coach surfaces. Remember, 1 UNIFIED
 * COACH!").
 *
 * Asks the SAME questions on every screen that has a coach question box,
 * through the real app (muted hand driver), and prints the answers side by
 * side. The answer is read two ways: the new text on the page (what the
 * student sees, wherever the screen puts it) and the door's own `chat-turn`
 * row (what the coach read the question as, and how it answered). A screen
 * whose question writes NO row never reached the door — that is the finding
 * this audit exists to make.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-chat-surfaces-prod.mjs [--only=learn,play]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STOCK } from './audit-lib/chat-replay-cases.mjs';

const PORT = Number(process.env.HAND_PORT ?? 7791);
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The same questions everywhere. `lang` checks the answer's language. */
export const QUESTIONS = [
  { id: 'best', ask: "what's the best move here?" },
  { id: 'hanging', ask: 'is anything of mine hanging?' },
  { id: 'attack', ask: 'can they attack my knight?' },
  { id: 'concept', ask: 'what does a pin mean?' },
  { id: 'rule', ask: 'how do I castle?', must: [/king/i, /rook/i] },
  { id: 'plan', ask: "what's the plan here?" },
  { id: 'record', ask: 'what are my weaknesses?' },
  { id: 'spanish', ask: '¿cuál es la mejor jugada aquí?', lang: /\b(el|la|los|las|es|que|de|tu|una?)\b/i },
  { id: 'request', ask: 'teach me the caro kann' },
];

/** Each screen with a question box, and how a person gets to it. */
const SURFACES = [
  { id: 'learn', steps: [['open']] },
  { id: 'chat', steps: [['goto', '/coach/chat', 6000]] },
  { id: 'play', steps: [['goto', '/coach/play', 8000], ['click', 'play-chat-button']] },
  { id: 'analyse', steps: [['goto', '/coach/analyse', 9000]] },
  { id: 'explain', steps: [['goto', '/coach/session/explain-position?fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p3%2F2B1P3%2F5N2%2FPPPP1PPP%2FRNBQK2R%20b%20KQkq%20-%203%203', 12000]] },
  { id: 'masterclass', steps: [['goto', '/openings/italian-game', 9000], ['click', 'masterclass-coach-open']] },
  // Review needs a game: one short real game, seeded unanalysed, then opened.
  { id: 'review', steps: [['goto', '/coach/review', 6000], ['seed-game'], ['goto', '/coach/review/audit-surfaces-1', 6000], ['wait', 'start-walk-btn', 300000], ['click', 'start-walk-btn'], ['click', 'walk-ask-toggle-btn']] },
].filter((s) => !only.length || only.includes(s.id));

/** One short real Italian game, unanalysed, for the review screen. */
const SEED_GAME = `
  const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const t = db.transaction('games', 'readwrite'); t.objectStore('games').put({ id: 'audit-surfaces-1', studentSide: 'white', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 1-0', white: 'Student', black: 'Opponent', result: '1-0', date: '2026.10.09', event: 'Audit', eco: 'C54', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false }); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
  return true;
`;

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
const pageLines = async () => {
  const t = await get('/js', 'return document.body.innerText');
  return typeof t === 'string' ? t.split('\n').map((l) => l.trim()).filter(Boolean) : [];
};
const chatRows = async () => {
  const lines = await get('/events?n=600&grep=chat-turn&details=1');
  return (Array.isArray(lines) ? lines : []).map((l) => { const i = l.indexOf(' | {'); try { return i > 0 ? JSON.parse(l.slice(i + 3)) : null; } catch { return null; } }).filter(Boolean);
};
const hasInput = async () => !!(await get('/js', 'return [...document.querySelectorAll("[data-testid=chat-text-input]")].some((e) => e.getClientRects().length > 0 && !e.disabled)'));

/** Lines on the page now that were not there before (counted, not compared). */
const newLines = (before, now) => {
  const seen = new Map();
  for (const l of before) seen.set(l, (seen.get(l) ?? 0) + 1);
  const out = [];
  for (const l of now) { const n = seen.get(l) ?? 0; if (n > 0) seen.set(l, n - 1); else out.push(l); }
  return out;
};

async function ask(text) {
  const before = await pageLines();
  const rowsBefore = (await chatRows()).length;
  const urlBefore = await get('/js', 'return location.href');
  const t0 = Date.now();
  await get('/type', text);
  let last = ''; let stable = 0;
  for (let i = 0; i < 75; i += 1) {
    await sleep(1000);
    const url = await get('/js', 'return location.href');
    const fresh = newLines(before, await pageLines()).filter((l) => l !== text && !/^(Coach is thinking|Analysing position)/i.test(l));
    const cur = fresh.join(' ⏎ ');
    if (url !== urlBefore && !(await hasInput())) { last = cur || `(moved to ${url})`; break; }
    if (cur && cur === last && (await hasInput())) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) break;
  }
  const rows = (await chatRows()).slice(rowsBefore);
  return { answer: last, secs: Math.round((Date.now() - t0) / 100) / 10, row: rows[rows.length - 1] ?? null, url: await get('/js', 'return location.href') };
}

async function reach(surface) {
  for (const [op, a, ms] of surface.steps) {
    if (op === 'open') await get('/open');
    else if (op === 'goto') await get(`/goto?path=${encodeURIComponent(a)}&ms=${ms ?? 4000}`);
    else if (op === 'click') await get(`/click?id=${a}&ms=2500`);
    else if (op === 'seed-game') await get('/js', SEED_GAME);
    else if (op === 'wait') {
      for (const t = Date.now(); Date.now() - t < ms; await sleep(2000)) {
        if (await get('/js', `const b = document.querySelector('[data-testid=${a}]'); return !!b && !b.disabled`)) break;
      }
    }
  }
  for (let i = 0; i < 20 && !(await hasInput()); i += 1) await sleep(1000);
  return hasInput();
}

const results = [];
for (const s of SURFACES) {
  console.log(`\n══ ${s.id} ══`);
  if (!(await reach(s))) {
    console.log(`❌ ${s.id}: no question box reached`);
    results.push({ surface: s.id, reached: false, answers: [] });
    continue;
  }
  const answers = [];
  for (const q of QUESTIONS) {
    // A question that moved the student (a request) leaves no box behind.
    if (!(await hasInput()) && !(await reach(s))) { answers.push({ id: q.id, fails: ['box gone'] }); continue; }
    const r = await ask(q.ask);
    const fails = [];
    if (!r.answer) fails.push('no answer');
    if (STOCK.test(r.answer)) fails.push('stock line');
    if (/\[BOARD:|\[\[/.test(r.answer)) fails.push('leaked markup');
    if (!r.row) fails.push('never reached the door');
    for (const re of q.must ?? []) if (!re.test(r.answer)) fails.push(`missing ${re}`);
    if (q.lang && !q.lang.test(r.answer)) fails.push('not in the asker\'s language');
    answers.push({ id: q.id, ask: q.ask, ...r, fails });
    console.log(`${fails.length ? '❌' : '✅'} ${s.id}/${q.id} (${r.secs}s) ${q.ask}\n   → ${r.answer.slice(0, 420)}${fails.length ? `\n   ✗ ${fails.join('; ')}` : ''}${r.row ? `\n   row: read=${r.row.parsedKind ?? '—'} (${r.row.parseSource ?? '—'}) served=${r.row.servedIntent ?? '—'} outcome=${r.row.outcome ?? '—'}` : ''}`);
  }
  results.push({ surface: s.id, reached: true, answers });
}

const all = results.flatMap((r) => r.answers.map((a) => ({ ...a, surface: r.surface })));
const pass = all.filter((a) => !a.fails?.length).length;
console.log(`\nSURFACES ${pass}/${all.length} answers clean; unreached: ${results.filter((r) => !r.reached).map((r) => r.surface).join(' ') || 'none'}`);
const dir = path.join('audit-reports', `chat-surfaces-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: process.env.AUDIT_SMOKE_URL, pass, total: all.length, results }, null, 1));
console.log(`report: ${dir}/report.json`);
await get('/quit').catch(() => {});
driver.kill();
process.exit(0);
