#!/usr/bin/env node
// Pitfalls for the GothamChess Anti-Sicilian Rossolimo. Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-anti-sicilian';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation',
  'https://en.wikipedia.org/wiki/Rossolimo_Variation',
];

const PITFALLS = [
  {
    // After 1.e4 c5 2.Nf3 Nc6 — the Rossolimo choice. Bb5 vs the Open Sicilian.
    setup: 'e4 c5 Nf3 Nc6',
    wrongMove: 'd4',
    correctMove: 'Bb5',
    explanation:
      "The whole point of the Anti-Sicilian is to sidestep the deeply-theoretical Open Sicilian. 3.d4 enters the main lines where Black is well-prepared. The Rossolimo 3.Bb5! pins toward c6 and steers the game into structural channels Black knows less well — White trades Bxc6 to double the pawns and plays a positional game. Pick the Anti-Sicilian: that's the repertoire's whole idea.",
    shortNarration: 'Bb5 — the Rossolimo, sidestep theory',
  },
  {
    // After 3.Bb5 g6 — the trade timing. Bxc6 vs retreating.
    setup: 'e4 c5 Nf3 Nc6 Bb5 g6',
    wrongMove: 'Bc4',
    correctMove: 'Bxc6',
    explanation:
      "Against the …g6 fianchetto, the principled move is Bxc6! — trading immediately to saddle Black with doubled c-pawns before he can play …a6 and …b5 to harass the bishop. Retreating with Bc4 lets Black off the hook and the bishop becomes a target. Cash in the structural concession with Bxc6, then play c3 and d4 against the doubled pawns.",
    shortNarration: 'Bxc6 — double the pawns now',
  },
  {
    // After 3.Bb5 e6 4.Bxc6 bxc6 5.d3 — the central plan. e5 vs passive.
    setup: 'e4 c5 Nf3 Nc6 Bb5 e6 Bxc6 bxc6 d3 d5',
    wrongMove: 'exd5',
    correctMove: 'e5',
    explanation:
      "After Bxc6 and d3, when Black plays …d5, the ambitious e5! grabs a central space wedge and cramps Black, the Carlsen-style accelerated plan. The routine exd5 just opens the position for Black's bishop pair and relieves the cramped position. Ram e5 to keep Black passive behind the doubled pawns and build a kingside initiative.",
    shortNarration: 'e5 — the space wedge, keep Black cramped',
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
