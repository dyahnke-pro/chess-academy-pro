#!/usr/bin/env node
// Pitfalls for the GothamChess Closed Sicilian (Nc3). Student = WHITE.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-closed-sicilian';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Sicilian-Defense-Closed-Variation',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Closed',
];

const PITFALLS = [
  {
    // After 1.e4 c5 2.Nc3 d6 3.d4 cxd4 4.Qxd4 — the early queen. Recapture choice.
    setup: 'e4 c5 Nc3 d6 d4 cxd4',
    wrongMove: 'Nf3',
    correctMove: 'Qxd4',
    explanation:
      "His signature anti-Sicilian is the early Qxd4! — recapturing with the queen to reach an Open-Sicilian-like position a tempo up, then castling queenside for a kingside attack. Recapturing with Nf3 transposes into normal Open Sicilian theory where Black is well-prepared. The Qxd4 approach sidesteps theory: the queen sits actively, Nc3 is already developed, and White heads for the O-O-O attack.",
    shortNarration: 'Qxd4 — the early queen, sidestep theory',
  },
  {
    // After 2.Nc3 d6 3.d4 cxd4 4.Qxd4 Nc6 5. — develop the queen with tempo.
    setup: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6',
    wrongMove: 'Qd1',
    correctMove: 'Qd2',
    explanation:
      "After …Nc6 hits the queen, the move is Qd2! — keeping the queen active and connecting it to the kingside attack and the long diagonal. Retreating all the way to d1 wastes the tempo gained and undoes the whole point of the early Qxd4. The queen belongs on d2, supporting b3-Bb2, f4, and the O-O-O opposite-castling storm. Keep the queen active.",
    shortNarration: 'Qd2 — keep the queen active',
  },
  {
    // After the O-O-O setup vs ...g6 — commit to the attack. f4/storm vs passive.
    setup: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 Bg7 Bb2 Nf6',
    wrongMove: 'Nf3',
    correctMove: 'O-O-O',
    explanation:
      "With the b3-Bb2 setup complete, the thematic move is O-O-O! — castling queenside to commit to the kingside pawn storm with f3 and g4-h4. Developing the knight to f3 instead blocks the f-pawn that White needs for the f3/g4 storm and delays the whole attacking plan (the knight belongs on e2, not f3). The Closed/Nc3 Sicilian with Qd2 is built for opposite-side castling: O-O-O first, then storm Black's king while yours stays safe behind the Bb2.",
    shortNarration: 'O-O-O — castle opposite, then storm',
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
