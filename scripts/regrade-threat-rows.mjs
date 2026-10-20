#!/usr/bin/env node
// Engine re-grade of the incoming-motif rows (threatAnswerEvidence): is a
// "broken" row a real loss, or does the engine line hold? Reads the replay's
// row dumps (THREAT_ANSWER_MEASURE shards).
//   node scripts/regrade-threat-rows.mjs [--tag missed-their-pin] [--outcome broken] [--depth 16] [--limit N]
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const opt = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TAG = opt('tag', 'missed-their-pin');
const OUTCOME = opt('outcome', 'broken');
const DEPTH = Number(opt('depth', 16));
const LIMIT = Number(opt('limit', 0));
/** A loss under a pawn is not "the motif landed". */
const REAL_CP = 100;
/** Both sides of the move already past this: the game was decided. */
const DECIDED_CP = 500;

const dir = 'audit-reports/.fixtures';
const rows = readdirSync(dir).filter((f) => f.startsWith('threat-answer-rows-'))
  .flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).rows)
  .filter((r) => r.tag === TAG && r.outcome === OUTCOME);
const sample = LIMIT > 0 ? rows.filter((_, i) => i % Math.ceil(rows.length / LIMIT) === 0).slice(0, LIMIT) : rows;

const sf = spawn(process.env.STOCKFISH ?? '/usr/games/stockfish');
let buf = '';
sf.stdout.on('data', (d) => { buf += d; });
const send = (s) => sf.stdin.write(`${s}\n`);
const wait = (re) => new Promise((res) => { const t = setInterval(() => { if (re.test(buf)) { clearInterval(t); const o = buf; buf = ''; res(o); } }, 10); });
send('uci'); await wait(/uciok/);
/** Centipawns for the side TO MOVE (mate = ±10000). */
async function evalFen(fen) {
  buf = ''; send(`position fen ${fen}`); send(`go depth ${DEPTH}`);
  const o = await wait(/bestmove/);
  const m = o.split('\n').filter((l) => l.includes(' score ')).at(-1)?.match(/score (cp|mate) (-?\d+)/);
  return !m ? 0 : m[1] === 'mate' ? Math.sign(Number(m[2])) * 10000 : Number(m[2]);
}

const out = [];
const tally = { real: 0, holds: 0, decided: 0 };
for (const [i, r] of sample.entries()) {
  const best = await evalFen(r.fen);                    // student to move
  const c = new Chess(r.fen); c.move(r.playedSan);
  const played = -(await evalFen(c.fen()));             // student POV after the reply
  const loss = Math.max(0, best - played);
  const decided = Math.abs(best) >= DECIDED_CP && Math.abs(played) >= DECIDED_CP && Math.sign(best) === Math.sign(played);
  const verdict = decided ? 'decided' : loss >= REAL_CP ? 'real' : 'holds';
  tally[verdict] += 1;
  out.push({ game: r.sourceGameId, fen: r.fen, played: r.playedSan, best, playedEval: played, loss, verdict });
  if (i % 10 === 0) console.log(`[regrade ${TAG} ${OUTCOME}] ${i}/${sample.length} real ${tally.real} holds ${tally.holds} decided ${tally.decided}`);
}
sf.kill();
const file = `audit-reports/threat-regrade-${TAG}-${OUTCOME}.json`;
writeFileSync(file, JSON.stringify({ tag: TAG, outcome: OUTCOME, depth: DEPTH, filed: sample.length, tally, rows: out }, null, 1));
console.log(`${TAG} ${OUTCOME}: filed ${sample.length} → real ${tally.real}, holds ${tally.holds}, decided ${tally.decided} (depth ${DEPTH}) → ${file}`);
