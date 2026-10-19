#!/usr/bin/env node
// THE RECORD GRID — grade every mistake the app filed against the engine, the
// way David audits (2026-10-19: "learn from this audit … get as good as me").
//
// Lessons this tool encodes, each one a mistake made by hand first:
//   1. CHECK THE INSTRUMENT BEFORE THE CONTENT. A 300-row audit log was graded
//      for an hour before noticing the Learn game was not in it: a background
//      rebuild wrote 290 rows in 24 s and pushed the game out. Coverage prints
//      first, and a log with no spoken lines says so before anything else.
//   2. NEVER TRUST THE LOG'S NUMBERS. Filed costs of 299 / 167 / 126 were
//      16 / 0 / 0 at depth 16; a filed 0 was 112. Every row is re-read by
//      Stockfish before a verdict — a chess claim is checked on the board.
//   3. A SLIP IN A DECIDED GAME IS NOT A WEAKNESS. 22 of 44 rows were filed
//      with one side 4+ pawns up.
//   4. LOOK FOR WHAT IS MISSING, NOT ONLY WHAT IS THERE (no tactic alert heard,
//      no seat logged, no spoken lines) — listed under GAPS.
//
// Input: the "App audit log" markdown David pastes (Settings → audit log), or a
// "Send my data" drop (scripts/read-data-drop.mjs → JSON with stores.*).
//   node scripts/audit-record-grid.mjs <log.md | drop.json> [--depth 16] [--out report.md]
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const DEPTH = Number(opt('depth', 16));
const OUT = opt('out', null);
/** Grade only the newest N filed mistakes (a real record holds thousands). */
const SAMPLE = Number(opt('sample', 0));
if (!file) { console.error('usage: audit-record-grid.mjs <log.md|drop.json> [--depth 16] [--out report.md]'); process.exit(1); }

/** Below this real cost (centipawns) a filed mistake is not a mistake. */
const NOT_A_MISTAKE = 30;
/** One side this far ahead (centipawns) before the move: the game is decided. */
const DECIDED = 400;
/** Filed vs real cost apart by more than this: the filed number is wrong. */
const COST_DRIFT = 60;

// ── 1. READ ────────────────────────────────────────────────────────────────
const text = readFileSync(file, 'utf8');
const mistakes = [];
const posed = [];
const kinds = new Map();
let spokenLines = 0;
let source = '';

