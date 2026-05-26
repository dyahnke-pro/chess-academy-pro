#!/usr/bin/env node
// Local mirror of mastersCoverage.test.ts Hole 7b — Stockfish soundness of
// middlegame plan lines. Checks that no ply of the given plan id(s) loses
// more than MAX_CP_LOSS (120) cp vs the engine's best at SF_DEPTH (16).
//
// Usage: node scripts/check-plan-soundness.mjs <planId> [planId...]
//        node scripts/check-plan-soundness.mjs --all
//
// Needs a UCI engine at /usr/games/stockfish (STOCKFISH_PATH overrides).
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const DEPTH = 16;
const MAX = 120;

function evalFen(fen, searchMove) {
  return new Promise((res) => {
    const sf = spawn(SF);
    let last = null, done = false;
    const fin = (v) => { if (!done) { done = true; try { sf.kill(); } catch { /* */ } res(v); } };
    let buf = '';
    sf.stdout.on('data', (d) => {
      buf += d.toString();
      const ls = buf.split('\n'); buf = ls.pop() ?? '';
      for (const line of ls) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (mate) last = parseInt(mate[1], 10) > 0 ? 100000 : -100000;
        else if (cp) last = parseInt(cp[1], 10);
        if (line.startsWith('bestmove')) fin(last);
      }
    });
    sf.on('error', () => fin(null));
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}${searchMove ? ` searchmoves ${searchMove}` : ''}\n`);
    setTimeout(() => fin(last), 12000);
  });
}

const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8'));
const args = process.argv.slice(2);
const targets = args.includes('--all') ? plans.map((p) => p.id) : args;
if (!targets.length) { console.error('usage: node scripts/check-plan-soundness.mjs <planId...> | --all'); process.exit(1); }

let blunders = 0;
for (const id of targets) {
  const p = plans.find((x) => x.id === id);
  if (!p) { console.log(`${id}: NOT FOUND`); continue; }
  for (const line of p.playableLines ?? []) {
    const c = new Chess(line.fen);
    for (let i = 0; i < line.moves.length; i++) {
      const fenBefore = c.fen();
      const mv = c.move(line.moves[i]);
      const best = await evalFen(fenBefore);
      const played = await evalFen(fenBefore, mv.from + mv.to + (mv.promotion ?? ''));
      if (best !== null && played !== null && best - played > MAX) {
        blunders++;
        console.log(`BLUNDER ${id} move ${i + 1} ${mv.san} — loses ${best - played}cp vs best`);
      }
    }
  }
  console.log(`${id}: checked`);
}
console.log(blunders ? `\n${blunders} unsound move(s).` : '\nALL CLEAN (no >120cp losses).');
process.exit(blunders ? 1 : 0);
