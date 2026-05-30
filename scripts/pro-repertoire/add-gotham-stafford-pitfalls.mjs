#!/usr/bin/env node
// Pitfalls for the GothamChess Stafford Gambit Refutation. Student = WHITE.
// The famous Stafford traps White must AVOID, plus the calm refutation moves.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-stafford-refute';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Stafford-Gambit',
  'https://en.wikipedia.org/wiki/Petrov%27s_Defence',
];

const PITFALLS = [
  {
    // After 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5. — the refutation. d3 vs greedy Nc3.
    setup: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6',
    wrongMove: 'Nc3',
    correctMove: 'd3',
    explanation:
      "Here is the heart of the Stafford. The safe refutation is d3! — opening the bishop and preparing Be2 to trade off Black's attackers, keeping the extra pawn with no risk. The natural-looking Nc3 walks into the famous trap …Bg4! and …Nd4 with a vicious attack on f3 and the king. Against the Stafford, play d3 and develop calmly — never grab more or develop carelessly into the gambit's tricks.",
    shortNarration: 'd3 — the calm Stafford refutation',
  },
  {
    // After 5.d3 Bc5 6.Bg5?? — the classic trap. Be2 (safe) vs Bg5 (loses).
    setup: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5',
    wrongMove: 'h3',
    correctMove: 'Be2',
    explanation:
      "After 5…Bc5, the careful move is Be2! — preparing to meet …Ng4 by simply trading the knight. The natural h3 (stopping …Ng4) actually walks into …Nxe4! 7.dxe4 Bxf2+ winning the queen with a discovered attack, a classic Stafford trap. Don't weaken the kingside with h3 — develop with Be2 and let Black's attack hit a brick wall.",
    shortNarration: 'Be2 — develop safely, avoid the trap',
  },
  {
    // After 4...dxc6 5.e5 Ne4 6. — the e5 line. d4 (build) vs the greedy.
    setup: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4',
    wrongMove: 'd3',
    correctMove: 'd4',
    explanation:
      "In the ambitious e5 line, after …Ne4 the strong move is d4! — building the big pawn centre and keeping the extra pawn with a space advantage. The timid d3 kicks the knight but gives up the chance to clamp the centre, letting Black free his position. When you've committed to e5, follow with d4 to build a dominating centre against the Stafford.",
    shortNarration: 'd4 — build the big centre',
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
let failed = 0;
const entries = [];

for (const p of PITFALLS) {
  const c = new Chess();
  let ok = true;
  for (const san of p.setup.trim().split(/\s+/)) {
    try { c.move(san); } catch { console.error(`SETUP ILLEGAL: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  const fen = c.fen();
  for (const mv of [p.wrongMove, p.correctMove]) {
    const probe = new Chess(fen);
    try { probe.move(mv); } catch { console.error(`MOVE ILLEGAL: ${mv} @ ${fen}`); failed++; ok = false; }
  }
  if (!ok) continue;
  const words = p.shortNarration.replace(/[—–-]/g, ' ').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  if (words > 8) { console.error(`CUE too long (${words}w): ${p.shortNarration}`); failed++; continue; }
  entries.push({ fen, wrongMove: p.wrongMove, correctMove: p.correctMove, explanation: p.explanation, shortNarration: p.shortNarration, sources: SRC });
}

if (failed > 0) { console.error(`\n${failed} pitfall(s) failed — NOT writing.`); process.exit(1); }
data[KEY] = entries;
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`wrote ${entries.length} pitfalls under "${KEY}".`);
