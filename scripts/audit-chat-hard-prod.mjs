#!/usr/bin/env node
/**
 * audit-chat-hard-prod — THE COACH UNDER A 2000 PLAYER'S QUESTIONS
 * (WO-CHAT-01, David 2026-10-09: "Really put it to the test. Next level
 * assessment of threats. Ask like a 2,000 elo player would. Longer
 * calculations. Mating sequences. Make sure tactics page can answer as well").
 *
 * Six real ~1900 Lichess puzzles (mates in 3 and 4 for both colours, a bishop
 * sacrifice, a quiet deflection, a pawn ending), each with the ENGINE'S truth
 * computed beforehand by `audit-lib/hard-positions.mjs` — so an answer is
 * CHECKED against the board, not only read: the mate count, the best move,
 * the refutation of a tempting wrong move, "show me" playing the line.
 * Then the tactics screens: the setup trainer and the puzzle trainer, after
 * the solution is shown, through their own question box.
 *
 * Muted (hand driver). Reads the page text and the door's `chat-turn` row.
 *
 *   node scripts/audit-lib/hard-positions.mjs > audit-reports/.hard-positions.json
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-chat-hard-prod.mjs [--only=positions,setup,puzzles]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { STOCK } from './audit-lib/chat-replay-cases.mjs';
import { Chess } from 'chess.js';

/** The mates the side NOT to move could play if it were their move — the
 *  null-move read, so a threat or king-safety answer can be held to it. */
function mateThreats(fen) {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
  try { const c = new Chess(parts.join(' ')); if (c.inCheck()) return []; return c.moves().filter((m) => m.endsWith('#')); } catch { return []; }
}

const PORT = Number(process.env.HAND_PORT ?? 7792);
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const want = (k) => !only.length || only.includes(k);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const POSITIONS = JSON.parse(fs.readFileSync('audit-reports/.hard-positions.json', 'utf8'));
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanRe = (san) => new RegExp(`(?:^|[^A-Za-z0-9])${esc(san.replace(/[+#]$/, ''))}(?![A-Za-z0-9])`);

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
const walking = () => js('return !!document.querySelector("[data-testid*=walk-board], [data-testid*=walk-line]") ');

/** Ask into a box; the answer is the reply testid when the box has one, else the new page text. */
async function ask(text, box) {
  const before = await pageLines();
  const rowsBefore = (await chatRows()).length;
  const t0 = Date.now();
  await get(`/type?id=${box.input}`, text);
  let last = ''; let stable = 0;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    let cur;
    if (box.reply) cur = String(await js(`return document.querySelector('[data-testid=${box.reply}]')?.innerText ?? ''`) ?? '');
    else cur = newLines(before, await pageLines()).filter((l) => l !== text && !/^(Coach is thinking|Analysing position)/i.test(l)).join(' ⏎ ');
    if (cur && cur === last && (await usable(box.input))) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) break;
  }
  const rows = (await chatRows()).slice(rowsBefore);
  return { answer: last, secs: Math.round((Date.now() - t0) / 100) / 10, row: rows[rows.length - 1] ?? null };
}

