#!/usr/bin/env node
/**
 * audit-danya-viewer-questions-prod — OUR COACH ANSWERS DANYA'S VIEWERS
 * (David 2026-11-17: "Ask the questions Danya's viewers asked during the speed
 * runs. See if our coach can produce answers similar to his").
 *
 * The questions and their boards come from `scripts/danya-viewer-questions.mjs`
 * (the transcripts' spoken moves lined up with each game, the question's move
 * legal for the right seat). Only the hand-checked ones below are asked: each
 * was read against its board, and the ones placed on the wrong side, on a
 * garbled caption, or answered off-topic were dropped (PLAN.md). The
 * transcripts stay local (reference only); this file holds no words of his.
 *
 * For each: the coach's answer next to Danya's, the moves and squares both
 * name (a first cut; the real grade is reading them), and the door's row.
 * Muted (hand driver).
 *
 *   node scripts/danya-viewer-questions.mjs > audit-reports/.danya-viewer-questions.json
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-danya-viewer-questions-prod.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Kept: [video, ply, the question as asked here when the caption needs it]. */
const KEEP = [
  ['0ipLPOAN_m8', 13, 'White keeps playing a4 in these structures and I can never get b5 in. What am I supposed to do?'],
  ['1PI3xfMiUE4', 44], ['1zfJ7ABoh8k', 26], ['6WyNj23mrCc', 16], ['CQFSXmfxMV8', 10], ['Di-5aO2lddU', 26],
  ['INCkZzSMk98', 4], ['INCkZzSMk98', 24], ['JEMVGw2WdCE', 26], ['Jt5bST3j-Cw', 32], ['MvaAX4pTvYU', 43],
  ['PmStO-m1Eu4', 15, 'Why not a6?'], ['Qkv7D-BGAt4', 24], ['_4xbS0Crtic', 7, 'Should I play d6?'], ['_4xbS0Crtic', 13],
  ['_4xbS0Crtic', 15], ['_X7t6o3o6JM', 42], ['hBzXn8Kdaao', 7], ['kQHOIgVhyow', 15, 'Does this weaken the b6 square?'],
  ['lLkqjBOGgek', 23, 'What if White stops Bf5 with Bd3?'], ['mCB8n7v0MEA', 23], ['vbWQt7Qn_eQ', 19], ['wdHXvOBC8bw', 7, 'Should I take on d4, and with what?'],
  ['xp727Z8dXZc', 12],
];

const PORT = Number(process.env.HAND_PORT ?? 7794);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = JSON.parse(fs.readFileSync('audit-reports/.danya-viewer-questions.json', 'utf8'));
const cases = KEEP.map(([video, ply, q]) => {
  const c = all.find((x) => x.video === video && x.ply === ply);
  return c ? { ...c, question: q ?? c.question } : null;
}).filter(Boolean);
if (cases.length !== KEEP.length) console.log(`⚠ ${KEEP.length - cases.length} kept questions not found in the extract (re-run the extractor)`);

/** Moves and squares named in a text, normalised (spoken "knight c3" → "c3"). */
const named = (t) => new Set((t.toLowerCase().match(/\b[a-h]\s?[1-8]\b/g) ?? []).map((s) => s.replace(/\s/, '')));

const driver = spawn(process.execPath, ['scripts/audit-lib/hand-driver.mjs'], {
  env: { ...process.env, HAND_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('hand driver did not start in 90s')), 90_000);
  driver.stdout.on('data', (b) => { if (String(b).includes('hand-driver on')) { clearTimeout(t); resolve(); } });
  driver.on('exit', (code) => reject(new Error(`hand driver exited ${code}`)));
});
const get = async (p, body) => (await fetch(`${base}${p}`, body === undefined ? {} : { method: 'POST', body })).json();
const js = (code) => get('/js', code);
const pageLines = async () => { const t = await js('return document.body.innerText'); return typeof t === 'string' ? t.split('\n').map((l) => l.trim()).filter(Boolean) : []; };
const chatRows = async () => {
  const lines = await get('/events?n=800&grep=chat-turn&details=1');
  return (Array.isArray(lines) ? lines : []).map((l) => { const i = l.indexOf(' | {'); try { return i > 0 ? JSON.parse(l.slice(i + 3)) : null; } catch { return null; } }).filter(Boolean);
};
const usable = (id) => js(`return [...document.querySelectorAll('[data-testid=${id}]')].some((e) => e.getClientRects().length > 0 && !e.disabled)`);
const newLines = (before, now) => {
  const seen = new Map(); for (const l of before) seen.set(l, (seen.get(l) ?? 0) + 1);
  const out = []; for (const l of now) { const n = seen.get(l) ?? 0; if (n > 0) seen.set(l, n - 1); else out.push(l); }
  return out;
};
async function ask(text) {
  const before = await pageLines();
  const rowsBefore = (await chatRows()).length;
  const t0 = Date.now();
  await get('/type?id=chat-text-input', text);
  let last = ''; let stable = 0;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    const cur = newLines(before, await pageLines()).filter((l) => l !== text && !/^(Coach is thinking|Analysing position)/i.test(l)).join(' ⏎ ');
    if (cur && cur === last && (await usable('chat-text-input'))) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) break;
  }
  const rows = (await chatRows()).slice(rowsBefore);
  return { answer: last, secs: Math.round((Date.now() - t0) / 100) / 10, row: rows[rows.length - 1] ?? null };
}

const results = [];
await get('/open');
for (const c of cases) {
  await get(`/goto?path=${encodeURIComponent(`/coach/session/explain-position?fen=${encodeURIComponent(c.fen)}`)}&ms=12000`);
  for (let i = 0; i < 40 && !(await usable('chat-text-input')); i += 1) await sleep(1000);
  const r = await ask(c.question);
  const danya = c.answer.slice(0, 400);
  const shared = [...named(danya)].filter((s) => named(r.answer).has(s));
  results.push({ video: c.video, ply: c.ply, fen: c.fen, question: c.question, coach: r.answer, danya, shared, secs: r.secs, row: r.row });
  console.log(`\n══ ${c.video} ply ${c.ply} — ${c.question}\n   COACH (${r.secs}s): ${r.answer.slice(0, 700)}\n   DANYA: ${danya}\n   shared squares: ${shared.join(' ') || '—'}  row: ${r.row ? `${r.row.parsedKind ?? '—'} → ${r.row.servedIntent ?? '—'}` : 'NONE'}`);
}
const dir = path.join('audit-reports', `danya-viewer-questions-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(results, null, 2));
const answered = results.filter((r) => r.coach).length;
console.log(`\nVIEWER QUESTIONS answered ${answered}/${results.length}, sharing a square with Danya ${results.filter((r) => r.shared.length).length}/${results.length}\nreport: ${dir}/report.json`);
try { await get('/close'); } catch { /* gone */ }
driver.kill();
process.exit(answered === results.length ? 0 : 1);
