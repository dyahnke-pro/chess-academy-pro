#!/usr/bin/env node
// Pitfalls for the GothamChess Italian (pro-gothamchess-italian). Student=WHITE.
// Canonical Italian teaching mistakes (wrong move order, the Fried Liver, the
// Evans tempo). wrongMove = slip, correctMove = principled reply.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/common-mistakes.json';
const KEY = 'pro-gothamchess-italian';
const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Italian-Game',
  'https://en.wikipedia.org/wiki/Italian_Game',
];

const PITFALLS = [
  {
    // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 — the Giuoco. Then ...Nf6 5.d4 is the point.
    setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6',
    wrongMove: 'd3',
    correctMove: 'd4',
    explanation:
      "After 4.c3 preparing the centre, the whole point is to follow with d4! — striking in the centre while Black's pieces are committed. The timid d3 wastes the c3-tempo and lets Black equalise comfortably with …d6 and …a6. When you've played c3, commit to d4: that's the Giuoco Piano's central break and the reason c3 was played.",
    shortNarration: 'd4 — the central break c3 prepared',
  },
  {
    // After 4.Ng5 d5 5.exd5 Nxd5?? — White to move, the Fried Liver moment.
    setup: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5',
    wrongMove: 'Nf3',
    correctMove: 'Nxf7',
    explanation:
      "Black's greedy 5…Nxd5?? walks into the famous Fried Liver Attack: Nxf7! sacrifices the knight to drag the king out into the open after …Kxf7 Qf3+, where White's attack is overwhelming in practice. The timid Nf3 retreat throws the whole point away and lets Black consolidate the extra piece. When Black recaptures on d5, know the Fried Liver cold — Nxf7 is the punishment.",
    shortNarration: 'Nxf7 — the Fried Liver Attack',
  },
  {
    // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 — the Evans. ...Bxb4 5.c3 is the gambit point.
    setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4',
    wrongMove: 'Nxe5',
    correctMove: 'c3',
    explanation:
      "In the Evans Gambit after …Bxb4, the point is c3! — gaining a tempo on the bishop and preparing d4 to build the big centre. The greedy Nxe5 wins a pawn back immediately but throws away the entire gambit idea: after …Nxe5 Black is fine. The Evans is about development and the centre, not regaining the pawn. Play c3 and d4, and let the initiative do the work.",
    shortNarration: 'c3 — gain tempo, prepare d4',
  },
  {
    // After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.O-O Nf6 — White to move, the open-vs-slow choice.
    setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6',
    wrongMove: 'Re1',
    correctMove: 'd4',
    explanation:
      "After castling, White faces the key choice. The open d4! is his most testing try — striking the centre while Black's pieces are committed. After …Bxd4 Nxd4 Nxd4, White plays Bg5 pinning the f6-knight and f4 storming the kingside, exactly the attacking plan from his games. The passive Re1 just shuffles a rook and lets Black equalise with …d6 and …a6. Commit to d4 and the Bg5/f4 attack.",
    shortNarration: 'd4 — open centre, then Bg5/f4',
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
