#!/usr/bin/env node
/**
 * audit-chat-replay-prod — THE CHAT REPLAY (WO-CHAT-01 P0, 2026-10-09).
 *
 * Asks every case in `audit-lib/chat-replay-cases.mjs` through the REAL app
 * (muted hand driver, prod by default), reads the coach's answer off the
 * page, and grades it against the case: answered (no stock line, no leaked
 * markup), what it must / must not say, the right language, the right page.
 * Prints EVERY answer — the row count is the harness, the prose is the
 * product. Run after every WO-CHAT-01 phase; the ❌ list is the work list.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-chat-replay-prod.mjs [--only R5,B11]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CASES, STOCK } from './audit-lib/chat-replay-cases.mjs';

const PORT = Number(process.env.HAND_PORT ?? 7790);
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;
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
/** Every chat message on the page, as text (order-agnostic). */
const messages = async () => (await get('/js', 'return [...document.querySelectorAll("[data-testid*=message]")].map(e => e.innerText.trim())')) ?? [];
const coachLines = (msgs) => msgs.filter((m) => /^C\s/.test(m)).map((m) => m.replace(/^C\s+/, '').trim());
const pageUrl = async () => (await get('/js', 'return location.href')) ?? '';
const chatRows = async () => {
  const lines = await get('/events?n=400&grep=chat-turn&details=1');
  return (Array.isArray(lines) ? lines : []).map((l) => { const i = l.indexOf(' | {'); try { return i > 0 ? JSON.parse(l.slice(i + 3)) : null; } catch { return null; } }).filter(Boolean);
};

/** Ask, then wait for a NEW coach line that stops changing. */
async function ask(text) {
  const before = new Set(coachLines(await messages()));
  const rowsBefore = (await chatRows()).length;
  const t0 = Date.now();
  await get('/type', text);
  let last = null; let stable = 0; let answer = null;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    const fresh = coachLines(await messages()).filter((m) => !before.has(m));
    const cur = fresh.join('\n⏎ ');
    if (fresh.length && cur === last) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) { answer = cur; break; }
  }
  const rows = (await chatRows()).slice(rowsBefore);
  return { answer: answer ?? last ?? '', secs: Math.round((Date.now() - t0) / 100) / 10, row: rows[rows.length - 1] ?? null, url: await pageUrl() };
}

async function setup(kind) {
  if (kind === 'chat') { await get('/goto?path=/coach/chat&ms=6000'); return null; }
  await get('/open');
  if (kind === 'fresh') return null;
  await ask("let's play a game, I'll be white");
  let s = null;
  for (const m of ['e4', 'Nf3', 'Bc4']) {
    await get(`/move?san=${m}`);
    for (let i = 0; i < 30; i += 1) { await sleep(1000); s = await get('/state'); if (s.turn === 'w') break; }
  }
  const moves = (s?.moves ?? '').split(' ');
  return moves[moves.length - 1] ?? null;
}

const results = [];
let current = null; let last = null;
for (const c of cases) {
  if (c.setup !== current || c.setup === 'fresh') { last = await setup(c.setup); current = c.setup; }
  const q = c.ask.replace('{LAST}', last ?? 'that');
  const r = await ask(q);
  const fails = [];
  if (!r.answer) fails.push('no answer');
  if (STOCK.test(r.answer)) fails.push('stock line');
  if (/\[BOARD:|\[\[/.test(r.answer)) fails.push('leaked markup');
  for (const re of c.must ?? []) if (!re.test(r.answer)) fails.push(`missing ${re}`);
  for (const re of c.mustNot ?? []) if (re.test(r.answer)) fails.push(`said ${re}`);
  if (c.urlNot && c.urlNot.test(r.url)) fails.push(`went to ${r.url}`);
  const ok = fails.length === 0;
  results.push({ id: c.id, ask: q, from: c.from, ok, fails, secs: r.secs, answer: r.answer, url: r.url, row: r.row });
  console.log(`${ok ? '✅' : '❌'} ${c.id} (${r.secs}s) ${q}\n   → ${r.answer.replace(/\n/g, ' ').slice(0, 400)}${fails.length ? `\n   ✗ ${fails.join('; ')}` : ''}${r.row ? `\n   row: read=${r.row.parsedKind} (${r.row.parseSource}) served=${r.row.servedIntent} outcome=${r.row.outcome ?? '—'}` : ''}`);
}

const pass = results.filter((r) => r.ok).length;
console.log(`\nREPLAY ${pass}/${results.length} — ❌ ${results.filter((r) => !r.ok).map((r) => r.id).join(' ') || 'none'}`);
const dir = path.join('audit-reports', `chat-replay-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: process.env.AUDIT_SMOKE_URL, pass, total: results.length, results }, null, 1));
console.log(`report: ${dir}/report.json`);
await get('/quit').catch(() => {});
driver.kill();
process.exit(0);