/** The questions for one position, each with the check its truth allows. */
function questionsFor(p) {
  const me = p.side;
  const qs = [];
  const mateN = p.best.mate && p.best.mate > 0 ? p.best.mate : null;
  qs.push({ id: 'mate', ask: 'Is there a forced mate here? If so, in how many moves?',
    check: (a) => mateN
      ? (new RegExp(`mate in (?:${mateN}|${NUM[mateN]})\\b|(?:${mateN}|${NUM[mateN]})[- ]move mate`, 'i').test(a) ? null : `engine: mate in ${mateN} (${p.best.line.join(' ')})`)
      : (/\b(?:forced )?mate in \d|is a forced mate|there is a mate/i.test(a) && !/no (?:forced )?mate|not a (?:forced )?mate|isn't a (?:forced )?mate/i.test(a) ? 'claims a mate the engine does not see' : null) });
  // THE ANSWER TO THE QUESTION ASKED must be in the reply (2026-10-10: this
  // audit passed a best-move answer with its mate count eaten, and a
  // best-defence question answered with the alternatives list).
  const threats = mateThreats(p.fen);
  const namesThreat = (a) => !threats.length || threats.some((t) => sanRe(t).test(a)) ? null : `misses their mate threat ${threats.join(' / ')}`;
  qs.push({ id: 'best', ask: 'What is the best move? Calculate the main line for me.',
    check: (a) => !sanRe(p.best.san).test(a) ? `engine best ${p.best.san} not named (line ${p.best.line.join(' ')})`
      : mateN && !new RegExp(`mate in ${mateN} moves`).test(a) ? `mate in ${mateN} not counted` : null });
  qs.push({ id: 'threat', ask: `What did their last move ${p.lastMove} threaten, two moves deep?`,
    check: (a, r) => r?.servedIntent === 'alternatives' ? 'answered with the alternatives list' : namesThreat(a) });
  if (p.wrong) {
    qs.push({ id: 'wrong', ask: `What if I play ${p.wrong.san} instead?`,
      check: (a) => (sanRe(p.wrong.refutation[0]).test(a) || /mate|loses|drops|bad|blunder|worse/i.test(a)) ? null : `engine refutes with ${p.wrong.refutation.join(' ')}` });
  }
  qs.push({ id: 'show', ask: 'show me', check: (a, r) => (/Playing the line out/.test(a) || r?.servedIntent === 'request:show-line') ? null : 'did not play the line' });
  qs.push({ id: 'why', ask: `Why does ${p.best.san} work — what's their best defence?`,
    check: (a) => !p.best.line[1] || sanRe(p.best.line[1]).test(a) ? null : `engine defence ${p.best.line[1]} not named` });
  qs.push({ id: 'king', ask: `Is my king safe here? What are they threatening against it?`, check: (a) => namesThreat(a) });
  return qs;
}

const fails = (a, r, q) => {
  const f = [];
  if (!a) f.push('no answer');
  if (STOCK.test(a)) f.push('stock line');
  if (/\[BOARD:|\[\[/.test(a)) f.push('leaked markup');
  if (/(?:^|[^A-Za-z'])(?:I|I'm|I'll|I've|I'd)(?![A-Za-z'])/.test(a.replace(new RegExp(esc(q.ask), 'g'), ''))) f.push('coach said "I"');
  const truth = q.check?.(a, r);
  if (truth) f.push(truth);
  return f;
};

const results = [];
const log = (sect, q, r, f) => console.log(`${f.length ? '❌' : '✅'} ${sect}/${q.id} (${r.secs}s) ${q.ask}\n   → ${r.answer.slice(0, 600)}${f.length ? `\n   ✗ ${f.join('; ')}` : ''}${r.row ? `\n   row: read=${r.row.parsedKind ?? '—'} (${r.row.parseSource ?? '—'}) served=${r.row.servedIntent ?? '—'} outcome=${r.row.outcome ?? '—'}` : '\n   row: NONE'}`);

await get('/open');
if (want('positions')) {
  for (const p of POSITIONS) {
    console.log(`\n══ ${p.id} (${p.rating}, ${p.side} to move, ${p.themes}) — engine: ${p.best.mate ? `mate in ${p.best.mate}` : `${p.best.cp}cp`} ${p.best.line.join(' ')} ══`);
    await get(`/goto?path=${encodeURIComponent(`/coach/session/explain-position?fen=${encodeURIComponent(p.fen)}`)}&ms=12000`);
    for (let i = 0; i < 40 && !(await usable('chat-text-input')); i += 1) await sleep(1000);
    for (const q of questionsFor(p)) {
      const r = await ask(q.ask, { input: 'chat-text-input' });
      if (q.id === 'show') r.walked = await walking();
      const f = fails(r.answer, r.row, q);
      results.push({ section: p.id, id: q.id, ask: q.ask, ...r, fails: f });
      log(p.id, q, r, f);
    }
  }
}

const TACTIC_QS = [
  { id: 'why', ask: 'Why does this work? Walk me through the calculation.' },
  { id: 'defence', ask: "What if they don't take — what's their best defence?", check: (a, r) => r?.servedIntent === 'alternatives' || !/best defence is/i.test(a) ? 'did not name their best defence' : null },
  { id: 'mate', ask: 'Is there a forced mate anywhere in this line?' },
  { id: 'faster', ask: 'Is there a faster or cleaner win?', check: (a, r) => r?.servedIntent === 'alternatives' || !/fastest|cleanest|only move that keeps|no clear win|nothing is faster/i.test(a) ? 'did not compare the wins' : null },
  { id: 'show', ask: 'show me', check: (a, r) => (/Playing the line out/.test(a) || r?.servedIntent === 'request:show-line') ? null : 'did not play the line' },
];
async function tacticsScreen(name, route, start, reveal, box) {
  console.log(`\n══ ${name} ══`);
  await get(`/goto?path=${encodeURIComponent(route)}&ms=6000`);
  await get(`/click?id=${start}&ms=4000`);
  for (let i = 0; i < 60 && !(await js(`return !!document.querySelector('[data-testid=${reveal}]')`)); i += 1) await sleep(1000);
  const fen = await js('return document.querySelector("[data-fen]")?.getAttribute("data-fen") ?? null');
  await get(`/click?id=${reveal}&ms=2000`);
  for (let i = 0; i < 40 && !(await usable(box.input)); i += 1) await sleep(1000);
  if (!(await usable(box.input))) {
    console.log(`❌ ${name}: no question box after the solution`);
    results.push({ section: name, id: 'reach', fails: ['no question box after the solution'] });
    return;
  }
  console.log(`   board: ${fen ?? '(no data-fen)'}`);
  for (const q of TACTIC_QS) {
    if (!(await usable(box.input))) { results.push({ section: name, id: q.id, fails: ['box gone (the trainer moved on)'] }); console.log(`❌ ${name}/${q.id}: box gone`); continue; }
    const r = await ask(q.ask, box);
    if (q.id === 'show') r.walked = await walking();
    const f = fails(r.answer, r.row, q);
    results.push({ section: name, id: q.id, ask: q.ask, ...r, fails: f });
    log(name, q, r, f);
  }
}
if (want('setup')) await tacticsScreen('setup', '/tactics/setup', 'difficulty-3', 'setup-show-solution', { input: 'setup-chat-input', reply: 'setup-chat-reply' });
if (want('puzzles')) await tacticsScreen('puzzles', '/tactics/adaptive', 'difficulty-hard', 'show-solution-button', { input: 'puzzle-ask-input', reply: 'puzzle-ask-reply' });

const pass = results.filter((r) => !r.fails?.length).length;
console.log(`\nHARD ${pass}/${results.length} clean`);
const dir = path.join('audit-reports', `chat-hard-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: process.env.AUDIT_SMOKE_URL, pass, total: results.length, positions: POSITIONS, results }, null, 1));
console.log(`report: ${dir}/report.json`);
await get('/quit').catch(() => {});
driver.kill();
process.exit(0);
