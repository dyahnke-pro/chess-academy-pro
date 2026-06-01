#!/usr/bin/env node
// Engine-verify a candidate warning line: play the SANs, eval the final
// position from the STUDENT's perspective. A real warning leaves the student
// clearly worse (studentEval <= ~-0.5). Sign convention (recipe LAYER 4):
//   Stockfish `score cp` is side-to-move relative → studentEval = -rawEval
//   when it's the OPPONENT to move after the student's slip.
// Usage: _verify-warning.mjs <studentColor w|b> "<space-separated SANs>"
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';

const SF = '/usr/games/stockfish';
const studentColor = process.argv[2];
const sans = process.argv[3].trim().split(/\s+/);

const chess = new Chess();
for (const s of sans) {
  const m = chess.move(s);
  if (!m) { console.error('ILLEGAL at', s); process.exit(1); }
}
const fen = chess.fen();
const sideToMove = chess.turn(); // 'w'|'b'

function evalFen(fen, depth = 18) {
  return new Promise((resolve) => {
    const sf = spawn(SF);
    let best = null;
    sf.stdout.on('data', (d) => {
      for (const line of d.toString().split('\n')) {
        const mm = line.match(/score (cp|mate) (-?\d+)/);
        if (mm) best = mm[1] === 'mate' ? (mm[2] > 0 ? 10000 : -10000) : parseInt(mm[2], 10);
        if (line.startsWith('bestmove')) { sf.kill(); resolve(best); }
      }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
  });
}

const raw = await evalFen(fen);
// raw is from side-to-move's POV. Convert to student POV.
const studentChar = studentColor === 'w' ? 'w' : 'b';
const studentEval = sideToMove === studentChar ? raw : -raw;
console.log(`FEN: ${fen}`);
console.log(`sideToMove: ${sideToMove}  rawCp(STM): ${raw}  studentEval: ${studentEval} (${(studentEval / 100).toFixed(2)})`);
console.log(studentEval <= -50 ? 'VERDICT: real warning (student worse)' : 'VERDICT: NOT clearly worse — skip or re-pick');