if (text.trimStart().startsWith('{')) {
  source = 'data drop';
  const stores = JSON.parse(text).stores ?? {};
  for (const r of stores.misconceptionTags ?? []) {
    if (!r.fen || !r.playedSan || !r.bestSan) continue;
    mistakes.push({ id: r.id.slice(0, 8), at: r.createdAt ?? 0, fen: r.fen, tag: r.tag, cp: r.cpLoss ?? null, phase: r.gamePhase ?? null, played: r.playedSan, best: r.bestSan, game: r.sourceGameId ?? null });
  }
  mistakes.sort((a, b) => a.at - b.at);
  for (const r of stores.capabilityEvidence ?? []) posed.push({ fen: r.fen, tags: [r.tag], outcome: r.outcome, imp: r.posedImportance ?? null });
  for (const r of stores.meta ?? []) if (/app-audit-log/.test(r.key)) source += ' (+ audit log)';
} else {
  source = 'audit log';
  for (const block of text.split(/\n### Finding /).slice(1)) {
    const kind = (block.match(/\[[a-z]+\/([a-z0-9-]+)\]/) ?? [])[1] ?? '?';
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    if (/spoken|narration-spoken|voice-speak/.test(kind)) spokenLines += 1;
    const fen = (block.match(/- FEN: `([^`]+)`/) ?? [])[1];
    const json = (() => { const m = block.match(/```\n(\{[\s\S]*?\})\n```/); try { return m ? JSON.parse(m[1]) : null; } catch { return null; } })();
    const id = block.split(' ')[0];
    if (kind === 'misconception-captured' && fen && json?.playedSan && json?.bestSan) {
      const head = block.match(/tag=(\S+) bucket=\S+ cpLoss=(\d+) phase=([a-z]+)/);
      mistakes.push({ id, fen, tag: json.tag, cp: head ? Number(head[2]) : null, phase: head?.[3] ?? null, played: json.playedSan, best: json.bestSan, game: json.sourceGameId ?? null });
    } else if (fen && json?.tags && json?.outcome) {
      posed.push({ id, fen, tags: json.tags, outcome: json.outcome, imp: json.posedImportance ?? null });
    }
  }
}

// ── 2. CHECK THE INSTRUMENT FIRST ──────────────────────────────────────────
const out = [];
const say = (s = '') => { out.push(s); console.log(s); };
say(`# Record grid — ${file}`);
say(`Source: ${source}. Engine depth ${DEPTH}.`);
say('');
say('## 1. Coverage (read this before any verdict)');
if (kinds.size) say(`Kinds: ${[...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
say(`Filed mistakes with a board: ${mistakes.length}. "Tested" rows with a board: ${posed.length}. Spoken lines: ${spokenLines}.`);
const gaps = [];
if (spokenLines === 0) gaps.push('No spoken lines — nothing here can judge what the coach SAID. Get a data drop right after the game.');
if (kinds.size && (kinds.get('coach-surface-migrated') ?? 0) > 0.6 * [...kinds.values()].reduce((a, b) => a + b, 0)) gaps.push('More than 60% of rows are one background kind — a rebuild likely pushed the live session out of the window.');
if (!text.includes('studentSide') && !text.includes('playerColor')) gaps.push('No seat (student colour) logged — a colour mix-up cannot be traced.');
if (!/learn-turn-decision|coach-decision/.test(text)) gaps.push('No turn decisions — cannot see which lines were held, and why.');
if (posed.length && posed.every((p) => p.imp == null)) gaps.push('"Tested" rows carry no importance weight — cannot tell a real test from noise.');
for (const g of gaps) say(`- ⚠️ ${g}`);
say('');

// ── 3. ENGINE ──────────────────────────────────────────────────────────────
const sf = spawn(process.env.STOCKFISH ?? '/usr/games/stockfish');
let buf = '';
sf.stdout.on('data', (d) => { buf += d; });
const send = (s) => sf.stdin.write(`${s}\n`);
const wait = (re) => new Promise((res) => { const t = setInterval(() => { if (re.test(buf)) { clearInterval(t); const o = buf; buf = ''; res(o); } }, 15); });
send('uci'); await wait(/uciok/);
/** Eval in centipawns for the side TO MOVE (mate = ±10000). */
async function evalFen(fen) {
  buf = ''; send(`position fen ${fen}`); send(`go depth ${DEPTH}`);
  const o = await wait(/bestmove/);
  const ls = o.split('\n').filter((l) => l.includes(' score '));
  const m = ls.at(-1)?.match(/score (cp|mate) (-?\d+)/);
  if (!m) return 0;
  return m[1] === 'mate' ? Math.sign(Number(m[2])) * 10000 : Number(m[2]);
}
const pieceMaterial = (c) => c.board().flat().reduce((n, p) => n + (p && p.type !== 'p' && p.type !== 'k' ? { n: 3, b: 3, r: 5, q: 9 }[p.type] : 0), 0);

// ── 4. GRADE EACH FILED MISTAKE ───────────────────────────────────────────
say('## 2. Filed mistakes');
say('| # | played → best | filed | real | before | phase (filed / board) | tag | verdict |');
say('|---|---|---|---|---|---|---|---|');
const tally = { ok: 0, bad: 0, decided: 0, notMistake: 0, costWrong: 0, phase: 0, illegal: 0 };
for (const m of SAMPLE > 0 ? mistakes.slice(-SAMPLE) : mistakes) {
  let c; try { c = new Chess(m.fen); } catch { tally.illegal += 1; continue; }
  const before = await evalFen(m.fen);
  const a = new Chess(m.fen); const b = new Chess(m.fen);
  let okA = true; let okB = true;
  try { a.move(m.best); } catch { okA = false; }
  try { b.move(m.played); } catch { okB = false; }
  if (!okA || !okB) { tally.illegal += 1; say(`| ${m.id} | ${m.played} → ${m.best} | ${m.cp} | — | — | — | ${m.tag} | ❌ illegal move in row |`); continue; }
  // Both evals are for the OPPONENT (side to move after the student's move).
  const real = Math.max(0, (await evalFen(b.fen())) - (await evalFen(a.fen())));
  const queens = c.board().flat().filter((p) => p?.type === 'q').length;
  const mat = pieceMaterial(c);
  const boardPhase = queens === 0 && mat <= 26 ? 'endgame' : queens === 0 ? 'queenless middlegame' : (Number(m.fen.split(' ')[5]) <= 10 ? 'opening' : 'middlegame');
  const why = [];
  if (Math.abs(before) >= DECIDED) { why.push('decided game'); tally.decided += 1; }
  if (real < NOT_A_MISTAKE) { why.push('not a mistake'); tally.notMistake += 1; }
  if (m.cp != null && Math.abs(m.cp - real) > COST_DRIFT) { why.push(`cost ${m.cp}≠${real}`); tally.costWrong += 1; }
  if (m.phase === 'endgame' && boardPhase !== 'endgame') { why.push(`"endgame" with ${mat} pts of pieces`); tally.phase += 1; }
  if (m.played.startsWith('O-O') && m.tag !== 'weakened-king-safety' && m.tag !== 'king-stuck-center') why.push('castling not filed as king safety');
  if (/^K/.test(m.played) && boardPhase === 'endgame' && m.tag === 'hung-material') why.push('endgame king move filed as hung material');
  const verdict = why.length ? `❌ ${why.join('; ')}` : '✅';
  if (why.length) tally.bad += 1; else tally.ok += 1;
  say(`| ${m.id} | ${m.played} → ${m.best} | ${m.cp ?? '?'} | ${real} | ${before > 0 ? '+' : ''}${before} | ${m.phase ?? '?'} / ${boardPhase} | ${m.tag} | ${verdict} |`);
}
say('');
say(`**${tally.ok} ✅, ${tally.bad} ❌** of ${mistakes.length}: ${tally.decided} in decided games, ${tally.notMistake} not mistakes, ${tally.costWrong} wrong costs, ${tally.phase} wrong phase, ${tally.illegal} unreadable.`);
say('');

// ── 5. "TESTED" ROWS — where the noise lives ──────────────────────────────
say('## 3. "Tested" rows');
const byTag = new Map();
let openingStart = 0;
for (const p of posed) {
  for (const t of p.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
  const full = Number(p.fen.split(' ')[5]);
  if (full <= 2) openingStart += 1;
}
const total = posed.length || 1;
say('| skill | rows | share | verdict |');
say('|---|---|---|---|');
for (const [t, n] of [...byTag].sort((a, b) => b[1] - a[1])) {
  const share = n / total;
  say(`| ${t} | ${n} | ${(share * 100).toFixed(0)}% | ${share > 0.25 ? '❌ counted on over a quarter of moves — noise' : '✅'} |`);
}
say(`Rows on move 1–2: ${openingStart} ${openingStart ? '❌ (the start position tests nothing)' : '✅'}`);
send('quit');

if (OUT) { writeFileSync(OUT, `${out.join('\n')}\n`); console.log(`→ ${OUT}`); }
